import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import React from 'react';
import ProjectFullReport from '../components/ProjectFullReport';
import {collectDocumentCss} from '../components/DocumentReport';
import {sequenceForProject,SHARED_LEAD_IN_IDS} from './defineSequence';
import {documentIdFor} from './documentModel';
import {lifecycleForProject} from '../foundation/lifecycle';
import {DIAGRAM_TEMPLATES} from '../config/diagramTemplates';
import {CHARTER_REPORT_TEMPLATE,PROJECT_CHARTER_EMPTY} from '../config/charterTemplate';

// The Charter is a bespoke component (pages/ProjectCharter.js) with its own schema and route — it
// never goes through DocumentWorkspace/createDocument, so its data lives at project.charter, not
// project.documents[documentIdFor('charter')] like every generic template. sequenceForProject
// still places the 'charter' template first for both suites (it's in SHARED_LEAD_IN_IDS), but that
// stub template carries no sections, so it must never be looked up in `documents` like the rest of
// the sequence — this builds its report entry from project.charter directly, through
// CHARTER_REPORT_TEMPLATE (a DocumentReport-compatible template defined in
// config/charterTemplate.js, the one place the charter's field/section shape is authored, shared
// with pages/ProjectCharter.js's own editor) so it renders through the same DocumentReport
// component as every other document. Returns null when the project has never had a charter saved,
// so an unopened charter never appears as an empty placeholder.
function charterReportEntry(project){
  if(!project?.charter)return null;
  const lifecycle=lifecycleForProject(project);
  return {
    template:CHARTER_REPORT_TEMPLATE,
    record:{values:{...PROJECT_CHARTER_EMPTY,...project.charter}},
    phase:lifecycle.stages[0]?.label||CHARTER_REPORT_TEMPLATE.name,
    diagram:null,
  };
}

// Every document this project actually has a saved record for, in suite lifecycle stage order,
// Charter always first. sequenceForProject already resolves the OE-vs-PM stage ordering without
// branching here (Define → Measure → Analyze → Improve → Control, or Initiation → Planning →
// Execution → Monitoring & Controlling → Closing); this filters that sequence down to templates
// with a project.documents entry (skipping 'charter' itself, resolved separately above since it
// doesn't live in project.documents), so a document a user never opened never appears as an empty
// placeholder in the combined report — and resolves each one's display phase and diagram the same
// way DocumentWorkspace does for the per-document Print button, so a document never renders
// differently between its own Print button and Print All / Save to File. Pure function of
// (project): no DOM, no component, no hidden state, so Print All, Save to File, tests, and any
// future automation/AI layer all read the exact same list from the exact same call.
export function projectReportEntries(project){
  const documents=project?.documents||{};
  const lifecycle=lifecycleForProject(project);
  const templateEntries=sequenceForProject(project).filter(template=>template.id!=='charter').map(template=>{
    const record=documents[documentIdFor(template.id)];
    if(!record)return null;
    const phase=SHARED_LEAD_IN_IDS.includes(template.id)?(lifecycle.stages[0]?.label||template.phase):template.phase;
    const diagram=DIAGRAM_TEMPLATES[template.id]?DIAGRAM_TEMPLATES[template.id].render(record,project):null;
    return {template,record,phase,diagram};
  }).filter(Boolean);
  const charterEntry=charterReportEntry(project);
  return charterEntry?[charterEntry,...templateEntries]:templateEntries;
}

// Shared prop bundle for ProjectFullReport, built once per call so Print All and Save to File
// (and any future consumer) assemble the identical report for the identical project.
function projectReportProps(project){
  const lifecycle=lifecycleForProject(project);
  return {
    project,
    lifecycle,
    stageLabel:project?.currentPhase||lifecycle.stages[0]?.label||'—',
    entries:projectReportEntries(project),
    generatedAt:new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),
  };
}

// Renders the full project report (cover page + every saved document, in stage order) into an
// isolated iframe document and opens the browser print dialog — the project-level equivalent of
// DocumentWorkspace's per-document print(), built the same way: createRoot + flushSync on the
// iframe's own document, and the report's CSS injected from the same raw-loader-imported style
// text as the per-document fix (via collectDocumentCss(), re-exported unchanged from
// DocumentReport.js) rather than read back off document.styleSheets at call time. Exported as a
// plain function of (project, options) — not a closure over component state — so it is directly
// callable by the Print All button, by tests, or by any future automation/AI layer without going
// through the UI. `onStatus(message)` is an optional progress callback a caller can use to surface
// status text; this function never depends on it being wired to anything.
export function printProjectReport(project,{onStatus}={}){
  const props=projectReportProps(project);
  if(!props.entries.length){onStatus?.('No documents have been created for this project yet.');return null;}
  onStatus?.('Assembling full project report…');
  const iframe=document.createElement('iframe');
  iframe.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(iframe);
  const frameDoc=iframe.contentDocument;
  frameDoc.open();frameDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');frameDoc.close();
  frameDoc.title=`${project.name} — Full Report`;
  const styleEl=frameDoc.createElement('style');
  styleEl.textContent=`${collectDocumentCss()}\nbody{margin:0;background:#fff}@page{margin:12mm}`;
  frameDoc.head.appendChild(styleEl);
  const printRoot=createRoot(frameDoc.body);
  const cleanup=()=>{try{printRoot.unmount()}catch{}if(iframe.parentNode)iframe.parentNode.removeChild(iframe)};
  // flushSync forces this root's initial commit to happen synchronously, so the DOM is guaranteed
  // populated the instant this call returns — same reasoning as the per-document print fix.
  flushSync(()=>printRoot.render(React.createElement(ProjectFullReport,props)));
  if(!frameDoc.body.textContent.trim()){cleanup();onStatus?.('Full report could not be generated. Please try again.');return null;}
  // The content is committed; this remaining wait is only for the browser's own layout/paint pass
  // on that already-present content before invoking print, not for React.
  window.setTimeout(()=>{
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    window.setTimeout(()=>{cleanup();onStatus?.('');},1000);
  },300);
  return props.entries.length;
}

// Renders the full project report into an off-screen container, rasterizes it with html2canvas,
// and paginates the result into a jsPDF document — the project-level equivalent of
// DocumentWorkspace's per-document exportPdf(), same pattern (createRoot + flushSync, then
// height-sliced canvas pages). Exported as a plain async function of (project, options), directly
// callable outside the UI for the same reason as printProjectReport above.
export async function exportProjectReportToFile(project,{onStatus}={}){
  const props=projectReportProps(project);
  if(!props.entries.length){onStatus?.('No documents have been created for this project yet.');return null;}
  onStatus?.('Preparing full project report PDF...');
  const container=document.createElement('div');
  container.style.cssText='position:fixed;left:-10000px;top:0;width:900px;background:#fff';
  document.body.appendChild(container);
  const exportRoot=createRoot(container);
  try{
    flushSync(()=>exportRoot.render(React.createElement(ProjectFullReport,props)));
    if(!container.textContent.trim())throw new Error('The full project report could not be generated for export.');
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const canvas=await html2canvas(container,{scale:1.5,backgroundColor:'#ffffff'});
    const pdf=new jsPDF('p','mm','a4'),width=190,pageHeight=277,height=canvas.height*width/canvas.width;
    let offset=0;while(offset<height){pdf.addImage(canvas.toDataURL('image/jpeg',.9),'JPEG',10,10-offset,width,height);offset+=pageHeight;if(offset<height)pdf.addPage();}
    const date=new Date().toISOString().slice(0,10);
    const filename=`${project.name}-full-report-${date}.pdf`.replace(/[^a-z0-9.-]+/gi,'-').toLowerCase();
    pdf.save(filename);
    onStatus?.('Full project report exported');
    return filename;
  }finally{exportRoot.unmount();document.body.removeChild(container);}
}

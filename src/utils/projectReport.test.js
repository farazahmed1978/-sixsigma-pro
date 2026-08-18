import {act} from 'react-dom/test-utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {projectReportEntries,printProjectReport,exportProjectReportToFile} from './projectReport';
import {renderProjectFullReportDocument} from '../components/ProjectFullReport';
import {DEFINE_TEMPLATES} from '../config/defineTemplates';
import {PMP_TEMPLATES} from '../config/pmpTemplates';
import {createDocument,documentIdFor} from './documentModel';
import {lifecycleForProject} from '../foundation/lifecycle';

jest.mock('jspdf',()=>jest.fn().mockImplementation(()=>({addImage:jest.fn(),addPage:jest.fn(),save:jest.fn()})));
jest.mock('html2canvas',()=>jest.fn().mockResolvedValue({height:100,width:100,toDataURL:()=>'data:image/jpeg;base64,'}));

const sipocTemplate=DEFINE_TEMPLATES.find(t=>t.id==='sipoc');
const wbsTemplate=PMP_TEMPLATES.find(t=>t.id==='wbs');
const finalReportTemplate=PMP_TEMPLATES.find(t=>t.id==='final-project-report');

// A Charter record shaped like what pages/ProjectCharter.js actually persists to
// project.charter — its own schema, saved outside project.documents entirely (the bug this file's
// tests guard against: Charter is a bespoke component, not a generic DocumentWorkspace template).
const sampleCharter={schemaVersion:2,projectSummary:'Reduce cycle time across the intake process.',businessCase:'Customers wait too long for a decision.',targetDate:'2026-12-01'};

const seededProject=(suiteId,templates,overrides={})=>{
  const documents={};
  templates.forEach(template=>{documents[documentIdFor(template.id)]=createDocument(template,'seed-project');});
  return {id:'seed-project',name:'PM Project',suiteId,methodology:suiteId==='project-management'?'pmp':'lean-six-sigma',documents,activityLog:[],sharedFields:{},artifacts:[],evidenceLibrary:[],...overrides};
};

test('projectReportEntries only includes documents with a saved record, in suite lifecycle stage order, Charter always first',()=>{
  // Seeded out of stage order (Closing before Planning) to prove the function sorts by stage
  // rather than just passing seeded order through.
  const project=seededProject('project-management',[finalReportTemplate,wbsTemplate],{charter:sampleCharter});
  const entries=projectReportEntries(project);
  expect(entries.map(entry=>entry.template.id)).toEqual(['charter','wbs','final-project-report']);
});

test('projectReportEntries excludes templates the project has never opened (no saved record)',()=>{
  const project=seededProject('project-management',[wbsTemplate]);
  const entries=projectReportEntries(project);
  expect(entries.map(entry=>entry.template.id)).toEqual(['wbs']);
});

// Regression test: Charter is a bespoke component (pages/ProjectCharter.js) with its own schema
// and route — it saves to project.charter, never to project.documents like the generic
// DocumentWorkspace templates. Before this fix, projectReportEntries only ever looked in
// project.documents, so a project with a fully filled-out Charter but no generic documents opened
// would produce an empty report even though real content existed.
test('projectReportEntries picks up the Charter from project.charter (not project.documents) even when no generic document has been opened, for both suites',()=>{
  const pmProject=seededProject('project-management',[],{charter:sampleCharter});
  const pmEntries=projectReportEntries(pmProject);
  expect(pmEntries.map(entry=>entry.template.id)).toEqual(['charter']);
  expect(pmEntries[0].record.values.projectSummary).toBe(sampleCharter.projectSummary);

  const oeProject=seededProject('operational-excellence',[],{charter:sampleCharter});
  const oeEntries=projectReportEntries(oeProject);
  expect(oeEntries.map(entry=>entry.template.id)).toEqual(['charter']);
  expect(oeEntries[0].record.values.businessCase).toBe(sampleCharter.businessCase);
});

test('projectReportEntries never renders an empty Charter placeholder for a project that has never saved one',()=>{
  const project=seededProject('project-management',[wbsTemplate]);
  const entries=projectReportEntries(project);
  expect(entries.some(entry=>entry.template.id==='charter')).toBe(false);
});

test("projectReportEntries resolves Charter to the PM suite's first stage label, matching the per-document Print button",()=>{
  const project=seededProject('project-management',[],{charter:sampleCharter});
  const entries=projectReportEntries(project);
  expect(entries[0].phase).toBe(lifecycleForProject(project).stages[0].label);
});

test('an OE project orders documents Charter → Define → Measure → ... using the same function, no suite branching required by the caller',()=>{
  const project=seededProject('operational-excellence',[sipocTemplate],{charter:sampleCharter});
  const entries=projectReportEntries(project);
  expect(entries.map(entry=>entry.template.id)).toEqual(['charter','sipoc']);
});

test('renderProjectFullReportDocument produces a single HTML document with a cover page, the Charter\'s real content, and every entry in order',()=>{
  const project=seededProject('project-management',[wbsTemplate],{charter:sampleCharter});
  const entries=projectReportEntries(project);
  const html=renderProjectFullReportDocument({project,lifecycle:lifecycleForProject(project),stageLabel:'Planning',entries,generatedAt:'January 1, 2026'});
  expect(html).toMatch(/^<!doctype html>/i);
  expect(html).toContain('dr-cover');
  expect(html).toContain(project.name);
  // The Charter's actual field content must appear, not just a header — confirms the report is
  // rendering project.charter's real values through CHARTER_REPORT_TEMPLATE, not an empty
  // placeholder that merely carries the "Project Charter" title.
  expect(html).toContain(sampleCharter.businessCase);
  const charterIndex=html.indexOf('Project Charter');
  const wbsIndex=html.indexOf('>WBS<');
  expect(charterIndex).toBeGreaterThan(-1);
  expect(wbsIndex).toBeGreaterThan(-1);
  expect(charterIndex).toBeLessThan(wbsIndex);
});

test('printProjectReport on a project with no saved documents reports status and never touches the DOM',()=>{
  const project=seededProject('operational-excellence',[]);
  const statuses=[];
  const result=printProjectReport(project,{onStatus:message=>statuses.push(message)});
  expect(result).toBeNull();
  expect(statuses).toEqual(['No documents have been created for this project yet.']);
  expect(document.querySelectorAll('iframe').length).toBe(0);
});

test('printProjectReport mounts the assembled cover + Charter + documents into an isolated iframe',async()=>{
  const project=seededProject('project-management',[wbsTemplate],{charter:sampleCharter});
  const statuses=[];
  await act(async()=>{printProjectReport(project,{onStatus:message=>statuses.push(message)});});
  const iframe=document.querySelector('iframe');
  expect(iframe).toBeTruthy();
  expect(iframe.contentDocument.body.textContent.trim().length).toBeGreaterThan(0);
  expect(iframe.contentDocument.body.innerHTML).toContain('dr-cover');
  expect(iframe.contentDocument.body.innerHTML).toContain(sampleCharter.businessCase);
  expect(statuses[0]).toBe('Assembling full project report…');
  iframe.remove();
});

test('exportProjectReportToFile on a project with no saved documents reports status and never calls html2canvas',async()=>{
  const project=seededProject('operational-excellence',[]);
  const statuses=[];
  const result=await exportProjectReportToFile(project,{onStatus:message=>statuses.push(message)});
  expect(result).toBeNull();
  expect(html2canvas).not.toHaveBeenCalled();
  expect(statuses).toEqual(['No documents have been created for this project yet.']);
});

test('exportProjectReportToFile rasterizes the assembled cover + Charter + documents and saves a project-named PDF',async()=>{
  const project=seededProject('project-management',[wbsTemplate],{charter:sampleCharter});
  const statuses=[];
  let capturedInnerHtml=null;
  // react-scripts test sets resetMocks:true by default, which wipes any implementation set at
  // jest.mock() factory time before every test (not just the first) — so both mocks must be
  // re-established here rather than relied on from the top-level jest.mock() calls.
  jsPDF.mockImplementation(()=>({addImage:jest.fn(),addPage:jest.fn(),save:jest.fn()}));
  html2canvas.mockImplementation(async target=>{capturedInnerHtml=target.innerHTML;return{height:100,width:100,toDataURL:()=>'data:image/jpeg;base64,'};});
  const filename=await exportProjectReportToFile(project,{onStatus:message=>statuses.push(message)});
  expect(filename).toMatch(/^pm-project-full-report-\d{4}-\d{2}-\d{2}\.pdf$/);
  expect(capturedInnerHtml).toContain('dr-cover');
  expect(capturedInnerHtml).toContain(sampleCharter.businessCase);
  expect(jsPDF).toHaveBeenCalled();
  expect(statuses).toContain('Full project report exported');
});

import React from 'react';
import fs from 'fs';
import path from 'path';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import DocumentWorkspace from './DocumentWorkspace';
import {renderReportDocument} from './DocumentReport';
import WBSTreeDiagram from './WBSTreeDiagram';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {DEFINE_TEMPLATES} from '../config/defineTemplates';
import {PMP_TEMPLATES} from '../config/pmpTemplates';

jest.mock('jspdf',()=>jest.fn().mockImplementation(()=>({addImage:jest.fn(),addPage:jest.fn(),save:jest.fn()})));
jest.mock('html2canvas',()=>jest.fn().mockResolvedValue({height:100,width:100,toDataURL:()=>'data:image/jpeg;base64,'}));
jest.mock('../context/ReportContext',()=>({useReport:()=>({addReportItem:jest.fn(),items:[]})}));
jest.mock('../context/WorksheetContext',()=>({useWorksheet:()=>({datasets:[]})}));
jest.mock('../context/AnalysisContext',()=>({useAnalysis:()=>({analysisResults:[]})}));

const render=async(template,project)=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  const updateProject=jest.fn(async()=>({}));
  await act(async()=>root.render(<MemoryRouter><DocumentWorkspace template={template} project={project} updateProject={updateProject}/></MemoryRouter>));
  return{host,root,updateProject};
};

const pmProject={id:'pm-1',name:'PM Project',suiteId:'project-management',methodology:'pmp',documents:{},activityLog:[],sharedFields:{},artifacts:[],evidenceLibrary:[]};
const oeProject={id:'oe-1',name:'OE Project',suiteId:'operational-excellence',documents:{},activityLog:[],sharedFields:{},artifacts:[],evidenceLibrary:[]};

test('Stakeholder Register on a PM project shows the PM stage (Initiation), not the static Define phase',async()=>{
  const template=DEFINE_TEMPLATES.find(t=>t.id==='stakeholder-register');
  const{host,root}=await render(template,pmProject);
  expect(host.querySelector('.badge').textContent).toBe('Initiation workspace');
  expect(host.querySelector('.badge').className).toContain('badge-initiation');
  expect(host.querySelector('.workspace-shell-breadcrumb').textContent).toContain('Initiation');
  expect(host.querySelector('.workspace-shell-breadcrumb').textContent).not.toContain('Define');
  await act(async()=>root.unmount());host.remove();
});

test('Business Case on a PM project shows the PM stage, and on an OE project keeps showing Define (no regression)',async()=>{
  const template=DEFINE_TEMPLATES.find(t=>t.id==='business-case');
  const pm=await render(template,pmProject);
  expect(pm.host.querySelector('.badge').textContent).toBe('Initiation workspace');
  await act(async()=>pm.root.unmount());pm.host.remove();
  const oe=await render(template,oeProject);
  expect(oe.host.querySelector('.badge').textContent).toBe('Define workspace');
  await act(async()=>oe.root.unmount());oe.host.remove();
});

test('WBS (a genuine PMP_TEMPLATES document, not a shared lead-in) keeps its own correct Planning phase unchanged',async()=>{
  const template=PMP_TEMPLATES.find(t=>t.id==='wbs');
  const{host,root}=await render(template,pmProject);
  expect(host.querySelector('.badge').textContent).toBe('Planning workspace');
  await act(async()=>root.unmount());host.remove();
});

test('the in-document section Next button is visible on screen for a multi-section document (regression for the stray CSS display:none)',async()=>{
  const template=DEFINE_TEMPLATES.find(t=>t.id==='stakeholder-register');
  const{host,root}=await render(template,pmProject);
  const workspaceCss=fs.readFileSync(path.join(__dirname,'DocumentWorkspace.css'),'utf8');
  const bareRuleLines=workspaceCss.split('\n').filter(line=>line.includes('.dw-main>footer{display:none}')&&!line.includes('@media'));
  expect(bareRuleLines).toEqual([]);
  const footerNext=[...host.querySelectorAll('.dw-main>footer button')].find(button=>button.textContent.includes('Next'));
  expect(footerNext).toBeTruthy();
  expect(footerNext.disabled).toBe(false);
  await act(async()=>root.unmount());host.remove();
});

// renderReportDocument is a pure function of (template, project, record, phase, diagram) — no
// mounted component, no DOM visibility state, no browser event required. That's deliberate: it's
// the single source of truth Print and Export PDF both call, and it can be exercised directly
// here (or by any other automated caller) without any of the ambiguity a "is the right DOM tree
// currently visible" test carries.
describe('renderReportDocument (the shared Print/Export PDF source)',()=>{
  const stakeholderTemplate=DEFINE_TEMPLATES.find(t=>t.id==='stakeholder-register');
  const wbsTemplate=PMP_TEMPLATES.find(t=>t.id==='wbs');
  const riskTemplate=PMP_TEMPLATES.find(t=>t.id==='risk-register');

  test('includes every section, not just whichever one is active on screen',()=>{
    const html=renderReportDocument({template:stakeholderTemplate,project:pmProject,record:{values:{}},phase:'Initiation',diagram:null});
    expect(html).toContain('Engagement Strategy');
    expect(html).toContain('Stakeholder Register');
  });

  test('embeds the WBS tree diagram automatically — not conditional on the Preview Diagram panel ever having been opened',()=>{
    const record={values:{wbsRows:[{id:'r1',wbsId:'1',level:'1',parentId:'',workPackage:'Root deliverable',owner:'Jane',acceptance:'Signed off'}]}};
    const html=renderReportDocument({template:wbsTemplate,project:pmProject,record,phase:'Planning',diagram:<WBSTreeDiagram rows={record.values.wbsRows} projectName={pmProject.name}/>});
    expect(html).toContain('wbs-diagram');
    expect(html).toContain('Root deliverable');
  });

  test('renders with its own dr-* report classes only — no dw-* live-editor card/box chrome',()=>{
    const html=renderReportDocument({template:wbsTemplate,project:pmProject,record:{values:{wbsRows:[]}},phase:'Planning',diagram:null});
    expect(html).not.toMatch(/class="dw-section-grid/);
    expect(html).not.toMatch(/class="dw-field/);
    expect(html).not.toMatch(/class="dw-table/);
    expect(html).toContain('dr-report');
  });

  test('a wide table renders as a natural flowing HTML table, not an overflow-scroll container that print would clip',()=>{
    const record={values:{riskRows:[{id:'r1',riskId:'R-1',risk:'Vendor delay',probability:'3',impact:'4',exposure:'12',owner:'Jane',response:'Mitigate',status:'Open'}]}};
    const html=renderReportDocument({template:riskTemplate,project:pmProject,record,phase:'Planning',diagram:null});
    expect(html).toContain('dr-table-scroll');
    expect(html).not.toContain('dw-table-scroll');
    expect(html).toContain('Vendor delay');
  });

  test('is a complete standalone HTML document (doctype, head, styles, body) — not a fragment that depends on an existing page context',()=>{
    const html=renderReportDocument({template:stakeholderTemplate,project:pmProject,record:{values:{}},phase:'Initiation',diagram:null});
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('<style>');
    expect(html).toContain('<body>');
  });
});

test('the Print button mounts the full report directly into an isolated iframe document (createRoot, not a serialized HTML string) and the iframe body is non-empty before print is invoked',async()=>{
  const template=DEFINE_TEMPLATES.find(t=>t.id==='stakeholder-register');
  const{host,root}=await render(template,pmProject);
  const printButton=[...host.querySelectorAll('.workspace-shell-actions button')].find(b=>b.textContent==='Print');
  expect(document.querySelectorAll('iframe').length).toBe(0);
  // print() uses flushSync for the report's initial commit, so the iframe body is populated
  // synchronously within the click handler — no wait needed to observe it.
  await act(async()=>{printButton.click();});
  const iframe=document.querySelector('iframe');
  expect(iframe).toBeTruthy();
  // The explicit non-empty check DocumentWorkspace.print itself performs before calling print():
  expect(iframe.contentDocument.body.textContent.trim().length).toBeGreaterThan(0);
  expect(iframe.contentDocument.body.innerHTML).toContain('dr-report');
  expect(iframe.contentDocument.body.innerHTML).toContain('Stakeholder Register');
  expect(iframe.contentDocument.body.querySelector('.dw-section-grid')).toBeNull();
  await act(async()=>root.unmount());host.remove();
});

test('Export PDF renders the full report into an isolated off-screen container (not the live editor) before rasterizing it',async()=>{
  const template=PMP_TEMPLATES.find(t=>t.id==='wbs');
  const seededProject={...pmProject,documents:{'document-wbs':{id:'document-wbs',templateId:'wbs',projectId:pmProject.id,values:{wbsRows:[{id:'r1',wbsId:'1',level:'1',parentId:'',workPackage:'Root deliverable',owner:'Jane',acceptance:'Signed off'}]},references:{}}}};
  const{host,root}=await render(template,seededProject);
  // react-scripts test sets resetMocks:true by default, which wipes any implementation set at
  // jest.mock() factory time before every test (not just the first) — so it must be
  // re-established here rather than relied on from the top-level jest.mock() call.
  // Capture the target's content at the moment html2canvas is actually invoked — by the time the
  // click handler's finally block runs (exportRoot.unmount()), the container is already cleared,
  // so asserting on it afterward would test nothing real; this is what html2canvas itself would
  // have seen synchronously, in a real browser, at capture time.
  let capturedInnerHtml=null,capturedHasEditorChrome=null;
  html2canvas.mockImplementation(async target=>{capturedInnerHtml=target.innerHTML;capturedHasEditorChrome=Boolean(target.querySelector('.dw-section-grid'));return{height:100,width:100,toDataURL:()=>'data:image/jpeg;base64,'}});
  jsPDF.mockImplementation(()=>({addImage:jest.fn(),addPage:jest.fn(),save:jest.fn()}));
  const exportButton=[...host.querySelectorAll('.workspace-shell-actions button')].find(b=>b.textContent==='Export PDF');
  await act(async()=>{exportButton.click();await new Promise(resolve=>setTimeout(resolve,50))});
  expect(html2canvas).toHaveBeenCalled();
  expect(capturedInnerHtml).toContain('dr-report');
  expect(capturedInnerHtml).toContain('wbs-diagram');
  expect(capturedInnerHtml).toContain('Root deliverable');
  // The captured node must not be the live editor's own subtree.
  expect(capturedHasEditorChrome).toBe(false);
  await act(async()=>root.unmount());host.remove();
});

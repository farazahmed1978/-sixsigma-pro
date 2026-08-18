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

const charterTemplate=DEFINE_TEMPLATES.find(t=>t.id==='charter');
const sipocTemplate=DEFINE_TEMPLATES.find(t=>t.id==='sipoc');
const wbsTemplate=PMP_TEMPLATES.find(t=>t.id==='wbs');
const finalReportTemplate=PMP_TEMPLATES.find(t=>t.id==='final-project-report');

const seededProject=(suiteId,templates,overrides={})=>{
  const documents={};
  templates.forEach(template=>{documents[documentIdFor(template.id)]=createDocument(template,'seed-project');});
  return {id:'seed-project',name:'PM Project',suiteId,methodology:suiteId==='project-management'?'pmp':'lean-six-sigma',documents,activityLog:[],sharedFields:{},artifacts:[],evidenceLibrary:[],...overrides};
};

test('projectReportEntries only includes documents with a saved record, in suite lifecycle stage order',()=>{
  // Seeded out of stage order (Closing before Planning before Initiation) to prove the function
  // sorts by stage rather than just passing seeded order through.
  const project=seededProject('project-management',[finalReportTemplate,wbsTemplate,charterTemplate]);
  const entries=projectReportEntries(project);
  expect(entries.map(entry=>entry.template.id)).toEqual(['charter','wbs','final-project-report']);
});

test('projectReportEntries excludes templates the project has never opened (no saved record)',()=>{
  const project=seededProject('project-management',[wbsTemplate]);
  const entries=projectReportEntries(project);
  expect(entries.map(entry=>entry.template.id)).toEqual(['wbs']);
});

test("projectReportEntries resolves the shared lead-in Charter to the PM suite's first stage label, matching the per-document Print button",()=>{
  const project=seededProject('project-management',[charterTemplate]);
  const entries=projectReportEntries(project);
  expect(entries[0].phase).toBe(lifecycleForProject(project).stages[0].label);
});

test('an OE project orders documents through Define → Measure → ... using the same function, no suite branching required by the caller',()=>{
  const project=seededProject('operational-excellence',[sipocTemplate,charterTemplate]);
  const entries=projectReportEntries(project);
  expect(entries.map(entry=>entry.template.id)).toEqual(['charter','sipoc']);
});

test('renderProjectFullReportDocument produces a single HTML document with a cover page and every entry, in order',()=>{
  const project=seededProject('project-management',[wbsTemplate,charterTemplate]);
  const entries=projectReportEntries(project);
  const html=renderProjectFullReportDocument({project,lifecycle:lifecycleForProject(project),stageLabel:'Planning',entries,generatedAt:'January 1, 2026'});
  expect(html).toMatch(/^<!doctype html>/i);
  expect(html).toContain('dr-cover');
  expect(html).toContain(project.name);
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

test('printProjectReport mounts the assembled cover + documents into an isolated iframe',async()=>{
  const project=seededProject('project-management',[wbsTemplate,charterTemplate]);
  const statuses=[];
  await act(async()=>{printProjectReport(project,{onStatus:message=>statuses.push(message)});});
  const iframe=document.querySelector('iframe');
  expect(iframe).toBeTruthy();
  expect(iframe.contentDocument.body.textContent.trim().length).toBeGreaterThan(0);
  expect(iframe.contentDocument.body.innerHTML).toContain('dr-cover');
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

test('exportProjectReportToFile rasterizes the assembled cover + documents and saves a project-named PDF',async()=>{
  const project=seededProject('project-management',[wbsTemplate,charterTemplate]);
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
  expect(jsPDF).toHaveBeenCalled();
  expect(statuses).toContain('Full project report exported');
});

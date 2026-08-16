import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import Templates,{UNMAPPED_SUITE_TEMPLATE_IDS} from './Templates';

let mockProjects=[];
let mockCanAccess=()=>false;

jest.mock('../context/ProjectsContext',()=>({useProjects:()=>({projects:mockProjects,getProject:id=>mockProjects.find(project=>project.id===id)||null,updateProject:jest.fn()})}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:'user-1'},profile:{default_organization_id:'org-1'}})}));
jest.mock('../context/EntitlementContext',()=>({useEntitlements:()=>({canAccess:id=>mockCanAccess(id)})}));
jest.mock('../repositories/documentRepository',()=>({documentRepository:{createStandalone:jest.fn(),getStandalone:jest.fn(),updateStandalone:jest.fn()}}));
jest.mock('../context/ReportContext',()=>({useReport:()=>({addReportItem:jest.fn(),items:[]})}));
jest.mock('../context/WorksheetContext',()=>({useWorksheet:()=>({datasets:[]})}));
jest.mock('../context/AnalysisContext',()=>({useAnalysis:()=>({analysisResults:[]})}));
jest.mock('jspdf',()=>jest.fn());
jest.mock('html2canvas',()=>jest.fn());

const render=async initial=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={[initial]}><Routes><Route path="/templates" element={<Templates/>}/></Routes></MemoryRouter>));
  return{host,root};
};

beforeEach(()=>{mockProjects=[];mockCanAccess=()=>false});

test('the PMP_TEMPLATES catalog has no entries missing a NAVIGATION suite mapping (they would otherwise be silently unfiltered)',()=>{
  expect(UNMAPPED_SUITE_TEMPLATE_IDS).toEqual([]);
});

test('a PM-only org sees only Project Management templates in the Document Library, not Operational Excellence ones',async()=>{
  mockCanAccess=id=>id==='project-management';
  const{host,root}=await render('/templates');
  expect(host.textContent).toContain('Risk Register');
  expect(host.textContent).not.toContain('SIPOC');
  await act(async()=>root.unmount());host.remove();
});

test('an OE-only org sees only Operational Excellence templates in the Document Library, not Project Management ones',async()=>{
  mockCanAccess=id=>id==='operational-excellence';
  const{host,root}=await render('/templates');
  expect(host.textContent).toContain('SIPOC');
  expect(host.textContent).not.toContain('Risk Register');
  expect(host.textContent).not.toContain('WBS');
  await act(async()=>root.unmount());host.remove();
});

test('shared templates (Charter, Business Case, Stakeholder Register) appear for a PM-only org',async()=>{
  mockCanAccess=id=>id==='project-management';
  const{host,root}=await render('/templates');
  expect(host.textContent).toContain('Project Charter');
  expect(host.textContent).toContain('Business Case');
  expect(host.textContent).toContain('Stakeholder Register');
  await act(async()=>root.unmount());host.remove();
});

test('shared templates (Charter, Business Case, Stakeholder Register) also appear for an OE-only org',async()=>{
  mockCanAccess=id=>id==='operational-excellence';
  const{host,root}=await render('/templates');
  expect(host.textContent).toContain('Project Charter');
  expect(host.textContent).toContain('Business Case');
  expect(host.textContent).toContain('Stakeholder Register');
  await act(async()=>root.unmount());host.remove();
});

test('a project with an explicit PM methodology determines the suite shown, independent of which suite is owned first',async()=>{
  mockCanAccess=()=>true; // org owns both
  mockProjects=[{id:'p1',name:'PM Project',methodology:'pmp',documents:{}}];
  const{host,root}=await render('/templates?project=p1');
  expect(host.textContent).toContain('Risk Register');
  expect(host.textContent).not.toContain('SIPOC');
  await act(async()=>root.unmount());host.remove();
});

test('an org that owns both suites defaults to a single suite (not the automatic mix) when no project is selected, with an explicit opt-in to combine',async()=>{
  mockCanAccess=()=>true;
  const{host,root}=await render('/templates');
  // Default: only one suite's templates are visible, not both.
  const sipocShown=host.textContent.includes('SIPOC');
  const riskRegisterShown=host.textContent.includes('Risk Register');
  expect(sipocShown&&riskRegisterShown).toBe(false);
  // The combine toggle is offered (org owns both) and is off by default.
  const toggle=host.querySelector('.templates-combined-toggle input[type="checkbox"]');
  expect(toggle).toBeTruthy();
  expect(toggle.checked).toBe(false);
  await act(async()=>{toggle.click()});
  expect(host.textContent).toContain('SIPOC');
  expect(host.textContent).toContain('Risk Register');
  await act(async()=>root.unmount());host.remove();
});

test('the combine toggle is not offered to an org that owns only one suite',async()=>{
  mockCanAccess=id=>id==='operational-excellence';
  const{host,root}=await render('/templates');
  expect(host.querySelector('.templates-combined-toggle')).toBeNull();
  await act(async()=>root.unmount());host.remove();
});

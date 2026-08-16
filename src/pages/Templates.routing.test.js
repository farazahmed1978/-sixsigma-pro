import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import Templates from './Templates';
import{NAVIGATION}from'../config/navigation';
import{navigationItems}from'../utils/navigationTools';

const mockProject={id:'project-1',name:'QA Project',documents:{},activityLog:[],artifacts:[],evidenceLibrary:[],sharedFields:{businessCaseSummary:'Testing if this retains'}};
const mockUpdateProject=jest.fn(async(_id,updates)=>{Object.assign(mockProject,updates);return mockProject});
let mockProjects=[mockProject];
let mockStandaloneRows={};
const mockStandaloneId='11111111-1111-4111-8111-111111111111';
const mockCreateStandalone=jest.fn();
const mockGetStandalone=jest.fn();
const mockUpdateStandalone=jest.fn();

jest.mock('../context/ProjectsContext',()=>({useProjects:()=>({projects:mockProjects,getProject:id=>mockProjects.find(project=>project.id===id)||null,updateProject:mockUpdateProject})}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:'user-1'},profile:{default_organization_id:'22222222-2222-4222-8222-222222222222'}})}));
jest.mock('../repositories/documentRepository',()=>({documentRepository:{createStandalone:row=>mockCreateStandalone(row),getStandalone:id=>mockGetStandalone(id),updateStandalone:row=>mockUpdateStandalone(row)}}));
jest.mock('../context/ReportContext',()=>({useReport:()=>({addReportItem:jest.fn(),items:[]})}));
jest.mock('../context/WorksheetContext',()=>({useWorksheet:()=>({datasets:[]})}));
jest.mock('../context/AnalysisContext',()=>({useAnalysis:()=>({analysisResults:[]})}));
jest.mock('jspdf',()=>jest.fn());
jest.mock('html2canvas',()=>jest.fn());

beforeEach(()=>{mockProjects=[mockProject];mockProject.documents={};mockStandaloneRows={};mockUpdateProject.mockClear();mockCreateStandalone.mockImplementation(async row=>{const saved={...row,id:mockStandaloneId,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};mockStandaloneRows[saved.id]=saved;return saved});mockGetStandalone.mockImplementation(async id=>{if(!mockStandaloneRows[id])throw new Error('not found');return mockStandaloneRows[id]});mockUpdateStandalone.mockImplementation(async row=>{mockStandaloneRows[row.id]={...row};return mockStandaloneRows[row.id]});localStorage.setItem('axentra_document_autosave','off')});

test.each([
  ['CTQ Tree','ctq-tree','Define'],
  ['Voice of the Customer (VOC)','voc','Define'],
  ['Data Collection Plan','data-collection-plan','Measure'],
  ['5 Whys','five-whys','Analyze'],
  ['Pilot Plan','pilot-plan','Improve'],
  ['Control Plan','control-plan','Control'],
])('%s direct DMAIC entry exposes Project vs Standalone (%s)',async(name,templateId)=>{
  const path=`/documents/${templateId}`;
  if(templateId==='ctq-tree')expect(navigationItems(NAVIGATION).find(item=>item.name==='CTQ Tree').path).toBe(path);
  const host=document.createElement('div'),root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/documents/:templateId" element={<Templates/>}/></Routes></MemoryRouter>));
  expect(host.textContent).toContain(`Where should this ${name} live?`);
  expect(host.textContent).toContain('Use in Project: QA Project');
  expect(host.textContent).toContain('Create Standalone');
  await act(async()=>root.unmount());
});

test('no-active-project direct entry still offers Standalone without requiring project selection',async()=>{
  mockProjects=[];localStorage.removeItem('aureqin_standalone_artifacts');
  const host=document.createElement('div'),root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={['/documents/ctq-tree']}><Routes><Route path="/documents/:templateId" element={<Templates/>}/></Routes></MemoryRouter>));
  expect(host.textContent).toContain('Select a project');
  expect(host.textContent).not.toContain('Use in Project:');
  expect(host.textContent).toContain('Create Standalone');
  await act(async()=>{host.querySelector('.artifact-context-choices .btn-secondary').click();await new Promise(resolve=>setTimeout(resolve,0))});
  expect(host.textContent).toContain('Standalone artifact');
  await act(async()=>root.unmount());
});

test('direct entry for an existing project artifact reopens without another context prompt',async()=>{
  mockProject.documents={'document-ctq-tree':{id:'document-ctq-tree',templateId:'ctq-tree',projectId:'project-1',values:{ctqTree:[]},references:{},artifactContext:{mode:'project',projectId:'project-1'}}};
  const host=document.createElement('div'),root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={['/documents/ctq-tree?project=project-1']}><Routes><Route path="/documents/:templateId" element={<Templates/>}/><Route path="/projects/:projectId/documents/:templateId" element={<Templates/>}/></Routes></MemoryRouter>));
  expect(host.querySelector('.artifact-context-gate')).toBeNull();
  expect(host.textContent).toContain('CTQ Tree');
  expect(mockUpdateProject).not.toHaveBeenCalled();
  await act(async()=>root.unmount());
});

test('direct Business Case project route hydrates Charter Business Case into Executive Summary',async()=>{
  mockProject.documents={};mockUpdateProject.mockClear();
  localStorage.setItem('axentra_document_autosave','off');
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={['/projects/project-1/documents/business-case']}><Routes><Route path="/projects/:projectId/documents/:templateId" element={<Templates/>}/></Routes></MemoryRouter>));
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0))});
  expect(host.querySelector('.artifact-context-gate')).toBeNull();
  const executiveSummary=[...host.querySelectorAll('.dw-field')].find(field=>field.querySelector('label')?.textContent.includes('Executive Summary'));
  expect(executiveSummary).toBeTruthy();
  expect(executiveSummary.querySelector('textarea').value).toBe('Testing if this retains');
  expect(mockUpdateProject.mock.calls[0][1].documents['document-business-case'].artifactContext).toEqual(expect.objectContaining({mode:'project',projectId:'project-1'}));
  await act(async()=>root.unmount());host.remove();
});

test('standalone choice persists isolated context and does not inherit project shared fields',async()=>{
  mockProject.documents={};
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={['/documents/business-case?project=project-1']}><Routes><Route path="/projects/:projectId/documents/:templateId" element={<Templates/>}/><Route path="/documents/:templateId" element={<Templates/>}/></Routes></MemoryRouter>));
  await act(async()=>{host.querySelector('.artifact-context-choices .btn-secondary').click();await new Promise(resolve=>setTimeout(resolve,0))});
  expect(host.textContent).toContain('Standalone artifact');
  expect(host.querySelector('.dw-field textarea').value).toBe('');
  expect(host.textContent).not.toContain('Add to Report');
  expect(mockCreateStandalone).toHaveBeenCalledWith(expect.objectContaining({project_id:null,organization_id:'22222222-2222-4222-8222-222222222222',created_by:'user-1'}));
  await act(async()=>root.unmount());host.remove();
});

test('standalone CTQ creates a canonical UUID, autosaves values, and hydrates them after reload',async()=>{
  jest.useFakeTimers();localStorage.setItem('axentra_document_autosave','on');
  const render=async initial=>{const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>{root.render(<MemoryRouter initialEntries={[initial]}><Routes><Route path="/documents/:templateId" element={<Templates/>}/></Routes></MemoryRouter>);await Promise.resolve();await Promise.resolve()});return{host,root}};
  let{host,root}=await render('/documents/ctq-tree');
  await act(async()=>{host.querySelector('.artifact-context-choices .btn-secondary').click();await Promise.resolve();await Promise.resolve()});
  expect(mockCreateStandalone.mock.results[0].value).toBeTruthy();expect(mockGetStandalone).toHaveBeenCalledWith(mockStandaloneId);
  const field=label=>[...host.querySelectorAll('.dw-field')].find(item=>item.querySelector('label')?.textContent.includes(label)).querySelector('input,textarea');
  const enter=(input,value)=>{const prototype=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))};
  await act(async()=>{[['Customer Segment','Customer1'],['Tree Owner','Faraz'],['VOC Evidence','Testing 123']].forEach(([label,value])=>enter(field(label),value));jest.advanceTimersByTime(800);await Promise.resolve();await Promise.resolve()});
  expect(mockUpdateStandalone).toHaveBeenCalled();const saved=mockStandaloneRows[mockStandaloneId];expect(saved.project_id).toBeNull();expect(saved.content.values).toEqual(expect.objectContaining({customerSegment:'Customer1',treeOwner:'Faraz',evidence:'Testing 123'}));expect(host.textContent).toContain('Saved');expect(host.textContent).not.toContain('Add to Report');
  await act(async()=>root.unmount());host.remove();
  ({host,root}=await render(`/documents/ctq-tree?standalone=${mockStandaloneId}`));
  expect(field('Customer Segment').value).toBe('Customer1');expect(field('Tree Owner').value).toBe('Faraz');expect(field('VOC Evidence').value).toBe('Testing 123');
  await act(async()=>root.unmount());host.remove();jest.useRealTimers();
});

test('standalone autosave failure shows an error and Save retries successfully',async()=>{
  jest.useFakeTimers();localStorage.setItem('axentra_document_autosave','on');const templateId='ctq-tree';mockStandaloneRows[mockStandaloneId]={id:mockStandaloneId,project_id:null,organization_id:'22222222-2222-4222-8222-222222222222',created_by:'user-1',title:'CTQ Tree',status:'draft',content:{id:mockStandaloneId,templateId,projectId:'',title:'CTQ Tree',status:'draft',values:{},references:{},artifactContext:{mode:'standalone',projectId:'',instanceId:mockStandaloneId}}};mockUpdateStandalone.mockRejectedValueOnce(new Error('Cloud save unavailable'));
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>{root.render(<MemoryRouter initialEntries={[`/documents/${templateId}?standalone=${mockStandaloneId}`]}><Routes><Route path="/documents/:templateId" element={<Templates/>}/></Routes></MemoryRouter>);await Promise.resolve();await Promise.resolve()});
  const input=[...host.querySelectorAll('.dw-field')].find(item=>item.querySelector('label')?.textContent.includes('Tree Owner')).querySelector('input'),setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;await act(async()=>{setter.call(input,'Faraz');input.dispatchEvent(new Event('input',{bubbles:true}));jest.advanceTimersByTime(800);await Promise.resolve();await Promise.resolve()});
  expect(host.textContent).toContain('Save failed · retry');expect(host.textContent).toContain('Cloud save unavailable');
  await act(async()=>{[...host.querySelectorAll('.workspace-shell-actions button')].find(button=>button.textContent==='Save').click();await Promise.resolve();await Promise.resolve()});
  expect(host.textContent).toContain('Saved');expect(mockUpdateStandalone).toHaveBeenCalledTimes(2);
  await act(async()=>root.unmount());host.remove();jest.useRealTimers();
});

test('existing singleton document reopens without prompting or creating a duplicate',async()=>{
  mockProject.documents={'document-business-case':{id:'document-business-case',templateId:'business-case',projectId:'project-1',values:{executiveSummary:'Existing authored case'},references:{},artifactContext:{mode:'project',projectId:'project-1'}}};mockUpdateProject.mockClear();
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={['/projects/project-1/documents/business-case']}><Routes><Route path="/projects/:projectId/documents/:templateId" element={<Templates/>}/></Routes></MemoryRouter>));
  expect(host.querySelector('.artifact-context-gate')).toBeNull();expect(host.querySelector('.dw-field textarea').value).toBe('Existing authored case');expect(mockUpdateProject).not.toHaveBeenCalled();
  await act(async()=>root.unmount());host.remove();
});

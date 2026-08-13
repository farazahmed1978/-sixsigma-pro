import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Route,Routes,useLocation} from 'react-router-dom';
import DocumentWorkspace from './DocumentWorkspace';
import {DEFINE_TEMPLATES} from '../config/defineTemplates';

jest.mock('./WorkspaceShell',()=>({children,className,nextLabel,onNext,nextDisabled})=><div className={className}><button type="button" data-testid="sequence-next" disabled={nextDisabled} onClick={onNext}>{nextLabel}</button><div className="workspace-shell-content">{children}</div></div>);
jest.mock('jspdf',()=>jest.fn());
jest.mock('html2canvas',()=>jest.fn());
jest.mock('../context/ReportContext',()=>({useReport:()=>({addReportItem:jest.fn(),items:[]})}));
jest.mock('../context/WorksheetContext',()=>({useWorksheet:()=>({datasets:[]})}));
jest.mock('../context/AnalysisContext',()=>({useAnalysis:()=>({analysisResults:[]})}));

test('autosave keeps the SIPOC workspace mounted, navigation stable, and editor focused',async()=>{
  jest.useFakeTimers();localStorage.setItem('axentra_document_autosave','on');
  const updateProject=jest.fn(async()=>({})),template={id:'sipoc',name:'SIPOC',phase:'Define',sections:[{id:'suppliers',title:'Suppliers',guidance:'List suppliers',fields:[{id:'supplierNotes',label:'Suppliers',type:'text'}]}]},project={id:'project-1',name:'QA',documents:{},activityLog:[],sharedFields:{},artifacts:[],evidenceLibrary:[]};
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter><DocumentWorkspace template={template} project={project} updateProject={updateProject}/></MemoryRouter>));
  const navigation=host.querySelector('.dw-nav'),editor=host.querySelector('.dw-field input');editor.focus();
  await act(async()=>{editor.value='Supplier A';editor.dispatchEvent(new Event('input',{bubbles:true}));jest.advanceTimersByTime(800);await Promise.resolve();await Promise.resolve()});
  expect(host.querySelector('.dw-nav')).toBe(navigation);expect(document.activeElement).toBe(editor);expect(updateProject).toHaveBeenCalledTimes(1);
  await act(async()=>root.unmount());host.remove();jest.useRealTimers();
});

const Location=()=>{const location=useLocation();return <div data-testid="location">{location.pathname}</div>};
const artifact=id=>DEFINE_TEMPLATES.find(item=>item.id===id);
const filledValues=template=>Object.fromEntries(template.sections.flatMap(section=>section.fields).filter(field=>field.required!==false).map(field=>[field.id,field.type==='table'?[{id:'row'}]:'complete value']));

async function renderBusinessCase(values){
  localStorage.setItem('axentra_document_autosave','off');
  const template=artifact('business-case'),record={id:'document-business-case',templateId:'business-case',projectId:'project-1',values,references:{},sectionState:{activeSectionId:'assurance'}};
  const project={id:'project-1',name:'QA',documents:{'document-business-case':record},activityLog:[],sharedFields:{},artifacts:[],evidenceLibrary:[]},updateProject=jest.fn(async()=>({}));
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={['/current']}><Routes><Route path="/current" element={<DocumentWorkspace template={template} project={project} updateProject={updateProject}/>}/><Route path="*" element={<Location/>}/></Routes></MemoryRouter>));
  return{host,root,updateProject};
}

test('incomplete artifact warns, Stay here remains, and Continue anyway preserves status then advances',async()=>{
  const{host,root,updateProject}=await renderBusinessCase({executiveSummary:'Still incomplete'});
  await act(async()=>host.querySelector('[data-testid="sequence-next"]').click());
  expect(host.querySelector('[role="dialog"]')).toBeTruthy();expect(host.textContent).toContain('This document is incomplete.');expect(host.textContent).toContain('% complete');expect(host.textContent).toContain('required items remain');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Stay here').click());
  expect(host.querySelector('[data-testid="location"]')).toBeNull();
  await act(async()=>host.querySelector('[data-testid="sequence-next"]').click());
  await act(async()=>{await [...host.querySelectorAll('button')].find(button=>button.textContent==='Continue anyway').click();await Promise.resolve()});
  expect(host.querySelector('[data-testid="location"]').textContent).toBe('/projects/project-1/documents/voc');
  expect(updateProject.mock.calls.at(-1)[1].documents['document-business-case'].completion).toBeLessThan(100);
  await act(async()=>root.unmount());host.remove();
});

test('fully complete artifact advances directly without a warning',async()=>{
  const template=artifact('business-case'),{host,root}=await renderBusinessCase(filledValues(template));
  await act(async()=>{host.querySelector('[data-testid="sequence-next"]').click();await Promise.resolve();await Promise.resolve()});
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(host.querySelector('[data-testid="location"]').textContent).toBe('/projects/project-1/documents/voc');
  await act(async()=>root.unmount());host.remove();
});

test('route identity remount opens shorter VOC metadata after Business Case without stale section crash',async()=>{
  localStorage.setItem('axentra_document_autosave','off');
  const project={id:'project-1',name:'QA',documents:{},activityLog:[],sharedFields:{},artifacts:[],evidenceLibrary:[]},updateProject=jest.fn(async()=>({}));
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter><DocumentWorkspace key="project-1:business-case" template={artifact('business-case')} project={project} updateProject={updateProject}/></MemoryRouter>));
  await act(async()=>root.render(<MemoryRouter><DocumentWorkspace key="project-1:voc" template={artifact('voc')} project={project} updateProject={updateProject}/></MemoryRouter>));
  expect(host.querySelector('.dw-executive h1').textContent).toBe('Voice of the Customer (VOC)');
  expect(host.querySelector('.dw-main h2').textContent).toBe('VOC Context');
  await act(async()=>root.unmount());host.remove();
});

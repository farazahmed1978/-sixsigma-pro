import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import ReportBuilder from './ReportBuilder';
import {documentRepository} from '../repositories/documentRepository';

jest.mock('jspdf',()=>jest.fn());
const mockNavigate=jest.fn();
jest.mock('react-router-dom',()=>({useNavigate:()=>mockNavigate,useLocation:()=>({state:null}),Link:({to,children,...rest})=>require('react').createElement('a',{href:to,...rest},children)}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({profile:{default_organization_id:'org-1'}})}));
jest.mock('../repositories/documentRepository',()=>({documentRepository:{listStandalone:jest.fn()}}));
jest.mock('../context/ReportContext',()=>({useReport:()=>({items:[],removeReportItem:jest.fn(),toggleIncludeRawData:jest.fn(),reorderItems:jest.fn(),clearReport:jest.fn(),storageWarning:null,dismissStorageWarning:jest.fn()})}));
jest.mock('../context/ProjectsContext',()=>({useProjects:()=>({projects:[],addArtifact:jest.fn()})}));
global.IS_REACT_ACT_ENVIRONMENT=true;

const flush=()=>act(async()=>{await Promise.resolve();await Promise.resolve()});

beforeEach(()=>{
 jest.clearAllMocks();
});

test('lists canonical standalone documents and opens the exact saved UUID without creating or project-associating it',async()=>{
 documentRepository.listStandalone.mockResolvedValueOnce([{
  id:'6e7d2f57-8a1e-4a71-a88d-8f87c836cc78',project_id:null,title:'My CTQ Tree',dmaic_phase:'Define',updated_at:'2026-08-15T18:00:00.000Z',content:{templateId:'ctq-tree',title:'My CTQ Tree'}
 }]);
 const host=document.createElement('div'),root=createRoot(host);
 act(()=>root.render(<ReportBuilder/>));
 await flush();
 expect(documentRepository.listStandalone).toHaveBeenCalledWith('org-1');
 expect(host.textContent).toContain('Standalone Artifacts');
 expect(host.textContent).toContain('My CTQ Tree');
 expect(host.textContent).toContain('ctq-tree');
 expect(host.textContent).toContain('Define');
 expect(host.textContent).not.toContain('Add to Report');
 const open=[...host.querySelectorAll('button')].find(button=>button.textContent==='Open');
 act(()=>open.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 expect(mockNavigate).toHaveBeenCalledWith('/documents/ctq-tree?standalone=6e7d2f57-8a1e-4a71-a88d-8f87c836cc78');
 expect(documentRepository.listStandalone).toHaveBeenCalledTimes(1);
 act(()=>root.unmount());
});

test('shows the standalone empty state independently of an empty project report',async()=>{
 documentRepository.listStandalone.mockResolvedValueOnce([]);
 const host=document.createElement('div'),root=createRoot(host);
 act(()=>root.render(<ReportBuilder/>));
 await flush();
 expect(host.textContent).toContain('No standalone artifacts yet.');
 expect(host.textContent).toContain('Project Artifacts');
 expect(host.textContent).toContain('No project assets added yet.');
 act(()=>root.unmount());
});

test('surfaces repository failures with a retry instead of hiding the standalone library',async()=>{
 documentRepository.listStandalone.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce([]);
 const host=document.createElement('div'),root=createRoot(host);
 act(()=>root.render(<ReportBuilder/>));
 await flush();
 expect(host.textContent).toContain('Network unavailable');
 const retry=[...host.querySelectorAll('button')].find(button=>button.textContent==='Retry');
 act(()=>retry.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 await flush();
 expect(documentRepository.listStandalone).toHaveBeenCalledTimes(2);
 expect(host.textContent).toContain('No standalone artifacts yet.');
 act(()=>root.unmount());
});

import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import ReportBuilder from './ReportBuilder';

jest.mock('jspdf',()=>jest.fn());
let mockLocationState=null;
jest.mock('react-router-dom',()=>({useNavigate:()=>jest.fn(),useLocation:()=>({state:mockLocationState}),Link:({to,children,...rest})=>require('react').createElement('a',{href:to,...rest},children)}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({profile:null})}));
jest.mock('../repositories/documentRepository',()=>({documentRepository:{listStandalone:jest.fn()}}));
global.IS_REACT_ACT_ENVIRONMENT=true;

const reportItems=[
 {id:'define-1',title:'Project Charter',phase:'Define',projectId:'project-1'},
 {id:'measure-1',title:'Capability Analysis',phase:'Measure',projectId:'project-1'},
 {id:'analyze-1',title:'ANOVA',phase:'Analyze',projectId:'project-1'},
 {id:'analyze-2',title:'Regression Analysis',phase:'Analyze',projectId:'project-1'},
 {id:'improve-1',title:'DOE',phase:'Improve',projectId:'project-1'},
 {id:'control-1',title:'Control Chart',phase:'Control',projectId:'project-1'}
];
// A second, PM project's own report items — cross-project/cross-suite data living in the same
// global ReportContext items list, exactly the scenario that let OE tools bleed into a PM
// project's Report Builder before project-scoping was added (Issue 4).
const pmReportItems=[
 {id:'pm-status-1',title:'Status Report',phase:'Initiation',projectId:'project-2'},
];
const mockReportApi={items:reportItems,removeReportItem:jest.fn(),toggleIncludeRawData:jest.fn(),reorderItems:jest.fn(),clearReport:jest.fn(),storageWarning:null,dismissStorageWarning:jest.fn()};
const mockProjectsApi={projects:[{id:'project-1',name:'Real Report Test'},{id:'project-2',name:'PM Project Two',suiteId:'project-management'}],addArtifact:jest.fn()};

jest.mock('../context/ReportContext',()=>({...jest.requireActual('../context/ReportContext'),useReport:()=>mockReportApi}));
jest.mock('../context/ProjectsContext',()=>({useProjects:()=>mockProjectsApi}));

const click=element=>act(()=>element.dispatchEvent(new MouseEvent('click',{bubbles:true})));

beforeEach(()=>{mockLocationState=null;mockReportApi.items=reportItems});

test('real ReportBuilder Print button opens options and previews the actual selected report items',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 act(()=>root.render(<ReportBuilder/>));
 expect(host.textContent).toContain('ProjectReal Report Test');
 expect(host.querySelector('input').value).toBe('Real Report Test — Project Report');
 const printButton=[...host.querySelectorAll('button')].find(button=>button.textContent==='Print');
 expect(printButton).toBeTruthy();
 click(printButton);
 expect(host.querySelector('[role="dialog"]')).toBeTruthy();
 expect(host.textContent).toContain('Print Report');
 expect(host.textContent).toContain('All 6 report artifacts');
 const selectedMode=[...host.querySelectorAll('input[type="radio"]')].find(input=>input.parentElement.textContent.includes('Selected items'));
 click(selectedMode);
 expect([...host.querySelectorAll('.report-print-picker li')].map(row=>row.textContent)).toEqual(reportItems.map(item=>item.title));
 const artifactChecks=[...host.querySelectorAll('.report-print-picker li input')];
 artifactChecks.forEach((checkbox,index)=>{if(![1,3,5].includes(index))click(checkbox)});
 click([...host.querySelectorAll('button')].find(button=>button.textContent==='Continue'));
 expect(host.textContent).toContain('Print Preview · 3 artifacts');
 expect([...host.querySelectorAll('[data-report-artifact-id]')].map(node=>node.dataset.reportArtifactId)).toEqual(['measure-1','analyze-2','control-1']);
 expect(mockReportApi.items).toBe(reportItems);
 act(()=>root.unmount());
});

// Issue 4 regression guard: Report Builder previously inferred "the project" from whichever report
// item happened to be first in the entire cross-project, cross-suite items list, so a PM project's
// report could surface another project's OE documents/analyses. With project context (passed via
// navigation state, the same way Project Hub's "Build Report" link now does), only that project's
// own items must appear.
test('Report Builder scoped to a project via navigation state shows only that project\'s items, not another project\'s',()=>{
 mockReportApi.items=[...reportItems,...pmReportItems];
 mockLocationState={projectId:'project-2'};
 const host=document.createElement('div'),root=createRoot(host);
 act(()=>root.render(<ReportBuilder/>));
 expect(host.textContent).toContain('PM Project Two');
 expect(host.textContent).toContain('Status Report');
 expect(host.textContent).not.toContain('Project Charter');
 expect(host.textContent).not.toContain('Capability Analysis');
 expect(host.textContent).not.toContain('ANOVA');
 act(()=>root.unmount());
});

test('Report Builder scoped to a project shows a Back to Project Hub link',()=>{
 mockReportApi.items=[...reportItems,...pmReportItems];
 mockLocationState={projectId:'project-2'};
 const host=document.createElement('div'),root=createRoot(host);
 act(()=>root.render(<ReportBuilder/>));
 const backLink=host.querySelector('a[href="/projects/project-2"]');
 expect(backLink).toBeTruthy();
 expect(backLink.textContent).toContain('Back to Project Hub');
 act(()=>root.unmount());
});

test('Report Builder opened without navigation state falls back to inferring the project from the first item (backward compatible) and shows no back link',()=>{
 mockReportApi.items=[...reportItems,...pmReportItems];
 const host=document.createElement('div'),root=createRoot(host);
 act(()=>root.render(<ReportBuilder/>));
 expect(host.textContent).toContain('Real Report Test');
 expect(host.querySelector('a[href^="/projects/"]')).toBeNull();
 act(()=>root.unmount());
});

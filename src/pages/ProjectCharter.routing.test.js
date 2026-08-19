import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Route,Routes,useLocation} from 'react-router-dom';
import ProjectCharter,{charterSaveStateLabel,mergeCharterSharedFields,projectCharterLinkTarget} from './ProjectCharter';
import {readFileSync} from 'fs';

jest.mock('../components/WorkspaceShell',()=>({children,breadcrumb,sequenceNextLabel,onSequenceNext,sequenceNextDisabled})=><div><div data-testid="breadcrumb">{breadcrumb}</div><button type="button" data-testid="sequence-next" disabled={sequenceNextDisabled} onClick={onSequenceNext}>{sequenceNextLabel}</button><div>{children}</div></div>);
jest.mock('jspdf',()=>jest.fn());
jest.mock('html2canvas',()=>jest.fn());
jest.mock('../context/ReportContext',()=>({useReport:()=>({addReportItem:jest.fn()})}));
let mockProject;
// updateProject's jest.fn() must be constructed inline inside the factory, not referenced from an
// externally-declared const — referencing an externally-constructed jest.fn() here silently loses
// its implementation (a babel-plugin-jest-hoist quirk with "mock"-prefixed hoisted references),
// while plain external variables (like mockProject below) work fine.
jest.mock('../context/ProjectsContext',()=>({useProjects:()=>({getProject:()=>mockProject,updateProject:jest.fn(()=>Promise.resolve({}))})}));

test('Project Charter Continue to SIPOC opens the project-scoped SIPOC workspace directly',()=>{
  expect(projectCharterLinkTarget('project-123','/templates')).toBe('/projects/project-123/documents/sipoc');
});

test('Project Charter has no duplicate in-body Continue to SIPOC CTA',()=>{
  const source=readFileSync(require.resolve('./ProjectCharter'),'utf8');
  expect(source).not.toContain('Continue to SIPOC');
});

test('Project Charter exposes honest autosave states and distinct navigation semantics',()=>{
  expect(charterSaveStateLabel('saving')).toBe('Saving…');
  expect(charterSaveStateLabel('saved')).toBe('Saved');
  expect(charterSaveStateLabel('unsaved')).toBe('Unsaved changes');
  const source=readFileSync(require.resolve('./ProjectCharter'),'utf8');
  expect(source).toContain('backLabel={PROJECT_HUB_BACK_LABEL}');
  expect(source).toContain('previousLabel="Previous"');
  expect(source).toContain('onPrevious={() => navigate(-1)}');
  expect(source).toContain('onClick={advanceSection}>Next');
});

test('Project Charter consumes canonical shared-field updates instead of retaining stale values',()=>{
  expect(mergeCharterSharedFields({businessCase:'Old case',problemStatement:'Keep this'},{businessCaseSummary:'Updated case'})).toEqual({businessCase:'Updated case',problemStatement:'Keep this'});
});

const Location=()=>{const location=useLocation();return <div data-testid="location">{location.pathname}</div>};
const renderCharter=async(project,state)=>{
  mockProject=project;
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  const entry=state?{pathname:`/projects/${project.id}/charter`,state}:`/projects/${project.id}/charter`;
  await act(async()=>root.render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/projects/:id/charter" element={<ProjectCharter/>}/><Route path="*" element={<Location/>}/></Routes></MemoryRouter>));
  return{host,root};
};
const continueAnyway=async host=>{
  await act(async()=>host.querySelector('[data-testid="sequence-next"]').click());
  await act(async()=>{await [...host.querySelectorAll('button')].find(button=>button.textContent==='Continue anyway').click();await Promise.resolve()});
};

test('an OE project\'s Charter breadcrumb/badge reads Define, and Next still correctly leads to SIPOC (regression)',async()=>{
  const{host,root}=await renderCharter({id:'oe-project-1',name:'OE Project',methodology:'lean-six-sigma',charter:{},documents:{},sharedFields:{}});
  expect(host.querySelector('[data-testid="breadcrumb"]').textContent).toContain('Define');
  expect(host.querySelector('.badge-define')).toBeTruthy();
  expect(host.querySelector('[data-testid="sequence-next"]').textContent).toBe('SIPOC');
  await continueAnyway(host);
  expect(host.querySelector('[data-testid="location"]').textContent).toBe('/projects/oe-project-1/documents/sipoc');
  await act(async()=>root.unmount());host.remove();
});

test('a PM project\'s Charter breadcrumb/badge reads Initiation, and Next correctly leads into the PM sequence, not SIPOC',async()=>{
  const{host,root}=await renderCharter({id:'pm-project-1',name:'PM Project',methodology:'pmp',charter:{},documents:{},sharedFields:{}});
  expect(host.querySelector('[data-testid="breadcrumb"]').textContent).toContain('Initiation');
  expect(host.querySelector('[data-testid="breadcrumb"]').textContent).not.toContain('Define');
  expect(host.querySelector('.badge-initiation')).toBeTruthy();
  expect(host.querySelector('[data-testid="sequence-next"]').textContent).toBe('Stakeholder Register');
  await continueAnyway(host);
  expect(host.querySelector('[data-testid="location"]').textContent).toBe('/projects/pm-project-1/documents/stakeholder-register');
  expect(host.querySelector('[data-testid="location"]').textContent).not.toContain('sipoc');
  await act(async()=>root.unmount());host.remove();
});

test('without guided router state, no guided-mode banner renders (non-guided Charter flow is unaffected)',async()=>{
  const{host,root}=await renderCharter({id:'oe-project-2',name:'OE Project',methodology:'lean-six-sigma',charter:{},documents:{},sharedFields:{}});
  expect(host.querySelector('.pc-guided-banner')).toBeNull();
  await act(async()=>root.unmount());host.remove();
});

test('with guided router state and an incomplete charter, the "Step 1 of 3 mandatory documents" banner renders',async()=>{
  const{host,root}=await renderCharter({id:'oe-project-3',name:'OE Project',methodology:'lean-six-sigma',charter:{},documents:{},sharedFields:{}},{guided:true});
  const banner=host.querySelector('.pc-guided-banner');
  expect(banner).toBeTruthy();
  expect(banner.textContent).toContain('Step 1 of 3 mandatory documents — Project Charter');
  expect(banner.classList.contains('pc-guided-complete')).toBe(false);
  await act(async()=>root.unmount());host.remove();
});

test('with guided router state and a fully complete charter, the completion prompt renders and routes to the Project Hub',async()=>{
  const fullCharter={
    projectSummary:'Summary',targetDate:'2026-01-01',businessCase:'Case',problemStatement:'Problem',goalStatement:'Goal',
    scopeIn:'In',scopeOut:'Out',team:[{id:'t1',name:'A',role:'Lead'}],stakeholders:[{id:'s1',name:'B'}],
    timeline:[{id:'m1',date:'2026-02-01'}],financialImpact:'Impact',risks:[{id:'r1',risk:'Risk',mitigation:'Mitigate'}],
    assumptions:'Assume',constraints:'Constrain',approvals:[{id:'a1',name:'C',status:'Approved'}],
  };
  const{host,root}=await renderCharter({id:'oe-project-4',name:'OE Project',methodology:'lean-six-sigma',charter:fullCharter,documents:{},sharedFields:{}},{guided:true});
  const banner=host.querySelector('.pc-guided-banner');
  expect(banner).toBeTruthy();
  expect(banner.classList.contains('pc-guided-complete')).toBe(true);
  expect(banner.textContent).toContain("Your project is started. Now let's set up your planning documents.");
  await act(async()=>{[...banner.querySelectorAll('button')].find(button=>button.textContent==='Go to Project Hub').click()});
  expect(host.querySelector('[data-testid="location"]').textContent).toBe('/projects/oe-project-4');
  await act(async()=>root.unmount());host.remove();
});

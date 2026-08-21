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
// mockUpdateProject is a single stable reference (not a fresh jest.fn() constructed inline inside
// the factory on every useProjects() call) so guided-mode tests can assert on what it was called
// with. CRA's resetMocks:true wipes any jest.fn() implementation before every test (not just the
// first) — harmless here since these tests only assert on call args, not the resolved value.
const mockUpdateProject=jest.fn(()=>Promise.resolve({}));
jest.mock('../context/ProjectsContext',()=>({useProjects:()=>({getProject:()=>mockProject,updateProject:(...args)=>mockUpdateProject(...args)})}));

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

// CRA's Jest config runs with resetMocks:true, which wipes a mock's implementation (not just its
// call history) before every test — re-establish it here every time.
beforeEach(()=>{mockUpdateProject.mockReset().mockImplementation(()=>Promise.resolve({}))});

const Location=()=>{const location=useLocation();return <div data-testid="location">{location.pathname}</div>};
const renderCharter=async(project,state,onGuidedState)=>{
  mockProject=project;
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  const entry=state?{pathname:`/projects/${project.id}/charter`,state}:`/projects/${project.id}/charter`;
  await act(async()=>root.render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/projects/:id/charter" element={<ProjectCharter onGuidedState={onGuidedState}/>}/><Route path="*" element={<Location/>}/></Routes></MemoryRouter>));
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

test('without guided router state, the chrome-stripped guided view never renders (non-guided Charter flow is unaffected)',async()=>{
  const{host,root}=await renderCharter({id:'oe-project-2',name:'OE Project',methodology:'lean-six-sigma',charter:{},documents:{},sharedFields:{}});
  expect(host.querySelector('.gw-section-only')).toBeNull();
  expect(host.querySelector('[data-testid="breadcrumb"]')).toBeTruthy();
  await act(async()=>root.unmount());host.remove();
});

// QA pass (post-5C): GuidedWorkspace.js is now the single source of truth for the explanation
// panel, section-nav/Continue buttons, and the CTA footer (architecture note) — ProjectCharter.js's
// guided branch renders only the current section's fields and reports live state up via the
// onGuidedState callback prop, so these tests assert against that contract instead of markup that
// no longer lives here.
test('with guided router state, ProjectCharter renders only the current section (no chrome, no CTA) and reports live state via onGuidedState',async()=>{
  const onGuidedState=jest.fn();
  const{host,root}=await renderCharter({id:'oe-project-3',name:'OE Project',methodology:'lean-six-sigma',charter:{},documents:{},sharedFields:{}},{guided:true},onGuidedState);
  expect(host.querySelector('[data-testid="breadcrumb"]')).toBeNull();
  const section=host.querySelector('.gw-section-only');
  expect(section).toBeTruthy();
  expect(section.textContent).toContain('SECTION 01 OF 12');
  expect(section.textContent).toContain('Project Overview');
  expect(host.querySelector('.gw-cta-actions')).toBeNull();
  expect(host.querySelector('.gw-cta-hint')).toBeNull();
  const latest=()=>onGuidedState.mock.calls[onGuidedState.mock.calls.length-1][0];
  expect(latest().sectionIndex).toBe(0);
  expect(latest().totalSections).toBe(12);
  expect(latest().completedSections).toBe(0);
  expect(latest().isLastSection).toBe(false);
  expect(latest().allRequiredFieldsFilled).toBe(false);
  await act(async()=>{await latest().goToNext();});
  expect(host.querySelector('.gw-section-only').textContent).toContain('Business Need');
  expect(latest().sectionIndex).toBe(1);
  await act(async()=>root.unmount());host.remove();
});

const fullCharterFixture={
  projectSummary:'Summary',targetDate:'2026-01-01',businessCase:'Case',problemStatement:'Problem',goalStatement:'Goal',
  scopeIn:'In',scopeOut:'Out',team:[{id:'t1',name:'A',role:'Lead'}],stakeholders:[{id:'s1',name:'B'}],
  timeline:[{id:'m1',date:'2026-02-01'}],financialImpact:'Impact',risks:[{id:'r1',risk:'Risk',mitigation:'Mitigate'}],
  assumptions:'Assume',constraints:'Constrain',approvals:[{id:'a1',name:'C',status:'Approved'}],
};

// Regression coverage for QA Issue 4 (navigation broke at section 11 of 12): drive goToNext through
// every one of the Charter's 12 sections and confirm isLastSection only flips true at the final
// section, and that a further goToNext past the end is a harmless no-op rather than breaking.
test('with a fully complete charter, onGuidedState reports allRequiredFieldsFilled and reaches isLastSection only at the final section across all 12 sections (Issue 4 regression)',async()=>{
  const onGuidedState=jest.fn();
  const{host,root}=await renderCharter({id:'oe-project-4',name:'OE Project',methodology:'lean-six-sigma',charter:fullCharterFixture,documents:{},sharedFields:{}},{guided:true},onGuidedState);
  const latest=()=>onGuidedState.mock.calls[onGuidedState.mock.calls.length-1][0];
  expect(latest().allRequiredFieldsFilled).toBe(true);
  for(let step=0;step<11;step++){
    expect(latest().isLastSection).toBe(false);
    await act(async()=>{await latest().goToNext();});
  }
  expect(latest().sectionIndex).toBe(11);
  expect(latest().isLastSection).toBe(true);
  expect(latest().totalSections).toBe(12);
  expect(host.querySelector('.gw-section-only').textContent).toContain('Approval');
  await act(async()=>{await latest().goToNext();});
  expect(latest().sectionIndex).toBe(11);
  expect(latest().isLastSection).toBe(true);
  await act(async()=>root.unmount());host.remove();
});

test('leaving the Charter workspace flushes the current flat Charter record through updateProject',async()=>{
  const project={id:'oe-project-charter-flush',name:'OE Project',methodology:'lean-six-sigma',charter:fullCharterFixture,documents:{},sharedFields:{}};
  const{host,root}=await renderCharter(project);
  mockUpdateProject.mockClear();
  await act(async()=>root.unmount());host.remove();
  const charterWrite=mockUpdateProject.mock.calls.find(([,updates])=>updates.charter);
  expect(charterWrite).toBeTruthy();
  expect(charterWrite[0]).toBe(project.id);
  expect(charterWrite[1].charter).toEqual(expect.objectContaining(fullCharterFixture));
  expect(charterWrite[1].charter).toEqual(expect.objectContaining({schemaVersion:expect.any(Number),updatedAt:expect.any(String)}));
  expect(charterWrite[1].charter).not.toHaveProperty('values');
});

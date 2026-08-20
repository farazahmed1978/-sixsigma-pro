import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {ProjectsProvider,useProjects} from './ProjectsContext';
import {resolveProjectSuiteId,lifecycleForProject,lifecycleStageLabels} from '../foundation/lifecycle';

// This jsdom test environment doesn't polyfill crypto.randomUUID (a pre-existing gap, not
// introduced here); createProject() needs it. Scoped to this file only.
if (typeof global.crypto === 'undefined') global.crypto = {};
if (typeof global.crypto.randomUUID !== 'function') {
  let counter = 0;
  global.crypto.randomUUID = () => `test-uuid-${++counter}`;
}

jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:null,profile:null,configured:false})}));

beforeEach(()=>{localStorage.clear()});

// Exposes the live useProjects() value via a getter, not a destructured snapshot, so callers
// always see the post-setState closure (getProject depends on the current projects array).
const withHarness=async run=>{
  let current;
  function Harness(){current=useProjects();return null}
  const host=document.createElement('div'),root=createRoot(host);
  await act(async()=>root.render(<ProjectsProvider><Harness/></ProjectsProvider>));
  await run(()=>current);
  await act(async()=>root.unmount());host.remove();
};

test('createProject with the Project Management suite selected resolves to project-management, not the OE default',async()=>{
  await withHarness(async get=>{
    let id;
    await act(async()=>{id=get().createProject({name:'PM Onboarding Project',suiteId:'project-management',methodology:'pmp'})});
    const project=get().getProject(id);
    expect(resolveProjectSuiteId(project)).toBe('project-management');
    expect(lifecycleForProject(project).id).toBe('project-management');
    expect(lifecycleStageLabels(lifecycleForProject(project))).toEqual(['Initiation','Planning','Execution','Monitoring & Controlling','Closing']);
    expect(project.currentPhase).toBe('Initiation');
  });
});

test('createProject with the Operational Excellence suite selected still resolves to operational-excellence (regression)',async()=>{
  await withHarness(async get=>{
    let id;
    await act(async()=>{id=get().createProject({name:'OE Project',suiteId:'operational-excellence',methodology:'lean-six-sigma'})});
    const project=get().getProject(id);
    expect(resolveProjectSuiteId(project)).toBe('operational-excellence');
    expect(project.currentPhase).toBe('Define');
  });
});

test('createProject with no suite/methodology data at all still defaults to operational-excellence (unchanged legacy behavior)',async()=>{
  await withHarness(async get=>{
    let id;
    await act(async()=>{id=get().createProject({name:'Legacy call site'})});
    const project=get().getProject(id);
    expect(resolveProjectSuiteId(project)).toBe('operational-excellence');
  });
});

test('createProject persists targetDate and creationPath (Phase 5A: targetDate was previously dropped at the top level regardless of input)',async()=>{
  await withHarness(async get=>{
    let id;
    await act(async()=>{id=get().createProject({name:'Guided Project',suiteId:'project-management',methodology:'pmp',targetDate:'2026-09-01',creationPath:'guided-project'})});
    const project=get().getProject(id);
    expect(project.targetDate).toBe('2026-09-01');
    expect(project.creationPath).toBe('guided-project');
  });
});

test('createProject with no targetDate/creationPath supplied still defaults sanely (regression)',async()=>{
  await withHarness(async get=>{
    let id;
    await act(async()=>{id=get().createProject({name:'No Extras'})});
    const project=get().getProject(id);
    expect(project.targetDate).toBe('');
    expect(project.creationPath).toBeNull();
    expect(project.guidedFlowState).toBeNull();
  });
});

test('createProject persists guidedFlowState when supplied (Phase 5B)',async()=>{
  await withHarness(async get=>{
    let id;
    const guidedFlowState={isGuided:true,mandatoryComplete:false,completedMandatoryDocs:[],currentMandatoryStep:0,enteredAt:'2026-08-19T00:00:00.000Z'};
    await act(async()=>{id=get().createProject({name:'Guided Project',suiteId:'operational-excellence',creationPath:'guided-project',guidedFlowState})});
    const project=get().getProject(id);
    expect(project.guidedFlowState).toEqual(guidedFlowState);
  });
});

import React from 'react';
import {act,Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import ProjectsHome from './ProjectsHome';

const mockCreateProject=jest.fn(()=>'new-project-id');
jest.mock('../context/ProjectsContext',()=>({useProjects:()=>({projects:[],createProject:mockCreateProject,deleteProject:jest.fn(),deletingProjectId:''})}));
jest.mock('../context/InteractionContext',()=>({useInteractions:()=>({confirm:jest.fn(),toast:jest.fn()})}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:'user-1'},profile:{default_organization_id:'org-1',full_name:'Jamie Rivera'}})}));
jest.mock('../context/EntitlementContext',()=>({useEntitlements:()=>({canAccess:()=>true})}));

const render=async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter><ProjectsHome/></MemoryRouter>));
  return{host,root};
};
const change=(control,value)=>act(()=>Simulate.change(control,{target:{value}}));

// CRA's Jest config runs with resetMocks:true, which wipes a mock's implementation (not just its
// call history) before every test — jest.fn(()=>'new-project-id')'s initial implementation does
// not survive past the first test, so it must be re-established here every time.
beforeEach(()=>{mockCreateProject.mockImplementation(()=>'new-project-id')});

// "+ New Project" now opens the guided NewProjectEntry overlay (Phase 5A) instead of the inline
// form directly — these tests reach the original inline form via its "Switch to advanced setup"
// escape hatch, confirming the pre-existing form still works unchanged.
const openAdvancedForm=async host=>{
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='+ New Project').click());
  await act(async()=>host.querySelector('.npe-advanced-link').click());
};

test('the new-project form defaults the suite selector to Operational Excellence',async()=>{
  const{host,root}=await render();
  await openAdvancedForm(host);
  const select=[...host.querySelectorAll('select')].find(node=>[...node.options].some(option=>option.value==='project-management'));
  expect(select.value).toBe('operational-excellence');
  await act(async()=>root.unmount());host.remove();
});

test('selecting Project Management and creating a project passes suiteId and a matching methodology through',async()=>{
  const{host,root}=await render();
  await openAdvancedForm(host);
  change(host.querySelector('input[placeholder*="Reduce Customer"]'),'PM Rollout');
  const select=[...host.querySelectorAll('select')].find(node=>[...node.options].some(option=>option.value==='project-management'));
  change(select,'project-management');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Create Project').click());
  expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({name:'PM Rollout',suiteId:'project-management',methodology:'pmp'}));
  await act(async()=>root.unmount());host.remove();
});

test('leaving the suite selector on Operational Excellence still creates an OE project (regression)',async()=>{
  const{host,root}=await render();
  await openAdvancedForm(host);
  change(host.querySelector('input[placeholder*="Reduce Customer"]'),'OE Improvement');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Create Project').click());
  expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({name:'OE Improvement',suiteId:'operational-excellence',methodology:'lean-six-sigma'}));
  await act(async()=>root.unmount());host.remove();
});

test('"+ New Project" opens the guided entry card with all three paths',async()=>{
  const{host,root}=await render();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='+ New Project').click());
  expect(host.textContent).toContain('what are we building today?');
  expect(host.querySelectorAll('.npe-path-card')).toHaveLength(3);
  await act(async()=>root.unmount());host.remove();
});

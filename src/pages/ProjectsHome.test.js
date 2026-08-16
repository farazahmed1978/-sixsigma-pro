import React from 'react';
import {act,Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import ProjectsHome from './ProjectsHome';

const mockCreateProject=jest.fn(()=>'new-project-id');
jest.mock('../context/ProjectsContext',()=>({useProjects:()=>({projects:[],createProject:mockCreateProject,deleteProject:jest.fn(),deletingProjectId:''})}));
jest.mock('../context/InteractionContext',()=>({useInteractions:()=>({confirm:jest.fn(),toast:jest.fn()})}));

const render=async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter><ProjectsHome/></MemoryRouter>));
  return{host,root};
};
const change=(control,value)=>act(()=>Simulate.change(control,{target:{value}}));

beforeEach(()=>{mockCreateProject.mockClear()});

test('the new-project form defaults the suite selector to Operational Excellence',async()=>{
  const{host,root}=await render();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='+ New Project').click());
  const select=[...host.querySelectorAll('select')].find(node=>[...node.options].some(option=>option.value==='project-management'));
  expect(select.value).toBe('operational-excellence');
  await act(async()=>root.unmount());host.remove();
});

test('selecting Project Management and creating a project passes suiteId and a matching methodology through',async()=>{
  const{host,root}=await render();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='+ New Project').click());
  change(host.querySelector('input[placeholder*="Reduce Customer"]'),'PM Rollout');
  const select=[...host.querySelectorAll('select')].find(node=>[...node.options].some(option=>option.value==='project-management'));
  change(select,'project-management');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Create Project').click());
  expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({name:'PM Rollout',suiteId:'project-management',methodology:'pmp'}));
  await act(async()=>root.unmount());host.remove();
});

test('leaving the suite selector on Operational Excellence still creates an OE project (regression)',async()=>{
  const{host,root}=await render();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='+ New Project').click());
  change(host.querySelector('input[placeholder*="Reduce Customer"]'),'OE Improvement');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Create Project').click());
  expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({name:'OE Improvement',suiteId:'operational-excellence',methodology:'lean-six-sigma'}));
  await act(async()=>root.unmount());host.remove();
});

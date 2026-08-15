import React from 'react';
import {act,Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import ProjectActions,{isActionOverdue} from './ProjectActions';
import {pmRepository} from '../repositories/pmRepository';

jest.mock('../repositories/pmRepository',()=>({pmRepository:{actions:{list:jest.fn(),create:jest.fn(),update:jest.fn(),remove:jest.fn()}}}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:'user-1'},profile:{default_organization_id:'org-1'}})}));
const mockConfirm=jest.fn(),mockToast=jest.fn();
jest.mock('../context/InteractionContext',()=>({useInteractions:()=>({confirm:mockConfirm,toast:mockToast})}));

const project={id:'project-1',organizationId:'org-1',methodology:'pmp',currentPhase:'Execution'};
const row={id:'action-1',project_id:'project-1',organization_id:'org-1',created_by:'user-1',title:'Confirm vendor',priority:'High',status:'In Progress',version:4,content:{description:'Confirm delivery capacity.',owner:'A. Owner',due_date:'2025-01-10'}};
const flush=()=>act(async()=>{await Promise.resolve();await Promise.resolve()});
const change=(control,value)=>act(()=>Simulate.change(control,{target:{value}}));

beforeEach(()=>{jest.clearAllMocks();pmRepository.actions.list.mockResolvedValue([]);mockConfirm.mockResolvedValue(true)});

test('detects overdue actions but excludes completed work',()=>{
  expect(isActionOverdue(row,new Date('2025-01-12T12:00:00'))).toBe(true);
  expect(isActionOverdue({...row,status:'Complete'},new Date('2025-01-12T12:00:00'))).toBe(false);
});

test('shows a clear empty state for a project with no actions',async()=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectActions project={project}/>));await flush();
  expect(pmRepository.actions.list).toHaveBeenCalledWith('project-1');
  expect(host.textContent).toContain('No action items yet');
  await act(async()=>root.unmount());host.remove();
});

test('creates, edits with the repository version, and deletes a project action',async()=>{
  pmRepository.actions.create.mockResolvedValue(row);
  pmRepository.actions.update.mockResolvedValue({...row,title:'Confirm vendor capacity',version:5});
  pmRepository.actions.remove.mockResolvedValue(undefined);
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectActions project={project}/>));await flush();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent.includes('Add Action')).click());
  change(host.querySelector('input[required]'),'Confirm vendor');
  change(host.querySelectorAll('input')[1],'A. Owner');
  change(host.querySelector('textarea'),'Confirm delivery capacity.');
  change(host.querySelector('input[type="date"]'),'2025-01-10');
  const selects=host.querySelectorAll('select');change(selects[0],'High');change(selects[1],'In Progress');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  const createPayload=pmRepository.actions.create.mock.calls[0][0];
  expect(createPayload).toEqual(expect.objectContaining({project_id:'project-1',title:'Confirm vendor',priority:'High',status:'In Progress',content:{description:'Confirm delivery capacity.',owner:'A. Owner',due_date:'2025-01-10'}}));
  expect(JSON.stringify(createPayload)).not.toContain('item_type');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit').click());
  change(host.querySelector('input[required]'),'Confirm vendor capacity');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  const updatePayload=pmRepository.actions.update.mock.calls[0][0];
  expect(updatePayload).toEqual(expect.objectContaining({id:'action-1',version:4,title:'Confirm vendor capacity'}));
  expect(updatePayload).not.toHaveProperty('created_by');
  expect(JSON.stringify(updatePayload)).not.toContain('item_type');
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Delete').click();await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.actions.remove).toHaveBeenCalledWith('action-1');
  expect(host.textContent).toContain('No action items yet');
  await act(async()=>root.unmount());host.remove();
});

test('turns optimistic concurrency and missing-action failures into useful messages',async()=>{
  pmRepository.actions.list.mockResolvedValue([row]);
  pmRepository.actions.update.mockRejectedValue(new Error('pm-update-conflict: stale record'));
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectActions project={project}/>));await flush();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit').click());
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(host.querySelector('[role="alert"]').textContent).toContain('changed since you opened it');
  pmRepository.actions.remove.mockRejectedValue(new Error('pm-actions-not-found'));
  await act(async()=>host.querySelector('[aria-label="Close action editor"]').click());
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Delete').click();await Promise.resolve();await Promise.resolve()});
  expect(host.querySelector('[role="alert"]').textContent).toContain('no longer exists');
  await act(async()=>root.unmount());host.remove();
});

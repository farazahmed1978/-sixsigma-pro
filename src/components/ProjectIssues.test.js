import React from 'react';
import {act,Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import ProjectIssues,{isIssueOverdue} from './ProjectIssues';
import {pmRepository} from '../repositories/pmRepository';

jest.mock('../repositories/pmRepository',()=>({pmRepository:{issues:{list:jest.fn(),create:jest.fn(),update:jest.fn(),remove:jest.fn()}}}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:'user-1'},profile:{default_organization_id:'org-1'}})}));
const mockConfirm=jest.fn(),mockToast=jest.fn();
jest.mock('../context/InteractionContext',()=>({useInteractions:()=>({confirm:mockConfirm,toast:mockToast})}));

const project={id:'project-1',organizationId:'org-1',methodology:'pmp',currentPhase:'Execution'};
const row={id:'issue-1',project_id:'project-1',organization_id:'org-1',created_by:'user-1',title:'Vendor defect',priority:'Critical',status:'Open',version:3,content:{description:'Incoming parts fail inspection.',owner:'A. Owner',date_identified:'2025-01-02',target_resolution_date:'2025-01-10',resolution:'Issue supplier corrective action.'}};
const flush=()=>act(async()=>{await Promise.resolve();await Promise.resolve()});
const change=(control,value)=>act(()=>Simulate.change(control,{target:{value}}));

beforeEach(()=>{jest.clearAllMocks();pmRepository.issues.list.mockResolvedValue([]);mockConfirm.mockResolvedValue(true)});

test('detects overdue unresolved issues but excludes resolved and closed issues',()=>{
  expect(isIssueOverdue(row,new Date('2025-01-12T12:00:00'))).toBe(true);
  expect(isIssueOverdue({...row,status:'Resolved'},new Date('2025-01-12T12:00:00'))).toBe(false);
  expect(isIssueOverdue({...row,status:'Closed'},new Date('2025-01-12T12:00:00'))).toBe(false);
});

test('shows project-scoped loading and empty states',async()=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectIssues project={project}/>));await flush();
  expect(pmRepository.issues.list).toHaveBeenCalledWith('project-1');
  expect(host.textContent).toContain('No project issues yet');
  await act(async()=>root.unmount());host.remove();
});

test('creates, edits with the repository version, and deletes a project issue',async()=>{
  pmRepository.issues.create.mockResolvedValue(row);
  pmRepository.issues.update.mockResolvedValue({...row,title:'Vendor defect contained',version:4});
  pmRepository.issues.remove.mockResolvedValue(undefined);
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectIssues project={project}/>));await flush();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent.includes('Add Issue')).click());
  change(host.querySelector('input[required]'),'Vendor defect');
  change(host.querySelectorAll('input')[1],'A. Owner');
  change(host.querySelector('textarea'),'Incoming parts fail inspection.');
  const selects=host.querySelectorAll('select');change(selects[0],'Critical');change(selects[1],'Open');
  const dates=host.querySelectorAll('input[type="date"]');change(dates[0],'2025-01-02');change(dates[1],'2025-01-10');
  change(host.querySelectorAll('textarea')[1],'Issue supplier corrective action.');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.issues.create).toHaveBeenCalledWith(expect.objectContaining({project_id:'project-1',title:'Vendor defect',priority:'Critical',status:'Open',content:{description:'Incoming parts fail inspection.',owner:'A. Owner',date_identified:'2025-01-02',target_resolution_date:'2025-01-10',resolution:'Issue supplier corrective action.'}}));
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit').click());
  change(host.querySelector('input[required]'),'Vendor defect contained');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.issues.update).toHaveBeenCalledWith(expect.objectContaining({id:'issue-1',version:3,title:'Vendor defect contained'}));
  expect(pmRepository.issues.update.mock.calls[0][0]).not.toHaveProperty('created_by');
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Delete').click();await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.issues.remove).toHaveBeenCalledWith('issue-1');
  expect(host.textContent).toContain('No project issues yet');
  await act(async()=>root.unmount());host.remove();
});

test('shows friendly conflict errors and supports retry after loading errors',async()=>{
  pmRepository.issues.list.mockResolvedValueOnce([row]);
  pmRepository.issues.update.mockRejectedValue(new Error('pm-update-conflict: stale record'));
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectIssues project={project}/>));await flush();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit').click());
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(host.querySelector('[role="alert"]').textContent).toContain('changed since you opened it');
  pmRepository.issues.list.mockResolvedValueOnce([]);
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Reload Issues').click();await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.issues.list).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain('No project issues yet');
  await act(async()=>root.unmount());host.remove();
});

import React from 'react';
import {act,Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import ProjectApprovals,{isApprovalOverdue} from './ProjectApprovals';
import {pmRepository} from '../repositories/pmRepository';

jest.mock('../repositories/pmRepository',()=>({pmRepository:{approvals:{list:jest.fn(),create:jest.fn(),update:jest.fn(),remove:jest.fn()}}}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:'user-1'},profile:{default_organization_id:'org-1'}})}));
const mockConfirm=jest.fn(),mockToast=jest.fn();
jest.mock('../context/InteractionContext',()=>({useInteractions:()=>({confirm:mockConfirm,toast:mockToast})}));

const project={id:'project-1',organizationId:'org-1',methodology:'pmp',currentPhase:'Planning'};
const row={id:'approval-1',project_id:'project-1',organization_id:'org-1',created_by:'user-1',title:'Scope change: add module',priority:'High',status:'Pending',version:2,content:{description:'Requesting approval to add a reporting module to scope.',approver:'A. Sponsor',due_date:'2025-01-10',decision_notes:''}};
const flush=()=>act(async()=>{await Promise.resolve();await Promise.resolve()});
const change=(control,value)=>act(()=>Simulate.change(control,{target:{value}}));

beforeEach(()=>{jest.clearAllMocks();pmRepository.approvals.list.mockResolvedValue([]);mockConfirm.mockResolvedValue(true)});

test('detects overdue pending approvals but excludes decided or withdrawn requests',()=>{
  expect(isApprovalOverdue(row,new Date('2025-01-12T12:00:00'))).toBe(true);
  expect(isApprovalOverdue({...row,status:'Approved'},new Date('2025-01-12T12:00:00'))).toBe(false);
  expect(isApprovalOverdue({...row,status:'Rejected'},new Date('2025-01-12T12:00:00'))).toBe(false);
  expect(isApprovalOverdue({...row,status:'Withdrawn'},new Date('2025-01-12T12:00:00'))).toBe(false);
});

test('shows project-scoped loading and empty states',async()=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectApprovals project={project}/>));await flush();
  expect(pmRepository.approvals.list).toHaveBeenCalledWith('project-1');
  expect(host.textContent).toContain('No project approvals yet');
  await act(async()=>root.unmount());host.remove();
});

test('creates, edits with the repository version, and deletes a project approval',async()=>{
  pmRepository.approvals.create.mockResolvedValue(row);
  pmRepository.approvals.update.mockResolvedValue({...row,title:'Scope change: add module (revised)',version:3});
  pmRepository.approvals.remove.mockResolvedValue(undefined);
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectApprovals project={project}/>));await flush();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent.includes('Add Approval')).click());
  change(host.querySelector('input[required]'),'Scope change: add module');
  change(host.querySelectorAll('input')[1],'A. Sponsor');
  change(host.querySelector('textarea'),'Requesting approval to add a reporting module to scope.');
  change(host.querySelector('input[type="date"]'),'2025-01-10');
  const selects=host.querySelectorAll('select');change(selects[0],'High');change(selects[1],'Pending');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.approvals.create).toHaveBeenCalledWith(expect.objectContaining({project_id:'project-1',title:'Scope change: add module',priority:'High',status:'Pending',content:{description:'Requesting approval to add a reporting module to scope.',approver:'A. Sponsor',due_date:'2025-01-10',decision_notes:''}}));
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit').click());
  change(host.querySelector('input[required]'),'Scope change: add module (revised)');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.approvals.update).toHaveBeenCalledWith(expect.objectContaining({id:'approval-1',version:2,title:'Scope change: add module (revised)'}));
  expect(pmRepository.approvals.update.mock.calls[0][0]).not.toHaveProperty('created_by');
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Delete').click();await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.approvals.remove).toHaveBeenCalledWith('approval-1');
  expect(host.textContent).toContain('No project approvals yet');
  await act(async()=>root.unmount());host.remove();
});

test('quick-approves a pending request and hides the approve/reject actions once decided',async()=>{
  pmRepository.approvals.list.mockResolvedValueOnce([row]);
  pmRepository.approvals.update.mockResolvedValue({...row,status:'Approved',content:{...row.content},version:3});
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectApprovals project={project}/>));await flush();
  expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Approve')).toBe(true);
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Approve').click();await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.approvals.update).toHaveBeenCalledWith(expect.objectContaining({id:'approval-1',status:'Approved'}));
  expect(pmRepository.approvals.update.mock.calls[0][0]).not.toHaveProperty('created_by');
  expect(host.querySelector('.pm-approval-status').textContent).toBe('Approved');
  expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Approve'||button.textContent==='Reject')).toBe(false);
  await act(async()=>root.unmount());host.remove();
});

test('rejects a pending request with a destructive confirmation',async()=>{
  pmRepository.approvals.list.mockResolvedValueOnce([row]);
  pmRepository.approvals.update.mockResolvedValue({...row,status:'Rejected',version:3});
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectApprovals project={project}/>));await flush();
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Reject').click();await Promise.resolve();await Promise.resolve()});
  expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({confirmLabel:'Rejected',destructive:true}));
  expect(pmRepository.approvals.update).toHaveBeenCalledWith(expect.objectContaining({id:'approval-1',status:'Rejected'}));
  await act(async()=>root.unmount());host.remove();
});

test('shows friendly conflict errors and supports retry after loading errors',async()=>{
  pmRepository.approvals.list.mockResolvedValueOnce([row]);
  pmRepository.approvals.update.mockRejectedValue(new Error('pm-update-conflict: stale record'));
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectApprovals project={project}/>));await flush();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit').click());
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(host.querySelector('[role="alert"]').textContent).toContain('changed since you opened it');
  pmRepository.approvals.list.mockResolvedValueOnce([]);
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Reload Approvals').click();await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.approvals.list).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain('No project approvals yet');
  await act(async()=>root.unmount());host.remove();
});

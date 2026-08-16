import React from 'react';
import {act,Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import ProjectDecisions,{isDecisionOverdue} from './ProjectDecisions';
import {pmRepository} from '../repositories/pmRepository';

jest.mock('../repositories/pmRepository',()=>({pmRepository:{decisions:{list:jest.fn(),create:jest.fn(),update:jest.fn(),remove:jest.fn()}}}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:'user-1'},profile:{default_organization_id:'org-1'}})}));
const mockConfirm=jest.fn(),mockToast=jest.fn();
jest.mock('../context/InteractionContext',()=>({useInteractions:()=>({confirm:mockConfirm,toast:mockToast})}));

const project={id:'project-1',organizationId:'org-1',methodology:'pmp',currentPhase:'Execution'};
const row={id:'decision-1',project_id:'project-1',organization_id:'org-1',created_by:'user-1',title:'Adopt vendor B',priority:'High',status:'Proposed',version:3,content:{description:'Choose between vendor A and vendor B for the fabrication contract.',decision_maker:'A. Owner',date_raised:'2025-01-02',target_decision_date:'2025-01-10',decision:''}};
const flush=()=>act(async()=>{await Promise.resolve();await Promise.resolve()});
const change=(control,value)=>act(()=>Simulate.change(control,{target:{value}}));

beforeEach(()=>{jest.clearAllMocks();pmRepository.decisions.list.mockResolvedValue([]);mockConfirm.mockResolvedValue(true)});

test('detects overdue undecided decisions but excludes decided, deferred, and superseded decisions',()=>{
  expect(isDecisionOverdue(row,new Date('2025-01-12T12:00:00'))).toBe(true);
  expect(isDecisionOverdue({...row,status:'Decided'},new Date('2025-01-12T12:00:00'))).toBe(false);
  expect(isDecisionOverdue({...row,status:'Deferred'},new Date('2025-01-12T12:00:00'))).toBe(false);
  expect(isDecisionOverdue({...row,status:'Superseded'},new Date('2025-01-12T12:00:00'))).toBe(false);
});

test('shows project-scoped loading and empty states',async()=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectDecisions project={project}/>));await flush();
  expect(pmRepository.decisions.list).toHaveBeenCalledWith('project-1');
  expect(host.textContent).toContain('No project decisions yet');
  await act(async()=>root.unmount());host.remove();
});

test('creates, edits with the repository version, and deletes a project decision',async()=>{
  pmRepository.decisions.create.mockResolvedValue(row);
  pmRepository.decisions.update.mockResolvedValue({...row,title:'Adopt vendor B (confirmed)',status:'Decided',version:4});
  pmRepository.decisions.remove.mockResolvedValue(undefined);
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectDecisions project={project}/>));await flush();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent.includes('Add Decision')).click());
  change(host.querySelector('input[required]'),'Adopt vendor B');
  change(host.querySelectorAll('input')[1],'A. Owner');
  change(host.querySelector('textarea'),'Choose between vendor A and vendor B for the fabrication contract.');
  const selects=host.querySelectorAll('select');change(selects[0],'High');change(selects[1],'Proposed');
  const dates=host.querySelectorAll('input[type="date"]');change(dates[0],'2025-01-02');change(dates[1],'2025-01-10');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.decisions.create).toHaveBeenCalledWith(expect.objectContaining({project_id:'project-1',title:'Adopt vendor B',priority:'High',status:'Proposed',content:{description:'Choose between vendor A and vendor B for the fabrication contract.',decision_maker:'A. Owner',date_raised:'2025-01-02',target_decision_date:'2025-01-10',decision:''}}));
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit').click());
  change(host.querySelector('input[required]'),'Adopt vendor B (confirmed)');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.decisions.update).toHaveBeenCalledWith(expect.objectContaining({id:'decision-1',version:3,title:'Adopt vendor B (confirmed)'}));
  expect(pmRepository.decisions.update.mock.calls[0][0]).not.toHaveProperty('created_by');
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Delete').click();await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.decisions.remove).toHaveBeenCalledWith('decision-1');
  expect(host.textContent).toContain('No project decisions yet');
  await act(async()=>root.unmount());host.remove();
});

test('shows friendly conflict errors and supports retry after loading errors',async()=>{
  pmRepository.decisions.list.mockResolvedValueOnce([row]);
  pmRepository.decisions.update.mockRejectedValue(new Error('pm-update-conflict: stale record'));
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectDecisions project={project}/>));await flush();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit').click());
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(host.querySelector('[role="alert"]').textContent).toContain('changed since you opened it');
  pmRepository.decisions.list.mockResolvedValueOnce([]);
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Reload Decisions').click();await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.decisions.list).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain('No project decisions yet');
  await act(async()=>root.unmount());host.remove();
});

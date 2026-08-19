import React from 'react';
import {act,Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import ProjectRisks from './ProjectRisks';
import {pmRepository} from '../repositories/pmRepository';
import {assetRepository} from '../repositories/assetRepository';

jest.mock('../repositories/pmRepository',()=>({pmRepository:{risks:{list:jest.fn(),create:jest.fn(),update:jest.fn(),remove:jest.fn()}}}));
jest.mock('../repositories/assetRepository',()=>({assetRepository:{list:jest.fn().mockResolvedValue([]),create:jest.fn(),uploadFile:jest.fn(),getSignedUrl:jest.fn()}}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{id:'user-1'},profile:{default_organization_id:'org-1'}})}));
const mockConfirm=jest.fn(),mockToast=jest.fn();
jest.mock('../context/InteractionContext',()=>({useInteractions:()=>({confirm:mockConfirm,toast:mockToast})}));

const project={id:'project-1',organizationId:'org-1',methodology:'pmp',currentPhase:'Planning'};
const row={id:'risk-1',project_id:'project-1',organization_id:'org-1',created_by:'user-1',title:'Supplier delay',status:'Open',version:1,content:{description:'Critical material may arrive late.',probability:'High',impact:'High',owner:'A. Owner',mitigation:'Qualify a second supplier.'}};
const flush=()=>act(async()=>{await Promise.resolve();await Promise.resolve()});
const change=(control,value)=>act(()=>Simulate.change(control,{target:{value}}));

beforeEach(()=>{jest.clearAllMocks();pmRepository.risks.list.mockResolvedValue([]);assetRepository.list.mockResolvedValue([]);mockConfirm.mockResolvedValue(true)});

test('shows a clear empty state for a project with no risks',async()=>{
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectRisks project={project}/>));await flush();
  expect(pmRepository.risks.list).toHaveBeenCalledWith('project-1');
  expect(host.textContent).toContain('No project risks yet');
  await act(async()=>root.unmount());host.remove();
});

test('creates, edits, and deletes a project-scoped risk through the PM repository',async()=>{
  pmRepository.risks.create.mockResolvedValue(row);
  pmRepository.risks.update.mockResolvedValue({...row,title:'Supplier delay updated',version:2});
  pmRepository.risks.remove.mockResolvedValue(undefined);
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectRisks project={project}/>));await flush();
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent.includes('Add Risk')).click());
  change(host.querySelector('input[required]'),'Supplier delay');
  change(host.querySelector('textarea'),'Critical material may arrive late.');
  const selects=host.querySelectorAll('select');change(selects[0],'High');change(selects[1],'High');
  change(host.querySelectorAll('input')[1],'A. Owner');
  change(host.querySelectorAll('textarea')[1],'Qualify a second supplier.');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.risks.create).toHaveBeenCalledWith(expect.objectContaining({project_id:'project-1',organization_id:'org-1',created_by:'user-1',title:'Supplier delay',content:expect.objectContaining({probability:'High',impact:'High',owner:'A. Owner',mitigation:'Qualify a second supplier.'})}));
  expect(host.textContent).toContain('Supplier delay');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Edit').click());
  change(host.querySelector('input[required]'),'Supplier delay updated');
  await act(async()=>{Simulate.submit(host.querySelector('form'));await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.risks.update).toHaveBeenCalledWith(expect.objectContaining({id:'risk-1',title:'Supplier delay updated',version:1}));
  expect(pmRepository.risks.update.mock.calls[0][0]).not.toHaveProperty('created_by');
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Delete').click();await Promise.resolve();await Promise.resolve()});
  expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({confirmLabel:'Delete Risk',destructive:true}));
  expect(pmRepository.risks.remove).toHaveBeenCalledWith('risk-1');
  expect(host.textContent).toContain('No project risks yet');
  await act(async()=>root.unmount());host.remove();
});

test('Phase 4: each risk gets a paperclip "Attach" action that opens the upload modal pre-linked to that risk',async()=>{
  pmRepository.risks.list.mockResolvedValue([row]);
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectRisks project={project}/>));await flush();
  expect(host.querySelector('.asset-upload-modal')).toBeNull();
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent.includes('Attach')).click();});
  const modal=host.querySelector('.asset-upload-modal');
  expect(modal).toBeTruthy();
  expect(modal.textContent).toContain('Step 1 of 3');
  await act(async()=>root.unmount());host.remove();
});

test('surfaces repository loading failures with a retry action',async()=>{
  pmRepository.risks.list.mockRejectedValueOnce(new Error('Risk service unavailable')).mockResolvedValueOnce([]);
  const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
  await act(async()=>root.render(<ProjectRisks project={project}/>));await flush();
  expect(host.querySelector('[role="alert"]').textContent).toContain('Risk service unavailable');
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Retry').click();await Promise.resolve();await Promise.resolve()});
  expect(pmRepository.risks.list).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain('No project risks yet');
  await act(async()=>root.unmount());host.remove();
});

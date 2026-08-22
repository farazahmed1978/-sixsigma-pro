import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import ProjectTollgates from './ProjectTollgates';
import {TOLLGATE_STATUSES,TOLLGATE_TYPE} from '../foundation/tollgate';
import {tollgateRepository} from '../repositories/tollgateRepository';

let mockUser;
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:mockUser,profile:{default_organization_id:'org-faraz'}})}));
jest.mock('../context/InteractionContext',()=>({useInteractions:()=>({toast:jest.fn()})}));
jest.mock('../context/ReportContext',()=>({useReport:()=>({addReportItem:jest.fn()})}));
jest.mock('../repositories/tollgateRepository',()=>({tollgateRepository:{list:jest.fn(),organizationRole:jest.fn(),update:jest.fn(),create:jest.fn()}}));

const project={id:'test55',name:'Test55',organizationId:'org-faraz',currentPhase:'Define',team:[{name:'Creed Bratton',role:'QA',email:'creed@aureqin.test'}]};
const attempt={id:'gate-1',project_id:'test55',organization_id:'org-faraz',created_by:'faraz-id',status:TOLLGATE_STATUSES.SUBMITTED,lifecycle_phase:'Define',version:1,content:{item_type:TOLLGATE_TYPE,phase:'Define',attempt:1,submittedBy:'faraz-id',submittedByName:'Faraz Ahmed',submittedAt:'2026-08-21T10:00:00Z',assignedReviewerId:'',assignedReviewerEmail:'creed@aureqin.test',assignedReviewerName:'Creed Bratton · QA',events:[]}};

beforeAll(()=>{if(!global.crypto)global.crypto={};if(!global.crypto.randomUUID)global.crypto.randomUUID=jest.fn(()=>'event-1')});

async function renderGate(user=mockUser){mockUser=user;tollgateRepository.list.mockResolvedValue([attempt]);tollgateRepository.organizationRole.mockResolvedValue('');const onReviewsChange=jest.fn(),updateProject=jest.fn().mockResolvedValue({});const host=document.createElement('div'),root=createRoot(host);document.body.append(host);await act(async()=>root.render(<MemoryRouter><ProjectTollgates project={project} reviews={[attempt]} onReviewsChange={onReviewsChange} updateProject={updateProject} onOpenBinder={jest.fn()} requestedPhase="Define" requestedAttempt="1"/></MemoryRouter>));await act(async()=>Promise.resolve());return{host,root,onReviewsChange,updateProject};}

afterEach(()=>jest.clearAllMocks());

test('cross-account assigned identity renders reviewer controls and persists approval',async()=>{
  const creed={id:'creed-id',identities:[{identity_data:{email:'CREED@AUREQIN.TEST'}}],user_metadata:{full_name:'Creed Bratton'}};
  tollgateRepository.update.mockImplementation(async row=>({...row,status:TOLLGATE_STATUSES.APPROVED}));
  const{host,root,onReviewsChange,updateProject}=await renderGate(creed);
  expect(host.textContent).toContain('Reviewer workspace');
  expect(host.textContent).toContain('Start Review');
  expect(host.textContent).toContain('Approve');
  expect(host.textContent).not.toContain('Submit Phase');
  const approve=[...host.querySelectorAll('button')].find(button=>button.textContent==='Approve');
  await act(async()=>approve.click());
  expect(tollgateRepository.update).toHaveBeenCalledWith(expect.objectContaining({id:'gate-1',status:TOLLGATE_STATUSES.APPROVED}));
  expect(onReviewsChange).toHaveBeenCalledWith([expect.objectContaining({status:TOLLGATE_STATUSES.APPROVED})]);
  expect(updateProject).toHaveBeenCalledWith('test55',expect.objectContaining({currentPhase:'Measure'}));
  await act(async()=>root.unmount());host.remove();
});

test.each([
  ['submitter',{id:'faraz-id',email:'faraz@aureqin.test'}],
  ['unrelated user',{id:'stranger-id',email:'stranger@aureqin.test'}],
])('%s cannot see or invoke review decisions',async(_label,user)=>{const{host,root}=await renderGate(user);expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Approve')).toBe(false);expect(host.textContent).toContain('Decision controls are limited');await act(async()=>root.unmount());host.remove();});

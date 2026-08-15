jest.mock('./cloudRepository',()=>({cloudRepository:{list:jest.fn(),get:jest.fn(),upsert:jest.fn(),remove:jest.fn()}}));
jest.mock('../lib/supabase',()=>({supabase:{auth:{getUser:jest.fn()},from:jest.fn()}}));

import {cloudRepository} from './cloudRepository';
import {supabase} from '../lib/supabase';
import {pmRepository,PM_SUITE_IDENTIFIER} from './pmRepository';

const mockAuthGetUser=supabase.auth.getUser;
const mockFrom=supabase.from;

const TABLES=['tasks','risks','issues','decisions','approvals','activities'];
const scope={organization_id:'11111111-1111-1111-1111-111111111111',project_id:'22222222-2222-2222-2222-222222222222',created_by:'33333333-3333-3333-3333-333333333333'};

const buildChain=()=>{
 const chain={};
 ['select','eq','insert','update'].forEach(method=>{chain[method]=jest.fn(()=>chain)});
 chain.maybeSingle=jest.fn();
 chain.single=jest.fn();
 return chain;
};

let projectsChain,opChain;

beforeEach(()=>{
 jest.clearAllMocks();
 projectsChain=buildChain();
 opChain=buildChain();
 mockFrom.mockImplementation(table=>table==='projects'?projectsChain:opChain);
 mockAuthGetUser.mockResolvedValue({data:{user:{id:scope.created_by}}});
 projectsChain.maybeSingle.mockResolvedValue({data:{id:scope.project_id,organization_id:scope.organization_id},error:null});
});

test('the canonical suite identifier is the existing Project Management suite, not an invented value',()=>{
 expect(PM_SUITE_IDENTIFIER).toBe('project-management');
});

describe.each(TABLES)('%s repository',table=>{
 test('create performs a true insert (not an upsert) and enforces the canonical PM suite',async()=>{
  const record={...scope,title:'Example',suite:'platform'};
  opChain.single.mockResolvedValue({data:{...record,suite:PM_SUITE_IDENTIFIER,id:'row-1',version:1},error:null});
  await pmRepository[table].create(record);
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({...scope,suite:PM_SUITE_IDENTIFIER}));
  expect(opChain.update).not.toHaveBeenCalled();
 });

 test('create verifies project ownership before writing, rejecting a project the caller cannot access',async()=>{
  projectsChain.maybeSingle.mockResolvedValue({data:null,error:null});
  await expect(pmRepository[table].create({...scope})).rejects.toThrow('The target project does not exist or is not accessible.');
  expect(opChain.insert).not.toHaveBeenCalled();
 });

 test('create propagates a duplicate-id conflict instead of silently overwriting an existing row',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('duplicate key value violates unique constraint'),{code:'23505'})});
  await expect(pmRepository[table].create({id:'row-1',...scope})).rejects.toThrow('duplicate key value violates unique constraint');
 });

 test('create preserves shared metadata and lifecycle fields supported by the canonical schema',async()=>{
  const record={...scope,title:'Plan kickoff',methodology:'pmp',lifecycle_phase:'Planning',dmaic_phase:null,priority:'high',owner_id:scope.created_by,source_type:'manual',source_id:null,metadata:{tag:'phase1'}};
  opChain.single.mockResolvedValue({data:{...record,suite:PM_SUITE_IDENTIFIER},error:null});
  await pmRepository[table].create(record);
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({methodology:'pmp',lifecycle_phase:'Planning',priority:'high',owner_id:scope.created_by,metadata:{tag:'phase1'}}));
 });

 test('update requires an existing id and refuses to silently create a row',async()=>{
  await expect(pmRepository[table].update({...scope,title:'Renamed'})).rejects.toThrow('pm-update-requires-id');
  expect(opChain.update).not.toHaveBeenCalled();
 });

 test('update re-enforces the canonical PM suite and increments the version',async()=>{
  const record={id:'row-1',...scope,title:'Renamed',suite:'operational-excellence',version:2};
  opChain.single.mockResolvedValue({data:{...record,suite:PM_SUITE_IDENTIFIER,version:3},error:null});
  await pmRepository[table].update(record);
  expect(opChain.update).toHaveBeenCalledWith(expect.objectContaining({id:'row-1',suite:PM_SUITE_IDENTIFIER,version:3}));
  expect(opChain.eq).toHaveBeenCalledWith('id','row-1');
  expect(opChain.eq).toHaveBeenCalledWith('version',2);
 });

 test('update gates the write on the caller-known version and rejects a stale write instead of silently losing it',async()=>{
  opChain.single.mockResolvedValue({data:null,error:{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned'}});
  await expect(pmRepository[table].update({id:'row-1',...scope,version:1})).rejects.toThrow('pm-update-conflict');
 });

 test('update without a known version writes without a stale-write guard',async()=>{
  opChain.single.mockResolvedValue({data:{id:'row-1',...scope,suite:PM_SUITE_IDENTIFIER,version:2},error:null});
  await pmRepository[table].update({id:'row-1',...scope});
  expect(opChain.eq.mock.calls.some(call=>call[0]==='version')).toBe(false);
 });

 test('list scopes reads to the given project and the canonical PM suite',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  await pmRepository[table].list(scope.project_id);
  expect(cloudRepository.list).toHaveBeenCalledWith(table,{project_id:scope.project_id,suite:PM_SUITE_IDENTIFIER});
 });

 test('listOrganization scopes reads to the given organization and the canonical PM suite',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  await pmRepository[table].listOrganization(scope.organization_id);
  expect(cloudRepository.list).toHaveBeenCalledWith(table,{organization_id:scope.organization_id,suite:PM_SUITE_IDENTIFIER});
 });

 test('get delegates directly by id without altering scope',async()=>{
  cloudRepository.get.mockResolvedValue({id:'row-1'});
  await pmRepository[table].get('row-1');
  expect(cloudRepository.get).toHaveBeenCalledWith(table,'row-1');
 });

 test('remove delegates directly by id',async()=>{
  cloudRepository.remove.mockResolvedValue(undefined);
  await pmRepository[table].remove('row-1');
  expect(cloudRepository.remove).toHaveBeenCalledWith(table,'row-1');
 });

 test('propagates persistence failures from the cloud client instead of swallowing them',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('new row violates row-level security policy'),{code:'42501'})});
  await expect(pmRepository[table].create({...scope})).rejects.toThrow('row-level security policy');
 });
});

describe('risks repository — Project Risks module integration shape',()=>{
 test('create accepts the exact payload shape sent by src/components/ProjectRisks.js',async()=>{
  const payload={project_id:scope.project_id,organization_id:scope.organization_id,created_by:scope.created_by,title:'Supplier delay',status:'Open',methodology:'pmp',lifecycle_phase:'Planning',content:{description:'Critical material may arrive late.',probability:'High',impact:'High',owner:'A. Owner',mitigation:'Qualify a second supplier.'}};
  const created={...payload,id:'risk-1',suite:PM_SUITE_IDENTIFIER,version:1};
  opChain.single.mockResolvedValue({data:created,error:null});
  const result=await pmRepository.risks.create(payload);
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({suite:PM_SUITE_IDENTIFIER,content:payload.content}));
  expect(result).toEqual(created);
 });

 test('update succeeds when created_by is stripped from the record, exactly as the risk editor does before saving',async()=>{
  const existing={id:'risk-1',project_id:scope.project_id,organization_id:scope.organization_id,title:'Supplier delay',status:'Open',methodology:'pmp',lifecycle_phase:'Planning',version:1,content:{probability:'High',impact:'High'}};
  expect(existing).not.toHaveProperty('created_by');
  const updated={...existing,title:'Supplier delay updated',version:2,suite:PM_SUITE_IDENTIFIER};
  opChain.single.mockResolvedValue({data:updated,error:null});
  const result=await pmRepository.risks.update(existing);
  expect(opChain.update).toHaveBeenCalledWith(expect.objectContaining({id:'risk-1',version:2}));
  expect(opChain.eq).toHaveBeenCalledWith('version',1);
  expect(result.version).toBe(2);
 });

 test('a concurrent edit rejects the second save with the same conflict the risk editor must surface to the user',async()=>{
  const staleRisk={id:'risk-1',project_id:scope.project_id,organization_id:scope.organization_id,title:'Stale title',status:'Open',version:1,content:{}};
  opChain.single.mockResolvedValue({data:null,error:{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned'}});
  await expect(pmRepository.risks.update(staleRisk)).rejects.toThrow('pm-update-conflict');
 });

 test('list, get, and remove use the risk id and project id exactly as the component calls them',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  cloudRepository.get.mockResolvedValue({id:'risk-1'});
  cloudRepository.remove.mockResolvedValue(undefined);
  await pmRepository.risks.list('project-1');
  await pmRepository.risks.get('risk-1');
  await pmRepository.risks.remove('risk-1');
  expect(cloudRepository.list).toHaveBeenCalledWith('risks',{project_id:'project-1',suite:PM_SUITE_IDENTIFIER});
  expect(cloudRepository.get).toHaveBeenCalledWith('risks','risk-1');
  expect(cloudRepository.remove).toHaveBeenCalledWith('risks','risk-1');
 });
});

describe('actions repository — Action Items module integration shape',()=>{
 test('pmRepository.actions is a distinct interface from pmRepository.tasks, not an alias',()=>{
  expect(pmRepository.actions).not.toBe(pmRepository.tasks);
 });

 test('create persists to the tasks table and stamps the record with the Action Item discriminator',async()=>{
  const payload={project_id:scope.project_id,organization_id:scope.organization_id,created_by:scope.created_by,title:'Send updated schedule',status:'Open',priority:'high',owner_id:scope.created_by,content:{description:'Circulate the revised schedule to stakeholders.',dueDate:'2026-09-01'}};
  const created={...payload,id:'action-1',suite:PM_SUITE_IDENTIFIER,content:{...payload.content,item_type:'action'},version:1};
  opChain.single.mockResolvedValue({data:created,error:null});
  const result=await pmRepository.actions.create(payload);
  expect(mockFrom).toHaveBeenCalledWith('tasks');
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({title:'Send updated schedule',status:'Open',priority:'high',owner_id:scope.created_by,suite:PM_SUITE_IDENTIFIER,content:expect.objectContaining({description:payload.content.description,dueDate:payload.content.dueDate,item_type:'action'})}));
  expect(result).toEqual(created);
 });

 test('create forces the discriminator even if the caller supplies a conflicting content.item_type',async()=>{
  const payload={...scope,title:'Spoofed action',content:{item_type:'task',description:'should still be marked as an action'}};
  opChain.single.mockResolvedValue({data:{...payload,id:'action-2',content:{...payload.content,item_type:'action'}},error:null});
  await pmRepository.actions.create(payload);
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({content:expect.objectContaining({item_type:'action'})}));
 });

 test('list filters on the tasks table for the discriminator, so ordinary Task records are excluded',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  await pmRepository.actions.list(scope.project_id);
  expect(cloudRepository.list).toHaveBeenCalledWith('tasks',{project_id:scope.project_id,suite:PM_SUITE_IDENTIFIER,'content->>item_type':'action'});
 });

 test('listOrganization filters on the tasks table for the discriminator',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  await pmRepository.actions.listOrganization(scope.organization_id);
  expect(cloudRepository.list).toHaveBeenCalledWith('tasks',{organization_id:scope.organization_id,suite:PM_SUITE_IDENTIFIER,'content->>item_type':'action'});
 });

 test('get returns a matching Action Item row',async()=>{
  cloudRepository.get.mockResolvedValue({id:'action-1',content:{item_type:'action'}});
  const result=await pmRepository.actions.get('action-1');
  expect(cloudRepository.get).toHaveBeenCalledWith('tasks','action-1');
  expect(result.id).toBe('action-1');
 });

 test('get rejects an id that belongs to an ordinary Task row instead of leaking it through the Actions interface',async()=>{
  cloudRepository.get.mockResolvedValue({id:'task-1',content:{}});
  await expect(pmRepository.actions.get('task-1')).rejects.toThrow('pm-actions-not-found');
 });

 test('remove deletes a matching Action Item row',async()=>{
  cloudRepository.get.mockResolvedValue({id:'action-1',content:{item_type:'action'}});
  cloudRepository.remove.mockResolvedValue(undefined);
  await pmRepository.actions.remove('action-1');
  expect(cloudRepository.remove).toHaveBeenCalledWith('tasks','action-1');
 });

 test('remove refuses to delete an id that belongs to an ordinary Task row',async()=>{
  cloudRepository.get.mockResolvedValue({id:'task-1',content:{}});
  await expect(pmRepository.actions.remove('task-1')).rejects.toThrow('pm-actions-not-found');
  expect(cloudRepository.remove).not.toHaveBeenCalled();
 });

 test('update re-enforces the canonical suite and discriminator, increments version, and rejects a stale write',async()=>{
  const existing={id:'action-1',project_id:scope.project_id,organization_id:scope.organization_id,title:'Send updated schedule',status:'Open',priority:'high',owner_id:scope.created_by,version:1,content:{description:'Circulate the revised schedule.',dueDate:'2026-09-01',item_type:'action'}};
  const updated={...existing,status:'Complete',version:2,suite:PM_SUITE_IDENTIFIER};
  opChain.single.mockResolvedValueOnce({data:updated,error:null});
  const result=await pmRepository.actions.update({...existing,status:'Complete'});
  expect(opChain.update).toHaveBeenCalledWith(expect.objectContaining({id:'action-1',status:'Complete',version:2,suite:PM_SUITE_IDENTIFIER,content:expect.objectContaining({item_type:'action'})}));
  expect(opChain.eq).toHaveBeenCalledWith('version',1);
  expect(result.version).toBe(2);

  opChain.single.mockResolvedValueOnce({data:null,error:{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned'}});
  await expect(pmRepository.actions.update(existing)).rejects.toThrow('pm-update-conflict');
 });

 test('create verifies project ownership before writing, rejecting a project the caller cannot access',async()=>{
  projectsChain.maybeSingle.mockResolvedValue({data:null,error:null});
  await expect(pmRepository.actions.create({...scope,title:'Unauthorized action'})).rejects.toThrow('The target project does not exist or is not accessible.');
  expect(opChain.insert).not.toHaveBeenCalled();
 });

 test('propagates persistence failures from the cloud client instead of swallowing them',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('new row violates row-level security policy'),{code:'42501'})});
  await expect(pmRepository.actions.create({...scope,title:'Blocked action'})).rejects.toThrow('row-level security policy');
 });
});

describe('tasks repository remains unaffected by the actions discriminator',()=>{
 test('tasks.create does not stamp an Action Item marker onto content',async()=>{
  const payload={...scope,title:'Ordinary task',content:{note:'no marker expected'}};
  opChain.single.mockResolvedValue({data:{...payload,id:'task-1',suite:PM_SUITE_IDENTIFIER,version:1},error:null});
  await pmRepository.tasks.create(payload);
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({content:{note:'no marker expected'}}));
 });

 test('tasks.list does not filter on the Action Item discriminator',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  await pmRepository.tasks.list(scope.project_id);
  expect(cloudRepository.list).toHaveBeenCalledWith('tasks',{project_id:scope.project_id,suite:PM_SUITE_IDENTIFIER});
 });
});

describe('issues repository — Project Issues module integration shape',()=>{
 test('create accepts the exact payload shape sent by src/components/ProjectIssues.js (owner/dates/resolution inside content, priority and status as columns)',async()=>{
  const payload={project_id:scope.project_id,organization_id:scope.organization_id,created_by:scope.created_by,title:'Checkout fails on discount codes',priority:'High',status:'Open',methodology:'pmp',lifecycle_phase:'Execution',content:{description:'Applying a discount code throws a 500 at checkout.',owner:'A. Owner',date_identified:'2026-08-10',target_resolution_date:'2026-08-20',resolution:''}};
  const created={...payload,id:'issue-1',suite:PM_SUITE_IDENTIFIER,version:1};
  opChain.single.mockResolvedValue({data:created,error:null});
  const result=await pmRepository.issues.create(payload);
  expect(mockFrom).toHaveBeenCalledWith('issues');
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({title:payload.title,priority:'High',status:'Open',suite:PM_SUITE_IDENTIFIER,content:payload.content}));
  expect(result).toEqual(created);
 });

 test('update succeeds when created_by is stripped from the record and carries the resolution / corrective action, exactly as the issue editor does before saving',async()=>{
  const existing={id:'issue-1',project_id:scope.project_id,organization_id:scope.organization_id,title:'Checkout fails on discount codes',priority:'High',status:'Open',methodology:'pmp',lifecycle_phase:'Execution',version:1,content:{description:'Applying a discount code throws a 500 at checkout.',owner:'A. Owner',date_identified:'2026-08-10',target_resolution_date:'2026-08-20',resolution:''}};
  expect(existing).not.toHaveProperty('created_by');
  const closedContent={...existing.content,resolution:'Patched the discount-code validator and deployed hotfix 4.12.1.'};
  const closed={...existing,status:'Closed',content:closedContent,version:2,suite:PM_SUITE_IDENTIFIER};
  opChain.single.mockResolvedValueOnce({data:closed,error:null});
  const result=await pmRepository.issues.update({...existing,status:'Closed',content:closedContent});
  expect(opChain.update).toHaveBeenCalledWith(expect.objectContaining({id:'issue-1',status:'Closed',version:2,suite:PM_SUITE_IDENTIFIER,content:expect.objectContaining({resolution:'Patched the discount-code validator and deployed hotfix 4.12.1.'})}));
  expect(opChain.eq).toHaveBeenCalledWith('version',1);
  expect(result.status).toBe('Closed');

  opChain.single.mockResolvedValueOnce({data:null,error:{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned'}});
  await expect(pmRepository.issues.update(existing)).rejects.toThrow('pm-update-conflict');
 });

 test('list, get, and remove scope to the issues table by project and id',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  cloudRepository.get.mockResolvedValue({id:'issue-1'});
  cloudRepository.remove.mockResolvedValue(undefined);
  await pmRepository.issues.list('project-1');
  await pmRepository.issues.get('issue-1');
  await pmRepository.issues.remove('issue-1');
  expect(cloudRepository.list).toHaveBeenCalledWith('issues',{project_id:'project-1',suite:PM_SUITE_IDENTIFIER});
  expect(cloudRepository.get).toHaveBeenCalledWith('issues','issue-1');
  expect(cloudRepository.remove).toHaveBeenCalledWith('issues','issue-1');
 });

 test('create verifies project ownership before writing, rejecting a project the caller cannot access',async()=>{
  projectsChain.maybeSingle.mockResolvedValue({data:null,error:null});
  await expect(pmRepository.issues.create({...scope,title:'Unauthorized issue'})).rejects.toThrow('The target project does not exist or is not accessible.');
  expect(opChain.insert).not.toHaveBeenCalled();
 });

 test('propagates persistence failures from the cloud client instead of swallowing them',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('new row violates row-level security policy'),{code:'42501'})});
  await expect(pmRepository.issues.create({...scope,title:'Blocked issue'})).rejects.toThrow('row-level security policy');
 });
});

describe('decisions repository — Project Decision Log integration shape',()=>{
 test('create persists the full Decision Log shape using canonical columns (title, status, lifecycle_phase) plus content for everything else',async()=>{
  const payload={project_id:scope.project_id,organization_id:scope.organization_id,created_by:scope.created_by,title:'Adopt hybrid delivery methodology',status:'Decided',methodology:'pmp',lifecycle_phase:'Planning',content:{statement:'The project will use a hybrid Agile/Waterfall delivery approach.',decisionDate:'2026-08-14',owner:'S. Sponsor',rationale:'Fixed regulatory milestones require Waterfall gates; feature delivery benefits from Agile iteration.',alternativesConsidered:'Pure Waterfall; pure Scrum.',impact:'Requires dual cadence reporting and a combined RAID log.',notes:'Revisit at Phase Gate 2.'}};
  const created={...payload,id:'decision-1',suite:PM_SUITE_IDENTIFIER,version:1};
  opChain.single.mockResolvedValue({data:created,error:null});
  const result=await pmRepository.decisions.create(payload);
  expect(mockFrom).toHaveBeenCalledWith('decisions');
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({title:payload.title,status:'Decided',lifecycle_phase:'Planning',suite:PM_SUITE_IDENTIFIER,content:payload.content}));
  expect(result).toEqual(created);
 });

 test('update succeeds when created_by is omitted and carries the decision statement/rationale/impact forward, re-enforcing suite and version',async()=>{
  const existing={id:'decision-1',project_id:scope.project_id,organization_id:scope.organization_id,title:'Adopt hybrid delivery methodology',status:'Decided',lifecycle_phase:'Planning',version:1,content:{statement:'The project will use a hybrid Agile/Waterfall delivery approach.',decisionDate:'2026-08-14',owner:'S. Sponsor',rationale:'Fixed regulatory milestones require Waterfall gates.',alternativesConsidered:'Pure Waterfall; pure Scrum.',impact:'Requires dual cadence reporting.',notes:''}};
  expect(existing).not.toHaveProperty('created_by');
  const revisedContent={...existing.content,notes:'Reaffirmed at Phase Gate 2 steering committee.'};
  const revised={...existing,content:revisedContent,version:2,suite:PM_SUITE_IDENTIFIER};
  opChain.single.mockResolvedValueOnce({data:revised,error:null});
  const result=await pmRepository.decisions.update({...existing,content:revisedContent});
  expect(opChain.update).toHaveBeenCalledWith(expect.objectContaining({id:'decision-1',version:2,suite:PM_SUITE_IDENTIFIER,content:expect.objectContaining({notes:'Reaffirmed at Phase Gate 2 steering committee.',rationale:existing.content.rationale,impact:existing.content.impact})}));
  expect(opChain.eq).toHaveBeenCalledWith('version',1);
  expect(result.version).toBe(2);

  opChain.single.mockResolvedValueOnce({data:null,error:{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned'}});
  await expect(pmRepository.decisions.update(existing)).rejects.toThrow('pm-update-conflict');
 });

 test('list, listOrganization, get, and remove scope to the decisions table by project, organization, and id',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  cloudRepository.get.mockResolvedValue({id:'decision-1'});
  cloudRepository.remove.mockResolvedValue(undefined);
  await pmRepository.decisions.list(scope.project_id);
  await pmRepository.decisions.listOrganization(scope.organization_id);
  await pmRepository.decisions.get('decision-1');
  await pmRepository.decisions.remove('decision-1');
  expect(cloudRepository.list).toHaveBeenCalledWith('decisions',{project_id:scope.project_id,suite:PM_SUITE_IDENTIFIER});
  expect(cloudRepository.list).toHaveBeenCalledWith('decisions',{organization_id:scope.organization_id,suite:PM_SUITE_IDENTIFIER});
  expect(cloudRepository.get).toHaveBeenCalledWith('decisions','decision-1');
  expect(cloudRepository.remove).toHaveBeenCalledWith('decisions','decision-1');
 });

 test('create verifies project ownership before writing, rejecting a project the caller cannot access',async()=>{
  projectsChain.maybeSingle.mockResolvedValue({data:null,error:null});
  await expect(pmRepository.decisions.create({...scope,title:'Unauthorized decision'})).rejects.toThrow('The target project does not exist or is not accessible.');
  expect(opChain.insert).not.toHaveBeenCalled();
 });

 test('create is a true insert: a colliding id is rejected instead of silently overwriting an existing decision',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('duplicate key value violates unique constraint'),{code:'23505'})});
  await expect(pmRepository.decisions.create({id:'decision-1',...scope,title:'Should not overwrite'})).rejects.toThrow('duplicate key value violates unique constraint');
 });

 test('propagates persistence failures from the cloud client instead of swallowing them',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('new row violates row-level security policy'),{code:'42501'})});
  await expect(pmRepository.decisions.create({...scope,title:'Blocked decision'})).rejects.toThrow('row-level security policy');
 });
});

describe('approvals repository — Project Approvals module integration shape',()=>{
 test('create persists the full Approval shape using canonical columns (title, status, lifecycle_phase) plus content for everything else',async()=>{
  const payload={project_id:scope.project_id,organization_id:scope.organization_id,created_by:scope.created_by,title:'Approve Phase 2 budget increase',status:'Pending',methodology:'pmp',lifecycle_phase:'Planning',content:{description:'Requesting an additional $40k to cover extended vendor onboarding.',approver:'S. Sponsor',requestedDate:'2026-08-14',decisionDate:'',conditions:'',notes:'Escalated after steering committee review.'}};
  const created={...payload,id:'approval-1',suite:PM_SUITE_IDENTIFIER,version:1};
  opChain.single.mockResolvedValue({data:created,error:null});
  const result=await pmRepository.approvals.create(payload);
  expect(mockFrom).toHaveBeenCalledWith('approvals');
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({title:payload.title,status:'Pending',lifecycle_phase:'Planning',suite:PM_SUITE_IDENTIFIER,content:payload.content}));
  expect(result).toEqual(created);
 });

 test('update succeeds when created_by is omitted and carries the decision date/conditions forward when the approval is decided, re-enforcing suite and version',async()=>{
  const existing={id:'approval-1',project_id:scope.project_id,organization_id:scope.organization_id,title:'Approve Phase 2 budget increase',status:'Pending',lifecycle_phase:'Planning',version:1,content:{description:'Requesting an additional $40k to cover extended vendor onboarding.',approver:'S. Sponsor',requestedDate:'2026-08-14',decisionDate:'',conditions:'',notes:''}};
  expect(existing).not.toHaveProperty('created_by');
  const decidedContent={...existing.content,decisionDate:'2026-08-15',conditions:'Contingent on Q3 forecast review.'};
  const decided={...existing,status:'Approved',content:decidedContent,version:2,suite:PM_SUITE_IDENTIFIER};
  opChain.single.mockResolvedValueOnce({data:decided,error:null});
  const result=await pmRepository.approvals.update({...existing,status:'Approved',content:decidedContent});
  expect(opChain.update).toHaveBeenCalledWith(expect.objectContaining({id:'approval-1',status:'Approved',version:2,suite:PM_SUITE_IDENTIFIER,content:expect.objectContaining({decisionDate:'2026-08-15',conditions:'Contingent on Q3 forecast review.'})}));
  expect(opChain.eq).toHaveBeenCalledWith('version',1);
  expect(result.status).toBe('Approved');

  opChain.single.mockResolvedValueOnce({data:null,error:{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned'}});
  await expect(pmRepository.approvals.update(existing)).rejects.toThrow('pm-update-conflict');
 });

 test('list, listOrganization, get, and remove scope to the approvals table by project, organization, and id',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  cloudRepository.get.mockResolvedValue({id:'approval-1'});
  cloudRepository.remove.mockResolvedValue(undefined);
  await pmRepository.approvals.list(scope.project_id);
  await pmRepository.approvals.listOrganization(scope.organization_id);
  await pmRepository.approvals.get('approval-1');
  await pmRepository.approvals.remove('approval-1');
  expect(cloudRepository.list).toHaveBeenCalledWith('approvals',{project_id:scope.project_id,suite:PM_SUITE_IDENTIFIER});
  expect(cloudRepository.list).toHaveBeenCalledWith('approvals',{organization_id:scope.organization_id,suite:PM_SUITE_IDENTIFIER});
  expect(cloudRepository.get).toHaveBeenCalledWith('approvals','approval-1');
  expect(cloudRepository.remove).toHaveBeenCalledWith('approvals','approval-1');
 });

 test('create verifies project ownership before writing, rejecting a project the caller cannot access',async()=>{
  projectsChain.maybeSingle.mockResolvedValue({data:null,error:null});
  await expect(pmRepository.approvals.create({...scope,title:'Unauthorized approval'})).rejects.toThrow('The target project does not exist or is not accessible.');
  expect(opChain.insert).not.toHaveBeenCalled();
 });

 test('create is a true insert: a colliding id is rejected instead of silently overwriting an existing approval',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('duplicate key value violates unique constraint'),{code:'23505'})});
  await expect(pmRepository.approvals.create({id:'approval-1',...scope,title:'Should not overwrite'})).rejects.toThrow('duplicate key value violates unique constraint');
 });

 test('propagates persistence failures from the cloud client instead of swallowing them',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('new row violates row-level security policy'),{code:'42501'})});
  await expect(pmRepository.approvals.create({...scope,title:'Blocked approval'})).rejects.toThrow('row-level security policy');
 });
});

describe('activities repository — Project Activity Log integration shape',()=>{
 test('create persists the Activity Log shape using the dedicated event_type/subject_type/subject_id/occurred_at columns, not content',async()=>{
  const payload={project_id:scope.project_id,organization_id:scope.organization_id,created_by:scope.created_by,title:'Risk escalated to High',status:'active',event_type:'risk.escalated',subject_type:'risk',subject_id:'risk-1',owner_id:scope.created_by,occurred_at:'2026-08-15T14:30:00.000Z',content:{summary:'Supplier delay risk was escalated from Medium to High after schedule review.',notes:''}};
  const created={...payload,id:'activity-1',suite:PM_SUITE_IDENTIFIER,version:1};
  opChain.single.mockResolvedValue({data:created,error:null});
  const result=await pmRepository.activities.create(payload);
  expect(mockFrom).toHaveBeenCalledWith('activities');
  expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({title:payload.title,event_type:'risk.escalated',subject_type:'risk',subject_id:'risk-1',occurred_at:payload.occurred_at,suite:PM_SUITE_IDENTIFIER,content:payload.content}));
  expect(result).toEqual(created);
 });

 test('update succeeds when created_by is omitted and carries corrected notes forward, re-enforcing suite and version',async()=>{
  const existing={id:'activity-1',project_id:scope.project_id,organization_id:scope.organization_id,title:'Risk escalated to High',status:'active',event_type:'risk.escalated',subject_type:'risk',subject_id:'risk-1',owner_id:scope.created_by,occurred_at:'2026-08-15T14:30:00.000Z',version:1,content:{summary:'Supplier delay risk was escalated from Medium to High after schedule review.',notes:''}};
  expect(existing).not.toHaveProperty('created_by');
  const revisedContent={...existing.content,notes:'Correction: escalation was approved by the steering committee.'};
  const revised={...existing,content:revisedContent,version:2,suite:PM_SUITE_IDENTIFIER};
  opChain.single.mockResolvedValueOnce({data:revised,error:null});
  const result=await pmRepository.activities.update({...existing,content:revisedContent});
  expect(opChain.update).toHaveBeenCalledWith(expect.objectContaining({id:'activity-1',version:2,suite:PM_SUITE_IDENTIFIER,event_type:'risk.escalated',subject_type:'risk',subject_id:'risk-1',content:expect.objectContaining({notes:'Correction: escalation was approved by the steering committee.'})}));
  expect(opChain.eq).toHaveBeenCalledWith('version',1);
  expect(result.version).toBe(2);

  opChain.single.mockResolvedValueOnce({data:null,error:{code:'PGRST116',message:'JSON object requested, multiple (or no) rows returned'}});
  await expect(pmRepository.activities.update(existing)).rejects.toThrow('pm-update-conflict');
 });

 test('list, listOrganization, get, and remove scope to the activities table by project, organization, and id',async()=>{
  cloudRepository.list.mockResolvedValue([]);
  cloudRepository.get.mockResolvedValue({id:'activity-1'});
  cloudRepository.remove.mockResolvedValue(undefined);
  await pmRepository.activities.list(scope.project_id);
  await pmRepository.activities.listOrganization(scope.organization_id);
  await pmRepository.activities.get('activity-1');
  await pmRepository.activities.remove('activity-1');
  expect(cloudRepository.list).toHaveBeenCalledWith('activities',{project_id:scope.project_id,suite:PM_SUITE_IDENTIFIER});
  expect(cloudRepository.list).toHaveBeenCalledWith('activities',{organization_id:scope.organization_id,suite:PM_SUITE_IDENTIFIER});
  expect(cloudRepository.get).toHaveBeenCalledWith('activities','activity-1');
  expect(cloudRepository.remove).toHaveBeenCalledWith('activities','activity-1');
 });

 test('create verifies project ownership before writing, rejecting a project the caller cannot access',async()=>{
  projectsChain.maybeSingle.mockResolvedValue({data:null,error:null});
  await expect(pmRepository.activities.create({...scope,title:'Unauthorized activity',event_type:'note.added'})).rejects.toThrow('The target project does not exist or is not accessible.');
  expect(opChain.insert).not.toHaveBeenCalled();
 });

 test('create is a true insert: a colliding id is rejected instead of silently overwriting an existing activity',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('duplicate key value violates unique constraint'),{code:'23505'})});
  await expect(pmRepository.activities.create({id:'activity-1',...scope,title:'Should not overwrite',event_type:'note.added'})).rejects.toThrow('duplicate key value violates unique constraint');
 });

 test('propagates persistence failures from the cloud client instead of swallowing them',async()=>{
  opChain.single.mockResolvedValue({data:null,error:Object.assign(new Error('new row violates row-level security policy'),{code:'42501'})});
  await expect(pmRepository.activities.create({...scope,title:'Blocked activity',event_type:'note.added'})).rejects.toThrow('row-level security policy');
 });
});

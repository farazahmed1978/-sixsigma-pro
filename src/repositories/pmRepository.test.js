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

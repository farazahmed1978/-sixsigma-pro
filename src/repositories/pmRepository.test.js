jest.mock('./cloudRepository',()=>({cloudRepository:{list:jest.fn(),get:jest.fn(),upsert:jest.fn(),remove:jest.fn()}}));

import {cloudRepository} from './cloudRepository';
import {pmRepository,PM_SUITE_IDENTIFIER} from './pmRepository';

const TABLES=['tasks','risks','issues','decisions','approvals','activities'];
const scope={organization_id:'11111111-1111-1111-1111-111111111111',project_id:'22222222-2222-2222-2222-222222222222',created_by:'33333333-3333-3333-3333-333333333333'};

beforeEach(()=>jest.clearAllMocks());

test('the canonical suite identifier is the existing Project Management suite, not an invented value',()=>{
 expect(PM_SUITE_IDENTIFIER).toBe('project-management');
});

describe.each(TABLES)('%s repository',table=>{
 test('create enforces the canonical PM suite and preserves ownership fields',async()=>{
  const record={...scope,title:'Example',suite:'platform'};
  cloudRepository.upsert.mockResolvedValue({...record,suite:PM_SUITE_IDENTIFIER,id:'row-1'});
  await pmRepository[table].create(record);
  expect(cloudRepository.upsert).toHaveBeenCalledWith(table,expect.objectContaining({...scope,suite:PM_SUITE_IDENTIFIER}));
 });

 test('update re-enforces the canonical PM suite even if a caller supplies a different one',async()=>{
  const record={id:'row-1',...scope,title:'Renamed',suite:'operational-excellence'};
  cloudRepository.upsert.mockResolvedValue({...record,suite:PM_SUITE_IDENTIFIER});
  await pmRepository[table].update(record);
  expect(cloudRepository.upsert).toHaveBeenCalledWith(table,expect.objectContaining({id:'row-1',suite:PM_SUITE_IDENTIFIER}));
 });

 test('preserves shared metadata and lifecycle fields supported by the canonical schema',async()=>{
  const record={...scope,title:'Plan kickoff',methodology:'pmp',lifecycle_phase:'Planning',dmaic_phase:null,priority:'high',owner_id:scope.created_by,source_type:'manual',source_id:null,metadata:{tag:'phase1'}};
  cloudRepository.upsert.mockResolvedValue(record);
  await pmRepository[table].create(record);
  expect(cloudRepository.upsert).toHaveBeenCalledWith(table,expect.objectContaining({methodology:'pmp',lifecycle_phase:'Planning',priority:'high',owner_id:scope.created_by,metadata:{tag:'phase1'}}));
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

 test('propagates persistence failures from the cloud repository instead of swallowing them',async()=>{
  const error=Object.assign(new Error('new row violates row-level security policy'),{code:'42501'});
  cloudRepository.upsert.mockRejectedValue(error);
  await expect(pmRepository[table].create({...scope})).rejects.toThrow('row-level security policy');
 });
});

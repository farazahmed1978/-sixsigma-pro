jest.mock('./cloudRepository',()=>({cloudRepository:{upsert:jest.fn(),list:jest.fn()}}));
jest.mock('../utils/datasetHydrationDiagnostics',()=>({reportDatasetPersistence:jest.fn()}));

import {cloudRepository} from './cloudRepository';
import {reportDatasetPersistence} from '../utils/datasetHydrationDiagnostics';
import {saveAndVerifyDataset} from './datasetRepository';

const row={id:'9e7c22a1-1cfb-4acf-a7ad-acde05402717',project_id:'a38bd060-d13a-4c5d-ae3c-8b19c98edc09',organization_id:'33aa322d-0c84-41c4-a786-2b93c01ed806',created_by:'fbc898fc-2d2d-4ffd-9984-a106b622f754',title:'Dataset A',content:{columns:[{name:'CycleTime',data:[10]}]}};

beforeEach(()=>jest.clearAllMocks());

test('upserts then immediately reads the same canonical dataset ownership',async()=>{
 cloudRepository.upsert.mockResolvedValue(row);
 cloudRepository.list.mockResolvedValue([row]);
 await expect(saveAndVerifyDataset(row,{userId:row.created_by})).resolves.toBe(row);
 expect(cloudRepository.list).toHaveBeenCalledWith('datasets',{id:row.id,project_id:row.project_id,organization_id:row.organization_id});
 expect(reportDatasetPersistence).toHaveBeenCalledWith(expect.objectContaining({'returned row ID':row.id,'read-back response':[row]}));
});

test('rejects when the authenticated immediate read-back cannot see the written row',async()=>{
 cloudRepository.upsert.mockResolvedValue(row);
 cloudRepository.list.mockResolvedValue([]);
 await expect(saveAndVerifyDataset(row,{userId:row.created_by})).rejects.toThrow('expected one readable row, received 0');
});

test('reports the exact Supabase write error',async()=>{
 const error=Object.assign(new Error('new row violates row-level security policy'),{code:'42501',details:'RLS'});
 cloudRepository.upsert.mockRejectedValue(error);
 await expect(saveAndVerifyDataset(row,{userId:row.created_by})).rejects.toThrow('row-level security');
 expect(reportDatasetPersistence).toHaveBeenCalledWith(expect.objectContaining({'Supabase write error':expect.objectContaining({code:'42501',details:'RLS'})}));
});

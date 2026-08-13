import {datasetPersistenceRecord,persistDatasetAssignment} from './WorksheetContext';

const dataset={id:'9e7c22a1-1cfb-4acf-a7ad-acde05402717',projectId:'',organizationId:'',createdBy:'',name:'Dataset A',description:'QA data',source:'worksheet',status:'active',version:1,rowCount:2,columnCount:1,columns:[{name:'CycleTime',data:[10,12]}],history:[]};
const projectId='a38bd060-d13a-4c5d-ae3c-8b19c98edc09';
const organizationId='33aa322d-0c84-41c4-a786-2b93c01ed806';
const userId='fbc898fc-2d2d-4ffd-9984-a106b622f754';

test('authenticated project assignment resolves only after Supabase write and read-back verification',async()=>{
  const saveAndVerify=jest.fn(async row=>({...row}));
  const assigned=await persistDatasetAssignment({dataset,projectId,configured:true,organizationId,userId,saveAndVerify});
  expect(saveAndVerify).toHaveBeenCalledTimes(1);
  expect(saveAndVerify.mock.calls[0][0]).toEqual(expect.objectContaining({id:dataset.id,project_id:projectId,organization_id:organizationId,created_by:userId,title:'Dataset A'}));
  expect(assigned.projectId).toBe(projectId);
  expect(assigned.columns).toBe(dataset.columns);
});

test('failed Supabase persistence rejects instead of masquerading as a successful save',async()=>{
  const saveAndVerify=jest.fn().mockRejectedValue(new Error('row-level security policy'));
  await expect(persistDatasetAssignment({dataset,projectId,configured:true,organizationId,userId,saveAndVerify})).rejects.toThrow('row-level security policy');
});

test('a mismatched Supabase response is not accepted as a successful save',async()=>{
  const saveAndVerify=jest.fn(async row=>({...row,project_id:'9a614921-eed6-4b98-aee6-c51493a46cad'}));
  await expect(persistDatasetAssignment({dataset,projectId,configured:true,organizationId,userId,saveAndVerify})).rejects.toThrow('did not confirm');
});

test('dataset serialization retains canonical data without duplicating it',()=>{
  const row=datasetPersistenceRecord({...dataset,projectId},{organizationId,userId});
  expect(row.content.columns).toBe(dataset.columns);
  expect(row.project_id).toBe(projectId);
  expect(row.organization_id).toBe(organizationId);
});

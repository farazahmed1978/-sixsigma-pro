import {cloudRepository} from './cloudRepository';

const assertStandaloneShape=(record,method)=>{if(record.project_id)throw new Error(`${method} cannot accept a project_id; use documentRepository.save for project-connected documents.`)};
const assertStandaloneRow=(record,method)=>{if(record&&record.project_id!==null)throw new Error(`${method} refuses to operate on a project-connected document; use the project-connected document APIs instead.`);return record};

export const documentRepository={
 // Project-connected documents (unchanged contract).
 list:projectId=>cloudRepository.list('documents',{project_id:projectId}),
 save:document=>cloudRepository.upsert('documents',document),

 // Standalone (projectless) documents: canonical UUID ids, creator-owned, project_id always null.
 async createStandalone(record){
  assertStandaloneShape(record,'createStandalone');
  return cloudRepository.upsert('documents',{...record,project_id:null});
 },
 async getStandalone(id){
  const record=await cloudRepository.get('documents',id);
  return assertStandaloneRow(record,'getStandalone');
 },
 listStandalone:organizationId=>cloudRepository.list('documents',{organization_id:organizationId,project_id:null}),
 async updateStandalone(record){
  assertStandaloneShape(record,'updateStandalone');
  if(!record.id)throw new Error('updateStandalone requires an existing id.');
  return cloudRepository.upsert('documents',{...record,project_id:null});
 },
 async removeStandalone(id){
  const record=await cloudRepository.get('documents',id).catch(()=>null);
  if(!record)return true;
  assertStandaloneRow(record,'removeStandalone');
  await cloudRepository.remove('documents',id);
  return true;
 },
};

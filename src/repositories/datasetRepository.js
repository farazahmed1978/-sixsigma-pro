import {cloudRepository} from './cloudRepository';
import {reportDatasetPersistence} from '../utils/datasetHydrationDiagnostics';
import {assertDatasetSchemaPayload} from './datasetSchema';

export async function saveAndVerifyDataset(dataset,{userId}={}){
 assertDatasetSchemaPayload(dataset);
 const diagnostic={user:userId||null,organization:dataset.organization_id,project:dataset.project_id,dataset:dataset.id,payload:dataset,'Supabase write response':null,'Supabase write error':null,'returned row ID':null,'read-back response':null,'read-back error':null};
 let written;
 try{
  written=await cloudRepository.upsert('datasets',dataset);
  diagnostic['Supabase write response']=written;
  diagnostic['returned row ID']=written?.id||null;
 }catch(error){diagnostic['Supabase write error']={message:error.message||String(error),code:error.code||null,details:error.details||null,hint:error.hint||null};reportDatasetPersistence(diagnostic);throw error;}
 let rows;
 try{
  rows=await cloudRepository.list('datasets',{id:dataset.id,project_id:dataset.project_id,organization_id:dataset.organization_id});
  diagnostic['read-back response']=rows;
 }catch(error){diagnostic['read-back error']={message:error.message||String(error),code:error.code||null,details:error.details||null,hint:error.hint||null};reportDatasetPersistence(diagnostic);throw error;}
 reportDatasetPersistence(diagnostic);
 if(rows.length!==1)throw new Error(`Dataset persistence verification failed: expected one readable row, received ${rows.length}.`);
 const verified=rows[0];
 if(verified.id!==dataset.id||verified.project_id!==dataset.project_id||verified.organization_id!==dataset.organization_id)throw new Error('Dataset persistence verification returned mismatched ownership.');
 return verified;
}

export const datasetRepository={list:projectId=>cloudRepository.list('datasets',{project_id:projectId}),listOrganization:organizationId=>cloudRepository.list('datasets',{organization_id:organizationId}),saveMetadata:dataset=>cloudRepository.upsert('datasets',dataset),saveAndVerify:saveAndVerifyDataset,saveVersion:version=>cloudRepository.upsert('dataset_versions',version),loadVersion:id=>cloudRepository.get('dataset_versions',id),remove:id=>cloudRepository.remove('datasets',id)};

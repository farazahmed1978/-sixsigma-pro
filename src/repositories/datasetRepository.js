import {cloudRepository} from './cloudRepository';
import {reportDatasetPersistence} from '../utils/datasetHydrationDiagnostics';
import {assertDatasetSchemaPayload} from './datasetSchema';
import {supabase} from '../lib/supabase';

export async function saveAndVerifyDataset(dataset,{userId}={}){
 assertDatasetSchemaPayload(dataset);
 const diagnostic={user:userId||null,organization:dataset.organization_id,project:dataset.project_id,dataset:dataset.id,payload:dataset,'Supabase write response':null,'Supabase write error':null,'returned row ID':null,'read-back response':null,'read-back error':null};
 let written;
 try{
  written=await cloudRepository.upsert('datasets',dataset);
  const versionId=dataset.content?.versionId;
  if(!versionId)throw new Error('Dataset persistence requires a canonical dataset version ID.');
  await cloudRepository.upsert('dataset_versions',{
   id:versionId,dataset_id:dataset.id,project_id:dataset.project_id,organization_id:dataset.organization_id,
   created_by:dataset.created_by,version:dataset.version||1,status:dataset.status||'active',content:dataset.content,
   updated_at:dataset.updated_at,
  });
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

async function listActive(filters){let query=supabase.from('datasets').select('*').neq('status','deleted');Object.entries(filters).forEach(([key,value])=>{query=query.eq(key,value)});const{data,error}=await query;if(error)throw error;return data;}
export const datasetRepository={list:projectId=>listActive({project_id:projectId}),listOrganization:organizationId=>listActive({organization_id:organizationId}),saveMetadata:dataset=>cloudRepository.upsert('datasets',dataset),saveAndVerify:saveAndVerifyDataset,saveVersion:version=>cloudRepository.upsert('dataset_versions',version),loadVersion:id=>cloudRepository.get('dataset_versions',id),remove:id=>cloudRepository.remove('datasets',id)};

import{getSuite}from'../config/suites';
import{supabase}from'../lib/supabase';
import{validateProjectOwnership}from'../services/persistenceSafety';
import{CORRECTIVE_ACTION_TYPE,isCorrectiveAction}from'../foundation/correctiveAction';
const SUITE=getSuite('operational-excellence').id;
const requireCloud=()=>{if(!supabase)throw new Error('cloud-not-configured');return supabase};
const assertScope=async(client,value)=>{const{data:{user}}=await client.auth.getUser();const{data:project,error}=await client.from('projects').select('id,organization_id').eq('id',value.project_id).maybeSingle();if(error)throw error;validateProjectOwnership({userId:user?.id,organizationId:value.organization_id,projectId:value.project_id,createdBy:value.created_by,project})};
const marker=content=>({...content,item_type:CORRECTIVE_ACTION_TYPE});
export const correctiveActionRepository={
 async list(projectId){const{data,error}=await requireCloud().from('tasks').select('*').eq('project_id',projectId).eq('suite',SUITE).eq('content->>item_type',CORRECTIVE_ACTION_TYPE).order('updated_at',{ascending:false});if(error)throw error;return data},
 async create(record){const client=requireCloud(),value={...record,suite:SUITE,content:marker(record.content)};await assertScope(client,value);const{data,error}=await client.from('tasks').insert(value).select().single();if(error)throw error;return data},
 async update(record){if(!record.id)throw new Error('corrective-action-update-requires-id');const client=requireCloud(),value={...record,suite:SUITE,content:marker(record.content)},nextVersion=(Number(record.version)||1)+1;await assertScope(client,value);let query=client.from('tasks').update({...value,version:nextVersion}).eq('id',record.id).eq('suite',SUITE).eq('content->>item_type',CORRECTIVE_ACTION_TYPE);if(record.version!=null)query=query.eq('version',record.version);const{data,error}=await query.select().single();if(error)throw error;return data},
 async get(id){const{data,error}=await requireCloud().from('tasks').select('*').eq('id',id).eq('suite',SUITE).single();if(error)throw error;if(!isCorrectiveAction(data))throw new Error('corrective-action-not-found');return data},
 async linkFinding(action,finding,context){if(!action?.id||!finding?.id)throw new Error('corrective-action-link-requires-identities');const{data,error}=await requireCloud().from('object_links').upsert({organization_id:context.organizationId,project_id:context.projectId,created_by:context.userId,from_type:'finding',from_id:finding.id,to_type:'action',to_id:action.id,relationship:'corrective-action',metadata:{findingTitle:finding.title||finding.statement||finding.id,actionTitle:action.title}},{onConflict:'organization_id,project_id,from_type,from_id,to_type,to_id,relationship'}).select('*').single();if(error)throw error;return data},
 async listFindings(context){const{data,error}=await requireCloud().from('findings').select('*').eq('organization_id',context.organizationId).eq('project_id',context.projectId).eq('suite',SUITE).order('updated_at',{ascending:false});if(error)throw error;return data},
};

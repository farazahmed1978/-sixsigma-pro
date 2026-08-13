import {supabase} from '../lib/supabase';
import {PROJECT_OWNED_TABLES,validateProjectOwnership} from '../services/persistenceSafety';
const requireCloud=()=>{if(!supabase)throw new Error('cloud-not-configured');return supabase};
export const cloudRepository={
 async list(table,filters={}){let query=requireCloud().from(table).select('*');Object.entries(filters).forEach(([key,value])=>{query=query.eq(key,value)});const{data,error}=await query;if(error)throw error;return data;},
 async get(table,id){const{data,error}=await requireCloud().from(table).select('*').eq('id',id).single();if(error)throw error;return data;},
 async upsert(table,value,options={onConflict:'id'}){const client=requireCloud();if(PROJECT_OWNED_TABLES.has(table)){const{data:{user}}=await client.auth.getUser();const{data:project,error:projectError}=await client.from('projects').select('id,organization_id').eq('id',value.project_id).maybeSingle();if(projectError)throw projectError;validateProjectOwnership({userId:user?.id,organizationId:value.organization_id,projectId:value.project_id,createdBy:value.created_by,project});}const{data,error}=await client.from(table).upsert(value,options).select().single();if(error)throw error;return data;},
 async remove(table,id){const{error}=await requireCloud().from(table).delete().eq('id',id);if(error)throw error;}
};

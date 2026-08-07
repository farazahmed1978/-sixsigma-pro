import {supabase} from '../lib/supabase';
const requireCloud=()=>{if(!supabase)throw new Error('cloud-not-configured');return supabase};
export const cloudRepository={
 async list(table,filters={}){let query=requireCloud().from(table).select('*');Object.entries(filters).forEach(([key,value])=>{query=query.eq(key,value)});const{data,error}=await query;if(error)throw error;return data;},
 async get(table,id){const{data,error}=await requireCloud().from(table).select('*').eq('id',id).single();if(error)throw error;return data;},
 async upsert(table,value,options={onConflict:'id'}){const{data,error}=await requireCloud().from(table).upsert(value,options).select().single();if(error)throw error;return data;},
 async remove(table,id){const{error}=await requireCloud().from(table).delete().eq('id',id);if(error)throw error;}
};

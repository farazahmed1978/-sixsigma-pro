import {cloudRepository} from './cloudRepository';
import {getSuite} from '../config/suites';
import {supabase} from '../lib/supabase';
import {validateProjectOwnership} from '../services/persistenceSafety';

const PM_SUITE_ID=getSuite('project-management').id;
const PM_TABLES=Object.freeze(['tasks','risks','issues','decisions','approvals','activities']);
const stampSuite=record=>({...record,suite:PM_SUITE_ID});
const requireCloud=()=>{if(!supabase)throw new Error('cloud-not-configured');return supabase};

const assertOwnership=async(client,value)=>{
 const{data:{user}}=await client.auth.getUser();
 const{data:project,error}=await client.from('projects').select('id,organization_id').eq('id',value.project_id).maybeSingle();
 if(error)throw error;
 validateProjectOwnership({userId:user?.id,organizationId:value.organization_id,projectId:value.project_id,createdBy:value.created_by,project});
};

const pmTableRepository=table=>({
 list:(projectId,filters={})=>cloudRepository.list(table,{project_id:projectId,suite:PM_SUITE_ID,...filters}),
 listOrganization:organizationId=>cloudRepository.list(table,{organization_id:organizationId,suite:PM_SUITE_ID}),
 get:id=>cloudRepository.get(table,id),
 async create(record){
  const client=requireCloud();
  const value=stampSuite(record);
  await assertOwnership(client,value);
  const{data,error}=await client.from(table).insert(value).select().single();
  if(error)throw error;
  return data;
 },
 async update(record){
  if(!record.id)throw new Error('pm-update-requires-id: updates must target an existing record');
  const client=requireCloud();
  const value=stampSuite(record);
  await assertOwnership(client,value);
  const nextVersion=(Number(record.version)||1)+1;
  let query=client.from(table).update({...value,version:nextVersion}).eq('id',record.id);
  if(record.version!=null)query=query.eq('version',record.version);
  const{data,error}=await query.select().single();
  if(error){
   if(error.code==='PGRST116')throw new Error('pm-update-conflict: the record was modified or removed since it was last read');
   throw error;
  }
  return data;
 },
 remove:id=>cloudRepository.remove(table,id),
});

export const PM_SUITE_IDENTIFIER=PM_SUITE_ID;
export const pmRepository=PM_TABLES.reduce((repository,table)=>({...repository,[table]:pmTableRepository(table)}),{});

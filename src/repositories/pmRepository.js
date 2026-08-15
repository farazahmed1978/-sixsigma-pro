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

// Action Items live in the "tasks" table but must stay distinguishable from future plain Tasks
// records, so every write is stamped with this content marker and every read filters on it.
const ACTION_ITEM_TYPE='action';
const isActionItem=row=>row?.content?.item_type===ACTION_ITEM_TYPE;
const withActionMarker=record=>({...record,content:{...(record.content||{}),item_type:ACTION_ITEM_TYPE}});

const pmActionsRepository=()=>{
 const base=pmTableRepository('tasks');
 return{
  list:(projectId,filters={})=>base.list(projectId,{'content->>item_type':ACTION_ITEM_TYPE,...filters}),
  listOrganization:organizationId=>cloudRepository.list('tasks',{organization_id:organizationId,suite:PM_SUITE_ID,'content->>item_type':ACTION_ITEM_TYPE}),
  async get(id){
   const row=await base.get(id);
   if(!isActionItem(row))throw new Error('pm-actions-not-found: the requested record is not an Action Item');
   return row;
  },
  create:record=>base.create(withActionMarker(record)),
  update:record=>base.update(withActionMarker(record)),
  async remove(id){
   const row=await base.get(id);
   if(!isActionItem(row))throw new Error('pm-actions-not-found: the requested record is not an Action Item');
   return base.remove(id);
  },
 };
};

export const PM_SUITE_IDENTIFIER=PM_SUITE_ID;
export const pmRepository=PM_TABLES.reduce((repository,table)=>({...repository,[table]:pmTableRepository(table)}),{});
pmRepository.actions=pmActionsRepository();

import {cloudRepository} from './cloudRepository';
import {boundedVerify} from '../services/persistenceSafety';
import {supabase} from '../lib/supabase';
const LOCAL_KEY='sixsigmapro_projects';
export const projectRepository={
 listLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch{return[]}},
 async listCloud(organizationId){return cloudRepository.list('projects',{organization_id:organizationId})},
 async listByIds(projectIds){if(!projectIds?.length)return[];const{data,error}=await supabase.from('projects').select('*').in('id',[...new Set(projectIds)]);if(error)throw error;return data||[]},
 async save(project){return cloudRepository.upsert('projects',project,{onConflict:'id'})},
 async remove(id){await cloudRepository.remove('projects',id);const childTables=['datasets','analyses','reports','artifacts','documents','evidence'];await boundedVerify(async()=>{const checks=await Promise.all([supabase.from('projects').select('id').eq('id',id).maybeSingle(),...childTables.map(table=>supabase.from(table).select('id').eq('project_id',id).limit(1))]);if(checks.some(result=>result.error))throw checks.find(result=>result.error).error;return !checks[0].data&&checks.slice(1).every(result=>(result.data||[]).length===0)});return true},
 async importLocal({organizationId,userId,projects}){
  if(!organizationId||!userId)throw new Error('missing-project-ownership');
  const imported=[];
  for(const project of projects){
   const localId=project.id||`${project.name||'project'}:${project.createdAt||'legacy'}`;
   const row={organization_id:organizationId,created_by:userId,name:(project.name||'Untitled Project').trim(),status:(project.status||'active').toLowerCase(),methodology:project.methodology||'hybrid',current_phase:project.currentPhase||'Define',target_date:project.targetDate||null,content:project,local_migration_key:`local:${localId}`};
   imported.push(await cloudRepository.upsert('projects',row,{onConflict:'organization_id,local_migration_key'}));
  }
  return imported;
 },
 localKey:LOCAL_KEY
};

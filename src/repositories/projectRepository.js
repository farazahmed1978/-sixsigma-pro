import {cloudRepository} from './cloudRepository';
const LOCAL_KEY='sixsigmapro_projects';
export const projectRepository={
 listLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]')}catch{return[]}},
 async listCloud(organizationId){return cloudRepository.list('projects',{organization_id:organizationId})},
 async save(project){return cloudRepository.upsert('projects',project,{onConflict:'id'})},
 async importLocal({organizationId,userId,projects}){const imported=[];for(const project of projects){const migrationKey=`local:${project.id}`;const row={organization_id:organizationId,created_by:userId,name:project.name,status:(project.status||'active').toLowerCase(),methodology:'hybrid',current_phase:project.currentPhase||'Define',target_date:project.targetDate||null,content:project,local_migration_key:migrationKey};const result=await cloudRepository.upsert('projects',row,{onConflict:'organization_id,local_migration_key'});imported.push(result)}return imported;},
 localKey:LOCAL_KEY
};

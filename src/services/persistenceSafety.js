export const HYDRATION = Object.freeze({ HYDRATING: 'HYDRATING', READY: 'READY', ERROR: 'ERROR' });
export const PROJECT_OWNED_TABLES = new Set(['documents','datasets','dataset_versions','analyses','evidence','artifacts','reports','tasks','risks','issues','decisions','approvals','activities','findings','object_links','product_requirements','product_ctqs','product_verifications','product_record_revisions','lean_records','lean_record_revisions']);

// Tables in PROJECT_OWNED_TABLES that also support a project_id-less (standalone) row, owned by
// its creator rather than shared org-wide. Keep this list narrow and explicit rather than
// inferring standalone support from schema shape.
export const STANDALONE_CAPABLE_TABLES = new Set(['documents']);

export function validateProjectOwnership({userId,organizationId,projectId,createdBy,project,expectedProjectId}){
  if(!userId)throw new Error('Authenticated user is required for this project-owned write.');
  if(!organizationId)throw new Error('Organization context is required for this project-owned write.');
  if(!projectId)throw new Error('Project context is required; project-owned records cannot be saved as global data.');
  if(createdBy&&createdBy!==userId)throw new Error('The record owner does not match the authenticated user.');
  if(expectedProjectId&&projectId!==expectedProjectId)throw new Error('The write belongs to a stale or different project context.');
  if(!project)throw new Error('The target project does not exist or is not accessible.');
  if(project.organization_id!==organizationId)throw new Error('The target project belongs to a different organization.');
  return true;
}

export function validateStandaloneOwnership({userId,organizationId,createdBy,projectId}){
  if(projectId)throw new Error('Standalone records must not reference a project_id; use the project-owned write path instead.');
  if(!userId)throw new Error('Authenticated user is required for this standalone write.');
  if(!organizationId)throw new Error('Organization context is required for this standalone write.');
  if(!createdBy)throw new Error('created_by is required for standalone records.');
  if(createdBy!==userId)throw new Error('The record owner does not match the authenticated user.');
  return true;
}

export const nextGeneration=current=>current+1;
export const isCurrentGeneration=(request,current)=>request===current;

export async function boundedVerify(check,{attempts=4,delay=80}={}){
  let lastError;
  for(let attempt=0;attempt<attempts;attempt+=1){
    try{if(await check())return true;}catch(error){lastError=error;}
    if(attempt<attempts-1)await new Promise(resolve=>setTimeout(resolve,delay*(attempt+1)));
  }
  throw lastError||new Error('Server deletion could not be verified. Retry the deletion or refresh the workspace.');
}

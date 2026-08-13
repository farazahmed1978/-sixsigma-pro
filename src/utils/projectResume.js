export const charterRoute=projectId=>`/projects/${projectId}/charter`;
export const documentRoute=(projectId,artifactId)=>`/projects/${projectId}/documents/${artifactId}`;
export function resumeTargetFor(project){if(project?.resumeTarget?.route&&project.resumeTarget.artifactId)return project.resumeTarget;return{artifactId:'charter',artifactName:'Project Charter',route:charterRoute(project.id),sectionId:'overview',started:Boolean(project?.charter)}}
export function projectResumeCta(project){const target=resumeTargetFor(project);return{target,label:`${target.started?'Continue':'Start'} ${target.artifactName}`}}
export function artifactResume({projectId,artifactId,artifactName,sectionId,started=true}){return{artifactId,artifactName,route:artifactId==='charter'?charterRoute(projectId):documentRoute(projectId,artifactId),sectionId:sectionId||'',started,updatedAt:new Date().toISOString()}}

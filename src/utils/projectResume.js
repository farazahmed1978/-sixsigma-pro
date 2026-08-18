export const charterRoute=projectId=>`/projects/${projectId}/charter`;
export const documentRoute=(projectId,artifactId)=>`/projects/${projectId}/documents/${artifactId}`;
// The Project Hub route and the label every "back" link pointing at it should use — one source of
// truth so every surface reached from a Project Hub quick action (Worksheet, Templates,
// AnalysisLauncher, ReportBuilder, DocumentWorkspace, ProjectCharter) reads "Back to Project Hub"
// and routes to this project's own hub, never the top-level /projects list, without each surface
// re-deriving the route string or the label text independently.
export const projectHubRoute=projectId=>`/projects/${projectId}`;
export const PROJECT_HUB_BACK_LABEL='Project Hub';
export function resumeTargetFor(project){if(project?.resumeTarget?.route&&project.resumeTarget.artifactId)return project.resumeTarget;return{artifactId:'charter',artifactName:'Project Charter',route:charterRoute(project.id),sectionId:'overview',started:Boolean(project?.charter)}}
export function projectResumeCta(project){const target=resumeTargetFor(project);return{target,label:`${target.started?'Continue':'Start'} ${target.artifactName}`}}
export function artifactResume({projectId,artifactId,artifactName,sectionId,started=true}){return{artifactId,artifactName,route:artifactId==='charter'?charterRoute(projectId):documentRoute(projectId,artifactId),sectionId:sectionId||'',started,updatedAt:new Date().toISOString()}}

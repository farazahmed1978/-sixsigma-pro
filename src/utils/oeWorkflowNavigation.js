import {phaseHomeRoute} from '../config/oeProfessionalCadence';

export const OE_WORKFLOW_SCHEMA_VERSION=1;
const value=(search,state,key)=>state?.oeWorkflow?.[key]||state?.[key]||new URLSearchParams(search||'').get(key)||'';
export const phaseRoute=(projectId,phase)=>phaseHomeRoute(projectId,phase);

export function hasOEWorkflowContext(location={}){
 const search=new URLSearchParams(location.search||''),state=location.state||{};
 return Boolean(state.oeWorkflow||state.workflowStep||state.origin||state.returnTo||state.completionTarget||['workflowStep','origin','returnTo','completionTarget'].some(key=>search.has(key)));
}

export function createOEWorkflowContext({project,projectId,phase,workflowStep='',origin='',returnTo='',completionTarget='',nextRecommendedAction=null}={}){
 const id=projectId||project?.id||'';
 const currentPhase=phase||project?.currentPhase||'Define';
 return {schemaVersion:OE_WORKFLOW_SCHEMA_VERSION,projectId:id,phase:currentPhase,workflowStep,origin,returnTo:returnTo||phaseRoute(id,currentPhase),completionTarget,nextRecommendedAction};
}

export function resolveOEWorkflowContext(location={},project=null,{fallback=false}={}){
 if(!fallback&&!hasOEWorkflowContext(location))return null;
 const search=location.search||'',state=location.state||{},projectId=value(search,state,'projectId')||value(search,state,'project')||project?.id||'';
 if(!projectId)return null;
 const phase=value(search,state,'phase')||project?.currentPhase||'Define';
 return createOEWorkflowContext({project,projectId,phase,workflowStep:value(search,state,'workflowStep'),origin:value(search,state,'origin'),returnTo:value(search,state,'returnTo'),completionTarget:value(search,state,'completionTarget'),nextRecommendedAction:state?.oeWorkflow?.nextRecommendedAction||null});
}

export function workflowLocation(path,context={},state={}){
 const workflow=createOEWorkflowContext(context),[pathname,rawSearch='']=String(path).split('?'),query=new URLSearchParams(rawSearch);
 if(workflow.projectId)query.set('project',workflow.projectId);
 ['phase','workflowStep','origin','returnTo','completionTarget'].forEach(key=>{if(workflow[key])query.set(key,workflow[key])});
 return {pathname,search:query.toString()?`?${query}`:'',state:{...state,projectId:workflow.projectId,oeWorkflow:workflow}};
}

export const datasetWorkflowContext=(project,options={})=>createOEWorkflowContext({project,phase:'Measure',workflowStep:'project-dataset',origin:'measure-workflow',completionTarget:`/projects/${project.id}/documents/process-map`,...options});
export const analysisWorkflowContext=(project,phase,step,options={})=>createOEWorkflowContext({project,phase,workflowStep:step,origin:'phase-analysis',completionTarget:phaseRoute(project.id,phase),...options});

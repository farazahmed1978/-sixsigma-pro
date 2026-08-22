import {lifecycleForProject} from '../foundation/lifecycle';
import {projectHubDeepLink} from './projectHub';

export const OE_PROJECT_PHASES=['Define','Measure','Analyze','Improve','Control'];

export function projectContextNavigation(project){
  if(!project||lifecycleForProject(project).id!=='operational-excellence')return null;
  return{
    projectId:project.id,
    projectName:project.name||'Current project',
    suiteId:'operational-excellence',
    phases:OE_PROJECT_PHASES.map(phase=>({id:phase.toLowerCase(),name:phase,path:projectHubDeepLink(project.id,'tollgates',{phase})})),
  };
}

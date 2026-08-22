import React from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useProjects} from '../context/ProjectsContext';
import {isSuite} from '../foundation/lifecycle';
import {resolveOEWorkflowContext,phaseRoute} from '../utils/oeWorkflowNavigation';
import './OEWorkflowNavigation.css';

const label=value=>String(value||'Project activity').replace(/[-_]+/g,' ').replace(/\b\w/g,char=>char.toUpperCase());
export default function OEWorkflowNavigation({project:providedProject,activity='',showContinue=true,className='',fallback=false}){
 const location=useLocation(),projectsContext=useProjects()||{},projects=projectsContext.projects||[],probe=resolveOEWorkflowContext(location,providedProject,{fallback}),project=providedProject||projects.find(item=>item.id===probe?.projectId),workflow=resolveOEWorkflowContext(location,project,{fallback});
 if(!workflow?.projectId||!project||!isSuite(project,'operational-excellence'))return null;
 const back=workflow.returnTo||phaseRoute(workflow.projectId,workflow.phase),continueTo=workflow.completionTarget||workflow.nextRecommendedAction?.destination||'';
 return <aside className={`oe-workflow-navigation ${className}`} aria-label="Operational Excellence workflow context">
  <div><span>PROJECT</span><strong>{project.name}</strong></div><div><span>DMAIC PHASE</span><strong>{workflow.phase}</strong></div><div><span>CURRENT ACTIVITY</span><strong>{activity||label(workflow.workflowStep)}</strong></div>
  <nav><Link to={back}>&larr; Back to {workflow.phase}</Link><Link to={`/projects/${workflow.projectId}`}>Project Home</Link>{showContinue&&continueTo&&<Link className="btn-primary" to={continueTo}>Continue {workflow.phase} &rarr;</Link>}</nav>
 </aside>;
}

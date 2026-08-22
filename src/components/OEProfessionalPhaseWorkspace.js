import React from 'react';
import {Link} from 'react-router-dom';
import {analysisMatches,cadenceForPhase,documentRoute,tollgateRoute} from '../config/oeProfessionalCadence';
import {projectHubDeepLink} from '../utils/projectHub';
import {analysisRoute} from '../utils/analysisContext';
import {analysisWorkflowContext,createOEWorkflowContext,datasetWorkflowContext,workflowLocation} from '../utils/oeWorkflowNavigation';
import './OEProfessionalPhaseWorkspace.css';

const documentFor=(project,id,documents)=>documents.find(item=>item.templateId===id||item.id===id||item.id===`document-${id}`)||project.documents?.[`document-${id}`];
const isComplete=item=>Boolean(item&&(item.status==='complete'||Number(item.completion)>=100||Object.values(item.values||{}).some(value=>Array.isArray(value)?value.length:String(value||'').trim())));
const Step=({step,project,documents,datasets,analyses})=>{
 if(step.kind==='action'){
  const active=datasets.find(item=>item.projectId===project.id&&!item.archivedAt),workflow=datasetWorkflowContext(project),manager=workflowLocation(projectHubDeepLink(project.id,'datasets',{phase:'Measure'}),workflow),worksheet=workflowLocation('/worksheet',workflow,{projectId:project.id,datasetId:active?.id||'',newDataset:!active});
  return <article className={active?'complete':''}><div><i>{active?'✓':'○'}</i><span><b>{step.label}</b><small>{active?`${datasets.filter(item=>item.projectId===project.id&&!item.archivedAt).length} active project dataset(s)`:'Create, select, or open the canonical project dataset.'}</small></span></div><div><Link to={workflowLocation('/worksheet',workflow,{projectId:project.id,newDataset:true})}>Create Dataset</Link><Link to={active?worksheet:manager}>{active?'Open Dataset':'Select Existing'}</Link></div></article>;
 }
 const completed=isComplete(documentFor(project,step.id,documents));
 const workflow=createOEWorkflowContext({project,phase:step.phase||project.currentPhase,workflowStep:step.id,origin:'phase-workspace',completionTarget:`/projects/${project.id}?phase=${encodeURIComponent(project.currentPhase||'Define')}`});
 return <article className={completed?'complete':''}><div><i>{completed?'✓':'○'}</i><span><b>{step.label}</b><small>{step.choice?'Choose one appropriate method; alternatives are not forced.':completed?'Saved project evidence':'Project document'}</small></span></div><Link to={workflowLocation(documentRoute(project.id,step.id),workflow)}>{completed?'Review':'Open'}</Link></article>;
};

export default function OEProfessionalPhaseWorkspace({project,documents=[],datasets=[],analyses=[]}){
 const phase=project.currentPhase||'Define',cadence=cadenceForPhase(phase);
 const completedAnalyses=connection=>analyses.filter(item=>item.projectId===project.id&&analysisMatches(item,connection.toolIds));
 return <section className="oe-phase-workspace" aria-label={`${phase} professional workflow`}>
  <header><div><span>PROFESSIONAL {phase.toUpperCase()} WORKSPACE</span><h2>What should I do next?</h2><p>Complete the core evidence, use conditional methods only when they fit the project, then submit the {phase} Tollgate.</p></div><Link className="btn-primary" to={tollgateRoute(project.id,phase)}>Open {phase} Tollgate →</Link></header>
  <div className="oe-phase-columns">
   <section><h3>Core / required</h3><p>Alternatives marked as choices satisfy the same workflow need.</p><div>{cadence.core.map(step=><Step key={step.id} step={step} project={project} documents={documents} datasets={datasets} analyses={analyses}/>)}</div></section>
   <section><h3>Conditional</h3><p>Use when the project context makes the method relevant.</p><div>{cadence.conditional.length?cadence.conditional.map(step=><Step key={step.id} step={step} project={project} documents={documents} datasets={datasets} analyses={analyses}/>):<em>No additional conditional documents are prescribed.</em>}</div></section>
   <section><h3>Analyses & tools</h3><p>Run a new governed analysis or reuse a canonical project result.</p><div>{cadence.additional.filter(item=>item.kind==='analysis').map(item=>{const existing=completedAnalyses(item),workflow=analysisWorkflowContext(project,phase,item.id);return <article key={item.id} className={existing.length?'complete':''}><div><i>{existing.length?'✓':'↗'}</i><span><b>{item.label}</b><small>{existing.length?`${existing.length} project result(s) available`:item.reason}</small></span></div><div><Link to={analysisRoute(item.route,{projectId:project.id,datasetId:datasets.find(dataset=>dataset.projectId===project.id&&!dataset.archivedAt)?.id||'',workflow})}>Run New</Link><Link to={workflowLocation(projectHubDeepLink(project.id,'analyses',{phase,workflowStep:item.id}),workflow)}>Select Existing</Link></div></article>})}</div></section>
  </div>
 </section>;
}

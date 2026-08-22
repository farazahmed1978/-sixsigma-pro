import React,{useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {analysisMatches} from '../config/oeProfessionalCadence';
import {analysisRoute} from '../utils/analysisContext';
import {createOEWorkflowContext} from '../utils/oeWorkflowNavigation';
import './WorkflowAnalysisConnection.css';

const analysisDate=item=>item.executedAt||item.updatedAt||item.createdAt;
export default function WorkflowAnalysisConnection({projectId,datasetId='',connection,analyses=[],linkedIds=[],onLink}){
 const [selecting,setSelecting]=useState(false);
 const compatible=useMemo(()=>analyses.filter(item=>item.projectId===projectId&&analysisMatches(item,connection.toolIds)),[analyses,connection.toolIds,projectId]);
 const linked=compatible.filter(item=>linkedIds.includes(item.id));
 const phase=connection.phase||({msa:'Measure',capability:'Measure',descriptive:'Measure',histogram:'Measure',hypothesis:'Analyze',anova:'Analyze',regression:'Analyze',multiregression:'Analyze',logistic:'Analyze',correlation:'Analyze',distribution:'Analyze',pareto:'Analyze','fishbone-tool':'Analyze',fmea:'Improve',doe:'Improve',validation:'Improve','control-chart':'Control','attribute-chart':'Control','run-chart':'Control','capability-revalidation':'Control'}[connection.id]||'Analyze'),workflow=createOEWorkflowContext({projectId,phase,workflowStep:connection.id,origin:'document-analysis',completionTarget:`/projects/${projectId}?phase=${phase}`}),location=analysisRoute(connection.route,{projectId,datasetId,workflow});
 return <article className="workflow-analysis-connection" data-analysis-connection={connection.id}>
  <header><div><span>EXECUTABLE ANALYSIS</span><h4>{connection.label}</h4><p>{connection.reason}</p></div><b>{linked.length?`${linked.length} linked`:'Not linked'}</b></header>
  <div className="workflow-analysis-actions"><Link className="btn-primary" to={location}>Run new analysis</Link><button type="button" className="btn-secondary" onClick={()=>setSelecting(value=>!value)}>Select existing</button></div>
  {linked.map(item=><div className="workflow-analysis-linked" key={item.id}><div><strong>{item.title||item.name||connection.label}</strong><small>{analysisDate(item)?new Date(analysisDate(item)).toLocaleDateString():'Date unavailable'}{item.datasetName?` · ${item.datasetName}`:''}</small></div><Link to={{pathname:connection.route,state:{projectId,datasetId:item.datasetIds?.[0]||datasetId,analysisId:item.id}}}>Open analysis</Link></div>)}
  {selecting&&<div className="workflow-analysis-picker">{compatible.length?compatible.map(item=><label key={item.id}><input type="checkbox" checked={linkedIds.includes(item.id)} onChange={()=>onLink(item.id)} /><span><b>{item.title||item.name||connection.label}</b><small>{analysisDate(item)?new Date(analysisDate(item)).toLocaleDateString():'Saved project analysis'}</small></span></label>):<p>No compatible completed analyses are available in this project. Run a new analysis first.</p>}</div>}
 </article>;
}

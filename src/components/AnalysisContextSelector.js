import React,{useEffect,useMemo,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {useProjects} from '../context/ProjectsContext';
import {useWorksheet} from '../context/WorksheetContext';
import {projectDatasetsFor,resolveAnalysisDataset} from '../utils/analysisContext';
import OEWorkflowNavigation from './OEWorkflowNavigation';
import './AnalysisContextSelector.css';

export default function AnalysisContextSelector(){
 const location=useLocation(),{projects}=useProjects(),{datasets,activeDatasetId,switchDataset}=useWorksheet();
 const requestedProject=location.state?.projectId||new URLSearchParams(location.search).get('project')||'';
 const [projectId,setProjectId]=useState(()=>requestedProject||datasets.find(item=>item.id===activeDatasetId)?.projectId||'');
 const available=useMemo(()=>projectDatasetsFor(datasets,projectId),[datasets,projectId]);
 useEffect(()=>{if(requestedProject)setProjectId(requestedProject)},[requestedProject]);
 useEffect(()=>{const selected=resolveAnalysisDataset({datasets,projectId,requestedDatasetId:location.state?.datasetId,currentDatasetId:activeDatasetId});if(selected!==activeDatasetId)switchDataset(selected)},[activeDatasetId,datasets,location.state?.datasetId,projectId,switchDataset]);
 const changeProject=id=>{setProjectId(id);const next=resolveAnalysisDataset({datasets,projectId:id,requestedDatasetId:'',currentDatasetId:''});switchDataset(next)};
 const project=projects.find(item=>item.id===projectId);
 return <><OEWorkflowNavigation project={project}/><section className="analysis-context-selector" aria-label="Analysis data context"><div><span>ANALYSIS DATA CONTEXT</span><p>Choose the canonical project dataset used by this analysis.</p></div><label>Project<select aria-label="Analysis project" value={projectId} onChange={event=>changeProject(event.target.value)}><option value="">Select project</option>{projects.map(project=><option value={project.id} key={project.id}>{project.name}</option>)}</select></label><label>Dataset<select aria-label="Analysis dataset" value={available.some(item=>item.id===activeDatasetId)?activeDatasetId:''} disabled={!projectId} onChange={event=>switchDataset(event.target.value)}><option value="">{available.length?'Select dataset':'No project datasets'}</option>{available.map(dataset=><option value={dataset.id} key={dataset.id}>{dataset.name}</option>)}</select></label></section></>;
}

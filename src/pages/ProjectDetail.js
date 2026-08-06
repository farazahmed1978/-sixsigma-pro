import React,{useMemo,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useProjects} from '../context/ProjectsContext';
import {useWorksheet} from '../context/WorksheetContext';
import {useAnalysis} from '../context/AnalysisContext';
import {useReport} from '../context/ReportContext';
import './ProjectDetail.css';

const TABS=['Project Home','Documents','Datasets','Analyses','Reports','Evidence Library'];
const phaseDocs={Define:'charter',Measure:'data-collection-plan',Analyze:'hypothesis-plan',Improve:'factorial-plan',Control:'control-plan'};
const formatDate=value=>value?new Date(value).toLocaleDateString():'Not recorded';

function Empty({title,body,action}){return <div className="ph-empty"><div>◇</div><h3>{title}</h3><p>{body}</p>{action}</div>;}

export default function ProjectDetail(){
 const {id}=useParams();
 const {getProject,addEvidence,removeEvidence}=useProjects();
 const {datasets}=useWorksheet();
 const {analysisResults}=useAnalysis();
 const {items:reportItems}=useReport();
 const [tab,setTab]=useState('Project Home');
 const project=getProject(id);
 const projectDatasets=datasets.filter(item=>item.projectId===id);
 const projectAnalyses=analysisResults.filter(item=>item.projectId===id);
 const projectReports=reportItems.filter(item=>item.projectId===id);
 const documents=useMemo(()=>Object.values(project?.documents||{}),[project]);
 const evidence=project?.evidenceLibrary||[];
 if(!project)return <div className="ph-not-found"><h1>Project not found</h1><Link className="btn-primary" to="/projects">Back to Projects</Link></div>;

 const saveAnalysis=analysis=>addEvidence(id,{title:analysis.title||analysis.name||'Completed Analysis',assetType:'analysis',sourceType:'analysisResult',sourceId:analysis.id,analysisIds:[analysis.id],datasetIds:analysis.datasetIds||[],summary:analysis.interpretation||analysis.summary||'',phase:analysis.phase||''});
 const renderTab=()=>{
  if(tab==='Project Home')return <><div className="ph-metrics"><div><span>Documents</span><strong>{documents.length+(project.charter?1:0)}</strong></div><div><span>Datasets</span><strong>{projectDatasets.length}</strong></div><div><span>Analyses</span><strong>{projectAnalyses.length}</strong></div><div><span>Reports</span><strong>{projectReports.length}</strong></div><div><span>Evidence</span><strong>{evidence.length}</strong></div></div><section className="ph-section"><div className="ph-section-title"><div><span>QUICK ACTIONS</span><h2>Continue project work</h2></div></div><div className="ph-actions"><Link to={`/projects/${id}/charter`}><b>📋</b><span>Project Charter<small>Define project authorization</small></span></Link><Link to={`/projects/${id}/documents/minutes`}><b>📝</b><span>Meeting Minutes<small>Capture decisions and actions</small></span></Link><Link to="/worksheet"><b>▦</b><span>Data Worksheet<small>Manage project datasets</small></span></Link><Link to="/report"><b>▤</b><span>Report Builder<small>Assemble executive reporting</small></span></Link></div></section><section className="ph-section"><div className="ph-section-title"><div><span>DMAIC</span><h2>Phase workspaces</h2></div></div><div className="ph-phases">{Object.entries(phaseDocs).map(([phase,documentId])=><Link key={phase} to={documentId==='charter'?`/projects/${id}/charter`:`/projects/${id}/documents/${documentId}`}><i className={`badge-${phase.toLowerCase()}`}>{phase.charAt(0)}</i><strong>{phase}</strong><span>Open workspace →</span></Link>)}</div></section></>;
  if(tab==='Documents')return documents.length||project.charter?<div className="ph-grid">{project.charter&&<Link className="ph-card" to={`/projects/${id}/charter`}><span>DEFINE</span><h3>Project Charter</h3><p>Updated {formatDate(project.charter.updatedAt)}</p></Link>}{documents.map(document=><Link className="ph-card" key={document.id} to={`/projects/${id}/documents/${document.templateId}`}><span>{document.status||'Draft'}</span><h3>{document.title}</h3><p>Updated {formatDate(document.updatedAt)}</p></Link>)}</div>:<Empty title="No project documents yet" body="Open a DMAIC or PMP workspace to create the first project document." action={<Link className="btn-primary" to="/templates">Document Library</Link>}/>;
  if(tab==='Datasets')return projectDatasets.length?<div className="ph-grid">{projectDatasets.map(dataset=><article className="ph-card" key={dataset.id}><span>DATASET</span><h3>{dataset.name}</h3><p>{dataset.columns.length} columns · Updated {formatDate(dataset.updatedAt)}</p></article>)}</div>:<Empty title="No project datasets" body="Assign or create a dataset from the Data Worksheet." action={<Link className="btn-primary" to="/worksheet">Open Worksheet</Link>}/>;
  if(tab==='Analyses')return projectAnalyses.length?<div className="ph-grid">{projectAnalyses.map(analysis=><article className="ph-card" key={analysis.id}><span>{analysis.phase||'ANALYSIS'}</span><h3>{analysis.title||analysis.name||analysis.id}</h3><p>{formatDate(analysis.createdAt)}</p><button className="btn-secondary" onClick={()=>saveAnalysis(analysis)}>Save to Evidence</button></article>)}</div>:<Empty title="No completed analyses" body="Completed statistical analyses connected to this project will appear here."/>;
  if(tab==='Reports')return projectReports.length?<div className="ph-grid">{projectReports.map(report=><article className="ph-card" key={report.id}><span>REPORT ASSET</span><h3>{report.title}</h3><p>{formatDate(report.timestamp)}</p></article>)}</div>:<Empty title="No project reports" body="Add document or analysis outputs to the Report Builder." action={<Link className="btn-primary" to="/report">Open Report Builder</Link>}/>;
  return evidence.length?<div className="ph-grid">{evidence.map(item=><article className="ph-card ph-evidence" key={item.id}><span>{item.assetType||'EVIDENCE'}</span><h3>{item.title}</h3><p>{item.summary||`Saved from ${item.sourceType||'a project asset'}.`}</p><footer><small>{formatDate(item.createdAt)}</small><button onClick={()=>{if(window.confirm(`Remove “${item.title}” from Evidence Library?`))removeEvidence(id,item.id);}}>Remove</button></footer></article>)}</div>:<Empty title="Evidence Library is ready" body="Save completed histograms, control charts, capability studies, hypothesis tests, ANOVA, regression, DOE, FMEA, and other analysis outputs here. Evidence stores references to existing assets rather than duplicating calculations."/>;
 };

 return <div className="project-hub"><header className="ph-header"><div className="ph-breadcrumb"><Link to="/projects">Projects</Link><span>/</span><strong>{project.name}</strong></div><div className="ph-title"><div><span>PROJECT HUB</span><h1>{project.name}</h1><p>{project.goal||'Operational Excellence project workspace'}</p></div><div><span>Owner<strong>{project.owner||'Not assigned'}</strong></span><span>Sponsor<strong>{project.champion||'Not assigned'}</strong></span><span>Created<strong>{formatDate(project.createdAt)}</strong></span></div></div><nav>{TABS.map(item=><button key={item} className={tab===item?'active':''} onClick={()=>setTab(item)}>{item}{item==='Evidence Library'&&evidence.length>0?<i>{evidence.length}</i>:null}</button>)}</nav></header><main>{renderTab()}</main></div>;
}

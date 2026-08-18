import React,{useMemo,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ANALYTICS_CATALOG} from '../config/analyticsCatalog';
import AnalysisContextSelector from '../components/AnalysisContextSelector';
import {useWorksheet} from '../context/WorksheetContext';
import {useProjects} from '../context/ProjectsContext';
import {analysisRoute} from '../utils/analysisContext';
import {isSuite} from '../foundation/lifecycle';
import HelpButton from '../components/HelpButton';
import {projectHubRoute, PROJECT_HUB_BACK_LABEL} from '../utils/projectResume';

export default function AnalysisLauncher(){
 const location=useLocation(),{activeDataset,datasets}=useWorksheet(),{getProject}=useProjects(),[query,setQuery]=useState(''),[family,setFamily]=useState('All');
 const families=['All',...new Set(ANALYTICS_CATALOG.map(item=>item.family))];
 const methods=useMemo(()=>ANALYTICS_CATALOG.filter(item=>(family==='All'||item.family===family)&&`${item.name} ${item.family} ${item.aliases.join(' ')}`.toLowerCase().includes(query.toLowerCase())),[family,query]);
 const projectId=location.state?.projectId||activeDataset?.projectId||'',owned=datasets.filter(item=>item.projectId===projectId&&!item.archivedAt),datasetId=location.state?.datasetId||(location.state?.projectId?(owned.length===1?owned[0].id:''):(activeDataset?.projectId===projectId?activeDataset.id:'')),context={projectId,datasetId};
 // Suite isolation guard: the OE statistical Analysis Catalog must never render for a PM project's
 // context, even if the route itself is reachable (e.g. a dual-suite org, a stale link, or direct
 // URL entry) — no PM-specific analysis tools exist yet, so a PM project gets a clear explanation
 // and a way back instead of a wall of OE tools it has no use for.
 const project=projectId?getProject(projectId):null;
 if(project&&isSuite(project,'project-management'))return <main className="templates-page"><div className="templates-header"><span>PROJECT ANALYSIS</span><h1>Analysis Catalog</h1><p>Statistical analysis tools are built for Operational Excellence projects and aren't available for Project Management projects yet.</p></div><Link className="btn-primary" to={projectHubRoute(projectId)}>&larr; Back to {PROJECT_HUB_BACK_LABEL}</Link></main>;
 return <main className="templates-page"><div className="templates-header"><span>PROJECT ANALYSIS</span><h1>Analysis Catalog<HelpButton surfaceId="analysis-catalog" suiteId="operational-excellence"/></h1><p>Select the project dataset, then choose a governed analysis method.</p>{projectId&&<Link to={projectHubRoute(projectId)}>&larr; Back to {PROJECT_HUB_BACK_LABEL}</Link>}</div><AnalysisContextSelector/><div className="library-controls"><label>Search methods<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Hypothesis, capability, regression…"/></label><label>Family<select value={family} onChange={event=>setFamily(event.target.value)}>{families.map(value=><option key={value}>{value}</option>)}</select></label></div><div className="template-grid">{methods.map(method=><article className="template-card" key={method.id}><span>{method.family}</span><h3>{method.name}</h3><p>{method.guidance?.whenToUse||method.question||method.assumptions.join(' · ')||'Project-connected statistical analysis'}</p><Link className="btn-primary" to={analysisRoute(method.route,{...context,methodId:method.id})}>Open Analysis →</Link></article>)}</div></main>;
}

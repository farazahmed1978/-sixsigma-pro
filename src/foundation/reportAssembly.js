import {sortReportItemsByPhase} from '../context/ReportContext';

export const REPORT_PHASES=['Define','Measure','Analyze','Improve','Control'];
const analysisPhase={hypothesis:'Analyze',anova:'Analyze',regression:'Analyze',multiregression:'Analyze',logistic:'Analyze','distribution-analysis':'Analyze','doe-rsm':'Improve',doe:'Improve','control-chart':'Control','attribute-chart':'Control','capability-analysis':'Measure',capability:'Measure',msa:'Measure'};
export const phaseForReportItem=item=>REPORT_PHASES.includes(item?.phase)?item.phase:analysisPhase[item?.toolId]||(item?.documentId?'Define':'Analyze');
export const validReportItem=item=>Boolean(item&&typeof item==='object'&&item.id&&item.title);
export function assembleReportModel(items=[]){const diagnostics=[],valid=[];(Array.isArray(items)?items:[]).forEach((item,index)=>{if(!validReportItem(item)){diagnostics.push({index,reason:'Malformed report item skipped'});return}valid.push({...item,phase:phaseForReportItem(item),reportOrder:index})});const ordered=sortReportItemsByPhase(valid).sort((a,b)=>a.phase===b.phase?a.reportOrder-b.reportOrder:REPORT_PHASES.indexOf(a.phase)-REPORT_PHASES.indexOf(b.phase));return{items:ordered,sections:REPORT_PHASES.map(phase=>({phase,items:ordered.filter(item=>item.phase===phase)})),diagnostics}}

import React from 'react';
import './AnalysisPrintResult.css';

const finite=value=>Number.isFinite(Number(value));
const shown=value=>finite(value)?Number(value).toLocaleString(undefined,{maximumFractionDigits:6}):String(value??'—');
const assumptionSummary=report=>{
 const summary=report?.summary;
 if(summary&&typeof summary==='object')return Object.entries(summary).filter(([,count])=>count>0).map(([status,count])=>`${status.replaceAll('_',' ')}: ${count}`).join(' · ');
 return summary||report?.overallStatus||report?.status||'Review the recorded assumption diagnostics with the analysis result.';
};
const assumptionDetails=report=>(report?.diagnostics||[]).map((diagnostic,index)=>({
 id:diagnostic.id||`assumption-${index}`,
 name:diagnostic.label||diagnostic.name||diagnostic.id||`Assumption ${index+1}`,
 status:diagnostic.status||'NOT ASSESSABLE',
 finding:diagnostic.message||diagnostic.finding||'',
 explanation:diagnostic.implication||diagnostic.explanation||'',
 nextStep:diagnostic.recommendedNextStep||diagnostic.recommendation||'',
 evidence:diagnostic.method&&Number.isFinite(diagnostic.statistic)?`${diagnostic.method}: statistic ${shown(diagnostic.statistic)}${Number.isFinite(diagnostic.pValue)?` · p ${diagnostic.pValue<.001?'< .001':shown(diagnostic.pValue)}`:''}`:'',
}));
export function analysisPrintModel({title,projectName,datasetName,testId,result,interpretation,assumptionReport}){
 const canonicalAssumptions=assumptionReport||result?.assumptionReport;
 const hypothesis=testId==='1t'?['H₀: μ = μ₀','H₁: μ ≠ μ₀']:[];
 const p=result?.pValue??result?.p,significant=finite(p)&&Number(p)<.05;
 const stats=[['n',result?.n],['Mean',result?.mean],['Standard deviation',result?.standardDeviation??result?.stddev],['t statistic',result?.statistic??result?.t],['df',result?.df],['p-value',p],['Confidence interval',result?.confidenceInterval??result?.ci]].filter(([,value])=>value!==undefined);
 return{title:title||'Analysis Result',projectName:projectName||'',datasetName:datasetName||'',hypothesis,stats:stats.map(([label,value])=>[label,Array.isArray(value)?`[${value.map(shown).join(', ')}]`:shown(value)]),verdict:significant?'Statistically significant':'Not statistically significant',interpretation:interpretation||'',assumptions:assumptionSummary(canonicalAssumptions),assumptionDetails:assumptionDetails(canonicalAssumptions)};
}
export default function AnalysisPrintResult(props){const model=analysisPrintModel(props);return <article className="analysis-print-result print-only" aria-label="Printable analysis result"><header><span>AUREQIN · ANALYSIS RESULT</span><h1>{model.title}</h1>{model.projectName&&<p><strong>Project:</strong> {model.projectName}</p>}{model.datasetName&&<p><strong>Dataset:</strong> {model.datasetName}</p>}</header>{model.hypothesis.length>0&&<section><h2>Hypotheses</h2>{model.hypothesis.map(value=><p className="analysis-print-symbol" key={value}>{value}</p>)}</section>}<section><h2>Statistical result</h2><strong className="analysis-print-verdict">{model.verdict}</strong><dl>{model.stats.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>{model.interpretation&&<section><h2>Interpretation</h2><p>{model.interpretation}</p></section>}<section className="analysis-print-assumptions"><h2>Assumption evidence</h2><p className="analysis-print-assumption-summary">{String(model.assumptions)}</p>{model.assumptionDetails.map(item=><article className="analysis-print-assumption" key={item.id}><div className="analysis-print-assumption-heading"><h3>{item.name}</h3><strong>{item.status.replaceAll('_',' ')}</strong></div>{item.finding&&<p><b>Finding:</b> {item.finding}</p>}{item.explanation&&<p><b>Why it matters:</b> {item.explanation}</p>}{item.nextStep&&<p><b>Consider next:</b> {item.nextStep}</p>}{item.evidence&&<p className="analysis-print-assumption-evidence">{item.evidence}</p>}</article>)}</section></article>}

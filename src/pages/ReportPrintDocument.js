import React from 'react';
import CTQTreeDiagram from '../components/CTQTreeDiagram';
import './ReportPrintPreview.css';

export const inspectReportPrintDom=target=>{
 const artifacts=[...(target?.querySelectorAll?.('[data-report-artifact-id]')||[])],phases=[...(target?.querySelectorAll?.('[data-report-phase]')||[])],ids=artifacts.map(node=>node.dataset.reportArtifactId),duplicateIds=ids.filter((id,index)=>ids.indexOf(id)!==index);
 return{artifactCount:artifacts.length,artifactIds:ids,phaseCount:phases.length,phases:phases.map(node=>node.dataset.reportPhase),duplicateIds:[...new Set(duplicateIds)]};
};

const labelFor=value=>value.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ').replace(/^./,letter=>letter.toUpperCase());
const printableRows=item=>item.includeRawData&&Array.isArray(item.rawData)?item.rawData:[];

function PrintTable({rows}){
 if(!rows.length)return null;
 const columns=[...new Set(rows.flatMap(row=>row&&typeof row==='object'?Object.keys(row):[]))];
 if(!columns.length)return null;
 return <div className="report-print-table-wrap"><table className="report-print-table"><thead><tr>{columns.map(column=><th key={column}>{labelFor(column)}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{columns.map(column=><td key={column}>{String(row?.[column]??'')}</td>)}</tr>)}</tbody></table></div>;
}

function PrintArtifact({item,index,project}){
 const ctq=item.documentSnapshot?.templateId==='ctq-tree';
 return <div className={`report-print-artifact ${ctq?'report-print-ctq':''}`} data-report-artifact-id={item.id}><div className="print-fields-grid cols-1"><div className="print-field report-print-field"><div className="print-field-label">{index+1}. {item.title}</div><div className="print-field-value multiline">{item.interpretation||'Structured project document'}</div></div></div>{Object.keys(item.statsSummary||{}).length>0&&<div className="report-print-stats">{Object.entries(item.statsSummary).map(([key,value])=><div className="report-print-stat" key={key}><b>{labelFor(key)}</b><span>{String(value)}</span></div>)}</div>}{item.chartImage&&<img className="report-print-chart" src={item.chartImage} alt={`${item.title} chart`}/>}<PrintTable rows={printableRows(item)}/>{ctq&&<CTQTreeDiagram branches={item.documentSnapshot.values?.ctqTree||[]} projectName={project?.name}/>}</div>;
}

export function ReportPrintDocument({reportTitle,preparedBy,project,reportModel}){
 return <article className="print-doc report-print-document"><header className="print-header"><div className="print-logo-block"><div className="print-brand">AUREQIN</div></div><div className="print-header-center"><div className="print-doc-type">DMAIC Project Report</div><div className="print-doc-title">{reportTitle}</div></div><div className="print-header-meta"><div>{project?.name||'Project'}</div><div>Prepared by {preparedBy||'—'}</div><div>{new Date().toLocaleDateString()}</div></div></header><section className="print-section report-print-section"><div className="print-section-title">PROJECT</div><div className="print-fields-grid cols-1"><div className="print-field report-print-field"><div className="print-field-label">Project summary</div><div className="print-field-value multiline">{project?.goal||'Not yet established'}</div></div></div></section>{reportModel.sections.map(({phase,items:phaseItems})=>phaseItems.length?<section className="print-section report-print-section" data-report-phase={phase} key={phase}><div className="print-section-title">{phase.toUpperCase()}</div>{phaseItems.map((item,index)=><PrintArtifact item={item} index={index} project={project} key={item.id}/>)}</section>:null)}<section className="print-section report-print-section"><div className="print-section-title">PROJECT CLOSURE</div><div className="print-fields-grid cols-1"><div className="print-field report-print-field"><div className="print-field-value multiline">{project?.closureSummary||'Not yet established'}</div></div></div></section></article>;
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {syncService} from '../services/syncService';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useReport } from '../context/ReportContext';
import { useWorksheet } from '../context/WorksheetContext';
import { useAnalysis } from '../context/AnalysisContext';
import WorkspaceShell from './WorkspaceShell';
import ExpandableEditor from './ExpandableEditor';
import { createDocument, documentIdFor, documentScores, textValue } from '../utils/documentModel';
import './DocumentWorkspace.css';

const rowId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function MultilineField({ field, value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  return <div className={`dw-field ${field.span ? 'wide' : ''}`}><div className="dw-field-label"><label>{field.label}{field.required !== false && <i>Required</i>}</label><button type="button" onClick={() => setExpanded(true)} title={`Expand ${field.label}`} aria-label={`Expand ${field.label}`}>&#10530;</button></div><textarea rows="6" value={value || ''} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} />{expanded && <ExpandableEditor label={field.label} value={value || ''} onChange={onChange} onClose={() => setExpanded(false)} />}</div>;
}

function TableCell({ column, value, onChange, rowIndex, columnIndex }) {
  const [expanded, setExpanded] = useState(false);
  const moveFocus = event => {
    const keyMap = { ArrowRight:[0,1], ArrowLeft:[0,-1], ArrowDown:[1,0], ArrowUp:[-1,0] };
    if (!keyMap[event.key] || event.altKey || event.ctrlKey || event.metaKey) return;
    const [rowDelta,columnDelta] = keyMap[event.key];
    const target = document.querySelector(`[data-dw-cell="${rowIndex + rowDelta}:${columnIndex + columnDelta}"]`);
    if (target) { event.preventDefault(); target.focus(); }
  };
  const control = column.type === 'select' ? <select data-dw-cell={`${rowIndex}:${columnIndex}`} value={value || ''} onChange={event => onChange(event.target.value)} onKeyDown={moveFocus}><option value="">Select</option>{column.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : <input type={column.type || 'text'} data-dw-cell={`${rowIndex}:${columnIndex}`} value={value || ''} onChange={event => onChange(event.target.value)} onKeyDown={moveFocus} />;
  return <div className="dw-cell">{control}{column.multiline && <button type="button" onClick={() => setExpanded(true)} aria-label={`Expand ${column.label}`}>&#10530;</button>}{expanded && <ExpandableEditor label={column.label} value={value || ''} onChange={onChange} onClose={() => setExpanded(false)} />}</div>;
}

function StructuredTable({ field, rows = [], onChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const columns = field.columns || [];
  const add = () => onChange([...rows, { id:rowId(field.id), ...Object.fromEntries(columns.map(column => [column.key,''])) }]);
  const reorder = targetIndex => {
    if (dragIndex === null || dragIndex === targetIndex) return setDragIndex(null);
    const next = [...rows]; const [moved] = next.splice(dragIndex,1); next.splice(targetIndex,0,moved); onChange(next); setDragIndex(null);
  };
  const summaries=(field.summaries||[]).map(summary=>{const numbers=rows.map(row=>Number(row[summary.key])).filter(Number.isFinite);const result=summary.operation==='average'?(numbers.length?numbers.reduce((a,b)=>a+b,0)/numbers.length:0):numbers.reduce((a,b)=>a+b,0);return{...summary,value:Math.round(result*100)/100};});
  return <div className="dw-table"><div className="dw-table-heading"><div><h3>{field.label}{field.required !== false && <i>Required</i>}</h3><p>{field.help}</p></div><button type="button" className="btn-secondary" onClick={add}>+ Add row</button></div><div className="dw-table-scroll"><table><thead><tr><th aria-label="Reorder" />{columns.map(column => <th key={column.key}>{column.label}</th>)}<th aria-label="Actions" /></tr></thead><tbody>{rows.map((row,rowIndex) => <tr key={row.id} draggable onDragStart={() => setDragIndex(rowIndex)} onDragOver={event => event.preventDefault()} onDrop={() => reorder(rowIndex)} className={dragIndex === rowIndex ? 'dragging' : ''}><td><button type="button" className="dw-drag" title="Drag to reorder" aria-label={`Reorder row ${rowIndex + 1}`}>⋮⋮</button></td>{columns.map((column,columnIndex) => <td key={column.key}><TableCell column={column} value={row[column.key]} rowIndex={rowIndex} columnIndex={columnIndex} onChange={value => onChange(rows.map(item => item.id === row.id ? {...item,[column.key]:value} : item))} /></td>)}<td><button type="button" className="dw-delete" aria-label={`Delete row ${rowIndex + 1}`} onClick={() => onChange(rows.filter(item => item.id !== row.id))}>&times;</button></td></tr>)}</tbody></table></div>{!rows.length && <button type="button" className="dw-table-empty" onClick={add}>Add the first row</button>}{summaries.length>0&&<div className="dw-table-summary">{summaries.map(summary=><div key={summary.label}><span>{summary.label}</span><strong>{summary.value}</strong></div>)}</div>}</div>;
}

function FlowBuilder({ field, nodes = [], onChange }) {
  const [dragIndex,setDragIndex]=useState(null);
  const add=kind=>onChange([...nodes,{id:rowId('node'),kind,step:'',owner:'',department:'',input:'',output:'',connector:'Next',handoff:''}]);
  const update=(id,key,value)=>onChange(nodes.map(node=>node.id===id?{...node,[key]:value}:node));
  const drop=target=>{if(dragIndex===null)return;const next=[...nodes];const[moved]=next.splice(dragIndex,1);next.splice(target,0,moved);onChange(next);setDragIndex(null);};
  return <div className="dw-flow"><div className="dw-table-heading"><div><h3>{field.label}<i>Required</i></h3><p>Drag nodes to reorder and edit connectors to describe the actual flow.</p></div><div><button type="button" className="btn-secondary" onClick={()=>add('Process')}>+ Process</button><button type="button" className="btn-secondary" onClick={()=>add('Decision')}>+ Decision</button></div></div><div className="dw-flow-list">{nodes.map((node,index)=><article key={node.id} draggable onDragStart={()=>setDragIndex(index)} onDragOver={event=>event.preventDefault()} onDrop={()=>drop(index)}><header><span>{index+1}</span><select value={node.kind} onChange={event=>update(node.id,'kind',event.target.value)}><option>Process</option><option>Decision</option><option>Input</option><option>Output</option></select><button type="button" onClick={()=>onChange(nodes.filter(item=>item.id!==node.id))}>&times;</button></header><div><label>Step<input value={node.step} onChange={event=>update(node.id,'step',event.target.value)} /></label>{field.mode==='swimlane'?<><label>Department<input value={node.department} onChange={event=>update(node.id,'department',event.target.value)} /></label><label>Role / Owner<input value={node.owner} onChange={event=>update(node.id,'owner',event.target.value)} /></label><label>Handoff<input value={node.handoff} onChange={event=>update(node.id,'handoff',event.target.value)} /></label></>:<><label>Owner<input value={node.owner} onChange={event=>update(node.id,'owner',event.target.value)} /></label><label>Input<input value={node.input} onChange={event=>update(node.id,'input',event.target.value)} /></label><label>Output<input value={node.output} onChange={event=>update(node.id,'output',event.target.value)} /></label></>}<label>Connector<input value={node.connector} onChange={event=>update(node.id,'connector',event.target.value)} /></label></div>{index<nodes.length-1&&<b className="dw-connector">↓ {node.connector||'Next'}</b>}</article>)}</div>{!nodes.length&&<button type="button" className="dw-table-empty" onClick={()=>add('Process')}>Add the first process node</button>}</div>;
}

function CTQTree({ field, branches = [], onChange }) {
  const add = () => onChange([...branches,{ id:rowId('ctq'), need:'', driver:'', ctq:'', specification:'', collapsed:false }]);
  const update = (id,key,value) => onChange(branches.map(branch => branch.id === id ? {...branch,[key]:value} : branch));
  return <div className="dw-tree"><div className="dw-table-heading"><div><h3>{field.label}<i>Required</i></h3><p>{field.help}</p></div><button type="button" className="btn-secondary" onClick={add}>+ Add branch</button></div>{branches.map((branch,index) => <article key={branch.id} className={branch.collapsed ? 'collapsed' : ''}><header><button type="button" onClick={() => update(branch.id,'collapsed',!branch.collapsed)} aria-label={branch.collapsed ? 'Expand branch' : 'Collapse branch'}>{branch.collapsed ? '▸' : '▾'}</button><strong>Branch {index + 1}</strong><span>{branch.need || 'Customer need not defined'}</span><button type="button" className="dw-delete" onClick={() => onChange(branches.filter(item => item.id !== branch.id))}>&times;</button></header>{!branch.collapsed && <div className="dw-tree-path">{[['need','Need'],['driver','Driver'],['ctq','CTQ'],['specification','Specification']].map(([key,label],step) => <React.Fragment key={key}><label><span>{label}</span><input value={branch[key]} onChange={event => update(branch.id,key,event.target.value)} placeholder={`Enter ${label.toLowerCase()}`} /></label>{step < 3 && <b>→</b>}</React.Fragment>)}</div>}</article>)}{!branches.length && <button type="button" className="dw-table-empty" onClick={add}>Add the first CTQ branch</button>}</div>;
}

function Field({ field, value, onChange }) {
  if (field.type === 'textarea') return <MultilineField field={field} value={value} onChange={onChange} />;
  if (field.type === 'table') return <StructuredTable field={field} rows={Array.isArray(value) ? value : []} onChange={onChange} />;
  if (field.type === 'tree') return <CTQTree field={field} branches={Array.isArray(value) ? value : []} onChange={onChange} />;
  if (field.type === 'flow') return <FlowBuilder field={field} nodes={Array.isArray(value)?value:[]} onChange={onChange} />;
  return <div className={`dw-field ${field.span ? 'wide' : ''}`}><label>{field.label}{field.required !== false && <i>Required</i>}</label>{field.type==='select'?<select value={value||''} onChange={event=>onChange(event.target.value)}><option value="">Select</option>{field.options.map(option=><option key={option}>{option}</option>)}</select>:<input type={field.type === 'date' ? 'date' : 'text'} value={value || ''} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} />}</div>;
}

function AssetReferences({ project, references, datasets, analyses, evidence, reports, onChange, onClose }) {
  const groups=[
    {key:'datasetIds',label:'Datasets',items:datasets.filter(item=>item.projectId===project.id)},
    {key:'analysisIds',label:'Statistical Analyses',items:analyses.filter(item=>item.projectId===project.id)},
    {key:'evidenceIds',label:'Evidence',items:evidence},
    {key:'reportIds',label:'Reports',items:reports.filter(item=>!item.projectId||item.projectId===project.id)},
    {key:'documentIds',label:'Project Documents',items:Object.values(project.documents||{})},
  ];
  const toggle=(key,id)=>onChange({...references,[key]:(references[key]||[]).includes(id)?references[key].filter(item=>item!==id):[...(references[key]||[]),id]});
  return <div className="dw-assets" role="dialog" aria-modal="true" aria-label="Linked project assets"><button type="button" className="dw-assets-backdrop" onClick={onClose} aria-label="Close linked assets" /><section><header><div><span>PROJECT CONTEXT</span><h2>Linked Assets</h2><p>References remain stable IDs so future automation and AI can retrieve the latest project asset.</p></div><button type="button" onClick={onClose}>&times;</button></header>{groups.map(group=><div key={group.key}><h3>{group.label}<small>{(references[group.key]||[]).length} linked</small></h3>{group.items.length?<div className="dw-asset-list">{group.items.map(item=><label key={item.id}><input type="checkbox" checked={(references[group.key]||[]).includes(item.id)} onChange={()=>toggle(group.key,item.id)} /><span>{item.name||item.title||item.datasetName||item.id}</span></label>)}</div>:<p>No compatible {group.label.toLowerCase()} are available for this project.</p>}</div>)}</section></div>;
}

export default function DocumentWorkspace({ template, project, updateProject }) {
  const { addReportItem, items:reportItems } = useReport();
  const { datasets } = useWorksheet();
  const { analysisResults } = useAnalysis();
  const stored = project.documents?.[documentIdFor(template.id)];
  const [record,setRecord] = useState(() => createDocument(template,project.id,stored));
  const [activeIndex,setActiveIndex] = useState(0);
  const [mode,setMode] = useState('normal');
  const [guideOpen,setGuideOpen] = useState(true);
  const [saveState,setSaveState] = useState('saved');
  const [notice,setNotice] = useState('');
  const [assetsOpen,setAssetsOpen] = useState(false);
  const workspaceRef = useRef(null);
  const documentsRef = useRef(project.documents || {}); documentsRef.current = project.documents || {};
  const activityRef = useRef(project.activityLog || []); activityRef.current = project.activityLog || [];
  const hydratedKey = useRef(`${project.id}:${template.id}`);
  const current = template.sections[activeIndex];
  const scores = useMemo(() => documentScores(template,record.values),[template,record.values]);

  useEffect(() => { const key=`${project.id}:${template.id}`; if(hydratedKey.current!==key){setRecord(createDocument(template,project.id,project.documents?.[documentIdFor(template.id)]));setActiveIndex(0);hydratedKey.current=key;} },[project,template]);
  const persist = useCallback(next => { const saved={...next,updatedAt:new Date().toISOString()};syncService.bufferDraft(saved.id,saved,saved.updatedAt); const activity={id:`activity-${Date.now()}`,action:`Updated ${template.name}`,assetType:'document',assetId:saved.id,at:saved.updatedAt}; updateProject(project.id,{documents:{...documentsRef.current,[saved.id]:saved},activityLog:[activity,...activityRef.current.filter(item=>!(item.assetType==='document'&&item.assetId===saved.id))].slice(0,100)});if(navigator.onLine)syncService.clearDraft(saved.id); },[project.id,template.name,updateProject]);
  useEffect(() => { setSaveState(navigator.onLine?'saving':'offline'); const timer=window.setTimeout(() => {persist(record);setSaveState(navigator.onLine?'saved':'offline');},700); return()=>window.clearTimeout(timer); },[persist,record]);

  const updateValue=(id,value)=>setRecord(previous=>{const values={...previous.values,[id]:value};const calculated=template.calculate?.(values);return{...previous,values:calculated?{...values,...calculated}:values};});
  const sectionComplete=section=>section.fields.filter(field=>field.required!==false).every(field=>Array.isArray(record.values[field.id]) ? record.values[field.id].length>0 : Boolean(textValue(record.values[field.id])));
  const saveNow=()=>{persist(record);setSaveState('saved');setNotice('Document saved');};
  const print=()=>window.print();
  const exportPdf=async()=>{setNotice('Preparing PDF...');const canvas=await html2canvas(workspaceRef.current,{scale:1.5,backgroundColor:'#ffffff'});const pdf=new jsPDF('p','mm','a4');const width=190;const height=canvas.height*width/canvas.width;let offset=0;while(offset<height){pdf.addImage(canvas.toDataURL('image/jpeg',.88),'JPEG',10,10-offset,width,height);offset+=277;if(offset<height)pdf.addPage();}pdf.save(`${project.name}-${template.name}.pdf`.replace(/[^a-z0-9.-]+/gi,'-').toLowerCase());setNotice('PDF exported');};
  const addToReport=async()=>{await addReportItem({toolId:`document-${template.id}`,title:`${template.name} — ${project.name}`,timestamp:new Date().toISOString(),projectId:project.id,documentId:record.id,statsSummary:{Completion:`${scores.completion}%`,Quality:`${scores.quality}/100`},interpretation:`${template.name} project document. ${scores.populated} of ${scores.total} required elements are complete.`,documentSnapshot:{schemaVersion:record.schemaVersion,templateId:record.templateId,values:record.values}});setNotice('Added to Report Builder');};

  return <WorkspaceShell className={`document-workspace ${guideOpen?'':'guidance-closed'}`} mode={mode} backTo="/projects" backLabel="Project" breadcrumb={<><Link to="/projects">Projects</Link><span> / </span><Link to="/templates">{template.phase}</Link><span> / {template.name}</span></>} previousLabel={activeIndex?template.sections[activeIndex-1].title:'Previous'} nextLabel={activeIndex<template.sections.length-1?template.sections[activeIndex+1].title:'Next'} previousDisabled={activeIndex===0} nextDisabled={activeIndex===template.sections.length-1} onPrevious={()=>setActiveIndex(index=>index-1)} onNext={()=>setActiveIndex(index=>index+1)} onMinimize={()=>setMode('minimized')} onMaximize={()=>setMode('maximized')} onRestore={()=>setMode('normal')} onSave={saveNow} saving={saveState==='saving'} onExport={exportPdf} onPrint={print} onHelp={()=>setGuideOpen(true)}>
    <div ref={workspaceRef}><header className="dw-executive"><div><span className={`badge badge-${template.phase.toLowerCase()}`}>{template.phase} workspace</span><h1>{template.name}</h1><p>{project.name} &middot; {template.desc}</p></div><div className={`dw-autosave ${saveState}`}><i />{saveState==='saving'?'Autosaving...':'All changes saved'}</div><div className="dw-score"><div><span>Completion</span><strong>{scores.completion}%</strong><i><b style={{width:`${scores.completion}%`}} /></i></div><div><span>Quality score</span><strong>{scores.quality}<small>/100</small></strong><p>{scores.quality>=80?'Review ready':'Needs development'}</p></div><div><span>Project</span><strong>{project.name}</strong><p>{scores.populated} of {scores.total} required elements</p></div><div className="dw-report-action"><button type="button" className="btn-secondary" onClick={()=>setAssetsOpen(true)}>Linked Assets</button><button type="button" className="btn-secondary" onClick={addToReport}>+ Add to Report</button>{notice&&<span>{notice}</span>}</div></div></header>
    <div className="dw-layout"><aside className="dw-nav"><span>DOCUMENT SECTIONS</span>{template.sections.map((section,index)=><button type="button" key={section.id||section.title} className={activeIndex===index?'active':''} onClick={()=>setActiveIndex(index)}><b>{String(index+1).padStart(2,'0')}</b><span>{section.title}</span><i>{sectionComplete(section)?'✓':''}</i></button>)}</aside><main className="dw-main"><header><div><span>SECTION {activeIndex+1} OF {template.sections.length}</span><h2>{current.title}</h2><p>{current.guidance}</p></div><em className={sectionComplete(current)?'complete':''}>{sectionComplete(current)?'✓ Section complete':'Required fields remaining'}</em></header><section className={`dw-section-grid cols-${Math.min(current.cols||1,2)}`}>{current.fields.map(field=><Field key={field.id} field={field} value={record.values[field.id]} onChange={value=>updateValue(field.id,value)} />)}</section><footer><button type="button" className="btn-secondary" disabled={activeIndex===0} onClick={()=>setActiveIndex(index=>index-1)}>&larr; Previous</button><span>{activeIndex+1} of {template.sections.length}</span><button type="button" className="btn-primary" disabled={activeIndex===template.sections.length-1} onClick={()=>setActiveIndex(index=>index+1)}>Next &rarr;</button></footer></main><aside className={`dw-guide ${guideOpen?'open':''}`}><button type="button" onClick={()=>setGuideOpen(open=>!open)} aria-label={guideOpen?'Collapse guidance':'Open guidance'}>{guideOpen?'×':'?'}</button>{guideOpen&&<><span>CONTEXT GUIDANCE</span><h3>{current.title}</h3><p>{current.guidance}</p><div><b>Quality check</b><p>{sectionComplete(current)?'Required information is present. Review clarity and evidence before approval.':'Complete every required element in this section.'}</p></div><div><b>Recommended next step</b><p>Validate this section with the accountable owner, then continue to the next {template.phase} artifact.</p></div></>}</aside></div></div>
    {assetsOpen&&<AssetReferences project={project} references={record.references} datasets={datasets} analyses={analysisResults} evidence={project.evidenceLibrary||[]} reports={reportItems} onChange={references=>setRecord(previous=>({...previous,references}))} onClose={()=>setAssetsOpen(false)} />}
  </WorkspaceShell>;
}

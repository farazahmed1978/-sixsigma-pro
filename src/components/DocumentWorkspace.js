import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {syncService} from '../services/syncService';
import { Link,useLocation,useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useReport } from '../context/ReportContext';
import { useWorksheet } from '../context/WorksheetContext';
import { useAnalysis } from '../context/AnalysisContext';
import WorkspaceShell from './WorkspaceShell';
import ExpandableEditor from './ExpandableEditor';
import DocumentReport, {collectDocumentCss} from './DocumentReport';
import {DIAGRAM_TEMPLATES} from '../config/diagramTemplates';
import { createDocument, documentIdFor, documentResumeIndex, documentScores, textValue } from '../utils/documentModel';
import {artifactResume, projectHubRoute, PROJECT_HUB_BACK_LABEL} from '../utils/projectResume';
import {SHARED_LEAD_IN_IDS,defineAdvanceState,nextDmaicArtifact,previousDmaicArtifact,projectDocumentRoute} from '../utils/defineSequence';
import {sharedFieldForTarget} from '../config/artifactContext';
import {applyDocumentConnections, detectStaleConnections, resyncProvenanceEntry, isConnectionValueUnedited} from '../utils/documentConnections';
import {lifecycleForProject} from '../foundation/lifecycle';
import AssetUploadModal from './AssetUploadModal';
import LinkedAssetsList from './LinkedAssetsList';
import './DocumentWorkspace.css';
import './GuidedWorkspace.css';

const rowId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
// Upgrades a template section's existing static guidance into the "what good looks like" line the
// guide panel shows below it. Computed from the section's own required-field count rather than
// hand-authored per section (there are hundreds of sections across every template) — this stays
// accurate as templates change and needs no per-template authoring, while a section MAY still
// supply its own concrete `example` string (see the CTQ Tree/WBS/Risk Register overrides) for the
// panel's Example block, which this deliberately never fabricates.
const sectionQualityGuidance=section=>{
  const required=(section.fields||[]).filter(field=>field.required!==false).length;
  if(!required)return 'This section has no required fields — fill in whatever applies to this project.';
  return `A good version fills in every required field (${required} in this section) with specific, substantive detail — not a placeholder or a one-word answer.`;
};
export const sharedFieldKey=sharedFieldForTarget;
export const mergeSharedDocumentValues=(values,shared={},fieldIds=Object.keys(values))=>{
  const next={...values};
  fieldIds.forEach(id=>{const key=sharedFieldKey(id),value=next[id];if(key&&shared[key]!==undefined&&!textValue(value))next[id]=shared[key]});
  return next;
};
export const documentSaveStateLabel=state=>({saving:'Saving…',saved:'Saved',unsaved:'Unsaved changes',offline:'Offline / retry needed',error:'Save failed · retry'}[state]||'Unsaved changes');

// A "From [Source Document]" badge marks a field whose current value was pre-populated by a
// cross-document connection (config/artifactContext.js DOCUMENT_CONNECTIONS) and hasn't been
// edited since — the caller only passes `provenance` when isConnectionValueUnedited() is true, so
// the badge disappears the moment the value changes, without this component needing to know why.
function ConnectionBadge({ provenance }) {
  if (!provenance) return null;
  return <span className="dw-connection-badge" title={`Pre-populated from ${provenance.sourceDocName} — editing this value keeps your own text`}>↳ {provenance.sourceDocName}</span>;
}

function MultilineField({ field, value, onChange, provenance }) {
  const [expanded, setExpanded] = useState(false);
  return <div className={`dw-field ${field.span ? 'wide' : ''}`}><div className="dw-field-label"><label>{field.label}{field.required !== false && <i>Required</i>}<ConnectionBadge provenance={provenance} /></label><button type="button" onClick={() => setExpanded(true)} title={`Expand ${field.label}`} aria-label={`Expand ${field.label}`}>&#10530;</button></div><textarea rows="6" value={value || ''} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} />{expanded && <ExpandableEditor label={field.label} value={value || ''} onChange={onChange} onClose={() => setExpanded(false)} />}</div>;
}

// A calculated column is derived by the template's calculate() function (see pmpTemplates.js) and
// re-merged into values on every keystroke elsewhere in the document — rendering it as an editable
// input would let a user type a value that the very next edit silently discards, which is worse
// than not being editable at all. Render it as plain text instead, consistent with how a
// calculated top-level Field renders below.
function TableCell({ column, value, onChange, rowIndex, columnIndex }) {
  const [expanded, setExpanded] = useState(false);
  if (column.calculated) return <div className="dw-cell dw-cell-calculated" data-dw-cell={`${rowIndex}:${columnIndex}`} data-calculated="true" title="Calculated automatically">{value === '' || value === undefined || value === null ? '—' : String(value)}</div>;
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

function StructuredTable({ field, rows = [], onChange, connectionBanner }) {
  const [dragIndex, setDragIndex] = useState(null);
  const columns = field.columns || [];
  const add = () => onChange([...rows, { id:rowId(field.id), ...Object.fromEntries(columns.map(column => [column.key,''])) }]);
  const reorder = targetIndex => {
    if (dragIndex === null || dragIndex === targetIndex) return setDragIndex(null);
    const next = [...rows]; const [moved] = next.splice(dragIndex,1); next.splice(targetIndex,0,moved); onChange(next); setDragIndex(null);
  };
  const summaries=(field.summaries||[]).map(summary=>{const numbers=rows.map(row=>Number(row[summary.key])).filter(Number.isFinite);const result=summary.operation==='average'?(numbers.length?numbers.reduce((a,b)=>a+b,0)/numbers.length:0):numbers.reduce((a,b)=>a+b,0);return{...summary,value:Math.round(result*100)/100};});
  return <div className="dw-table"><div className="dw-table-heading"><div><h3>{field.label}{field.required !== false && <i>Required</i>}</h3><p>{field.help}</p></div><button type="button" className="btn-secondary" onClick={add}>+ Add row</button></div>{connectionBanner && <p className="dw-connection-banner">↳ {connectionBanner}</p>}<div className="dw-table-scroll"><table><thead><tr><th aria-label="Reorder" />{columns.map(column => <th key={column.key}>{column.label}</th>)}<th aria-label="Actions" /></tr></thead><tbody>{rows.map((row,rowIndex) => <tr key={row.id} draggable onDragStart={() => setDragIndex(rowIndex)} onDragOver={event => event.preventDefault()} onDrop={() => reorder(rowIndex)} className={dragIndex === rowIndex ? 'dragging' : ''}><td><button type="button" className="dw-drag" title="Drag to reorder" aria-label={`Reorder row ${rowIndex + 1}`}>⋮⋮</button></td>{columns.map((column,columnIndex) => <td key={column.key}><TableCell column={column} value={row[column.key]} rowIndex={rowIndex} columnIndex={columnIndex} onChange={value => onChange(rows.map(item => item.id === row.id ? {...item,[column.key]:value} : item))} /></td>)}<td><button type="button" className="dw-delete" aria-label={`Delete row ${rowIndex + 1}`} onClick={() => onChange(rows.filter(item => item.id !== row.id))}>&times;</button></td></tr>)}</tbody></table></div>{!rows.length && <button type="button" className="dw-table-empty" onClick={add}>Add the first row</button>}{summaries.length>0&&<div className="dw-table-summary">{summaries.map(summary=><div key={summary.label}><span>{summary.label}</span><strong>{summary.value}</strong></div>)}</div>}</div>;
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

// A compact table-level notice (not per-cell) telling the user some of these rows arrived from
// another document — one banner line per table field rather than a badge on every individual cell,
// which would be noisy for tables with many mapped columns. It disappears the moment every mapped
// cell it covers has been edited away from its populated value.
const tableConnectionBanner = (fieldId, rows, connectionProvenance) => {
  const entries = Object.entries(connectionProvenance || {}).filter(([, entry]) => entry.targetField === fieldId && (entry.kind === 'table' || entry.kind === 'conditional-scalar-row'));
  const sources = new Set();
  entries.forEach(([, entry]) => {
    if (entry.kind === 'table') {
      const row = rows[entry.rowIndex];
      if (row && isConnectionValueUnedited(row[entry.targetKey], entry)) sources.add(entry.sourceDocName);
    } else {
      const row = rows.find(item => item[entry.matchKey] === entry.matchValue);
      if (row && isConnectionValueUnedited(row, entry)) sources.add(entry.sourceDocName);
    }
  });
  return sources.size ? `Pre-populated from ${[...sources].join(' and ')} — edit any cell to override.` : null;
};

function Field({ field, value, onChange, connectionProvenance }) {
  if (field.type === 'textarea') return <MultilineField field={field} value={value} onChange={onChange} provenance={isConnectionValueUnedited(value, connectionProvenance?.[field.id]) ? connectionProvenance[field.id] : null} />;
  if (field.type === 'table') return <StructuredTable field={field} rows={Array.isArray(value) ? value : []} onChange={onChange} connectionBanner={tableConnectionBanner(field.id, Array.isArray(value) ? value : [], connectionProvenance)} />;
  if (field.type === 'tree') return <CTQTree field={field} branches={Array.isArray(value) ? value : []} onChange={onChange} />;
  if (field.type === 'flow') return <FlowBuilder field={field} nodes={Array.isArray(value)?value:[]} onChange={onChange} />;
  // See the matching note on TableCell: a calculated field is recomputed by template.calculate()
  // on every edit elsewhere in the document, so it renders read-only rather than as an input a
  // user could type into and have silently overwritten.
  if (field.calculated) return <div className={`dw-field ${field.span ? 'wide' : ''}`}><label>{field.label}<i className="dw-calculated-badge">Calculated</i></label><div className="dw-field-readonly" data-calculated="true" title="Calculated automatically">{value === '' || value === undefined || value === null ? '—' : String(value)}</div></div>;
  const provenance = isConnectionValueUnedited(value, connectionProvenance?.[field.id]) ? connectionProvenance[field.id] : null;
  return <div className={`dw-field ${field.span ? 'wide' : ''}`}><label>{field.label}{field.required !== false && <i>Required</i>}<ConnectionBadge provenance={provenance} /></label>{field.type==='select'?<select value={value||''} onChange={event=>onChange(event.target.value)}><option value="">Select</option>{field.options.map(option=><option key={option}>{option}</option>)}</select>:<input type={field.type === 'date' ? 'date' : 'text'} value={value || ''} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} />}</div>;
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

export default function DocumentWorkspace({ template, project, updateProject, standalone=false, onGuidedState }) {
  const navigate=useNavigate();
  const location=useLocation();
  const { addReportItem, items:reportItems } = useReport();
  const { datasets } = useWorksheet();
  const { analysisResults } = useAnalysis();
  const stored = project.documents?.[documentIdFor(template.id)];
  const [record,setRecord] = useState(() => createDocument(template,project.id,stored));
  const [activeIndex,setActiveIndex] = useState(() => documentResumeIndex(template,stored,project.resumeTarget));
  const [mode,setMode] = useState('normal');
  const [guideOpen,setGuideOpen] = useState(true);
  const [saveState,setSaveState] = useState('saved');
  const [autosave,setAutosave] = useState(()=>localStorage.getItem('axentra_document_autosave')!=='off');
  const [notice,setNotice] = useState('');
  const [progressionWarning,setProgressionWarning] = useState(false);
  const [assetsOpen,setAssetsOpen] = useState(false);
  const [assetUploadOpen,setAssetUploadOpen] = useState(false);
  const [previewOpen,setPreviewOpen] = useState(false);
  const workspaceRef = useRef(null);
  const documentsRef = useRef(project.documents || {}); documentsRef.current = project.documents || {};
  const activityRef = useRef(project.activityLog || []); activityRef.current = project.activityLog || [];
  const hydratedKey = useRef(`${project.id}:${template.id}`);
  const current = template.sections[activeIndex];
  const scores = useMemo(() => documentScores(template,record.values),[template,record.values]);
  // Charter, Stakeholder Register, and Business Case are shared documents (defined once in
  // DEFINE_TEMPLATES with a hardcoded phase:'Define') surfaced under both suites. 'Define' isn't
  // a real Project Management stage, so for these three the displayed phase must follow the
  // project's own suite lifecycle instead of the static template.phase — the same fix already
  // applied to ProjectCharter.js for the Charter document itself. Every other template (the OE
  // DMAIC catalogs and the PMP catalog) already carries its own correct phase/pmpLifecycle label,
  // so this must not touch template.phase for anything outside the shared three.
  const lifecycle = lifecycleForProject(project);
  const displayPhase = SHARED_LEAD_IN_IDS.includes(template.id) ? (lifecycle.stages[0]?.label || template.phase) : template.phase;

  useEffect(() => { const key=`${project.id}:${template.id}`; if(hydratedKey.current!==key){const saved=project.documents?.[documentIdFor(template.id)];setRecord(createDocument(template,project.id,saved));setActiveIndex(documentResumeIndex(template,saved,project.resumeTarget));hydratedKey.current=key;} },[project,template]);
  useEffect(()=>{const fieldIds=template.sections.flatMap(section=>section.fields.map(field=>field.id));setRecord(previous=>{const values=mergeSharedDocumentValues(previous.values,project.sharedFields,fieldIds);return Object.keys(values).some(id=>values[id]!==previous.values[id])?{...previous,values}:previous})},[project.sharedFields,template.sections]);
  // Cross-document connectivity (Phase 3, Part 2): whenever this document's project context
  // changes (another document was saved, or this one just hydrated), pull in any still-blank
  // fields this document is a connection target for. applyDocumentConnections never overwrites a
  // field that already has a value, so this is safe to re-run on every project change — reading
  // `previous.values`/`previous.connectionProvenance` from inside the updater (rather than the
  // outer closure) mirrors the mergeSharedDocumentValues effect above and keeps this effect's own
  // dependency list to just what actually needs to trigger a re-check.
  useEffect(()=>{
    if(standalone)return;
    setRecord(previous=>{
      const{values:nextValues,provenance:nextProvenance}=applyDocumentConnections({project,targetDocId:template.id,targetValues:previous.values,existingProvenance:previous.connectionProvenance||{}});
      const changed=JSON.stringify(nextValues)!==JSON.stringify(previous.values)||JSON.stringify(nextProvenance)!==JSON.stringify(previous.connectionProvenance||{});
      return changed?{...previous,values:nextValues,connectionProvenance:nextProvenance}:previous;
    });
  },[project,template.id,standalone]);
  const staleConnections=useMemo(()=>standalone?[]:detectStaleConnections({project,provenance:record.connectionProvenance||{}}),[project,record.connectionProvenance,standalone]);
  const resyncStaleConnections=()=>{
    setRecord(previous=>{
      let values=previous.values,provenance=previous.connectionProvenance||{};
      staleConnections.forEach(item=>{const result=resyncProvenanceEntry({project,targetValues:values,provenanceKey:item.provenanceKey,provenance});values=result.values;provenance=result.provenance;});
      return{...previous,values,connectionProvenance:provenance};
    });
    setNotice('Re-synced values from the updated source document(s).');
  };
  const persist = useCallback(async next => { const qualityIssues=template.sections.flatMap(section=>section.fields.filter(field=>field.required!==false).map(field=>{const value=next.values[field.id];if(Array.isArray(value)&&!value.length)return `${field.label} has no supporting entries`;if(field.type==='textarea'&&textValue(value).length>0&&textValue(value).length<30)return `${field.label} needs more specific supporting detail`;return null})).filter(Boolean).slice(0,5);const sectionId=template.sections[activeIndex]?.id||template.sections[activeIndex]?.title||'',saved={...next,sectionState:{...(next.sectionState||{}),activeSectionId:sectionId},phase:template.phase,completion:scores.completion,quality:scores.quality,qualityIssues,updatedAt:new Date().toISOString()};syncService.bufferDraft(saved.id,saved,saved.updatedAt); const activity={id:`activity-${Date.now()}`,action:`Updated ${template.name}`,assetType:'document',assetId:saved.id,at:saved.updatedAt}; await updateProject(project.id,{documents:{...documentsRef.current,[saved.id]:saved},resumeTarget:artifactResume({projectId:project.id,artifactId:template.id,artifactName:template.name,sectionId}),activityLog:[activity,...activityRef.current.filter(item=>!(item.assetType==='document'&&item.assetId===saved.id))].slice(0,100)});syncService.clearDraft(saved.id);return saved; },[activeIndex,project.id,scores.completion,scores.quality,template.id,template.name,template.phase,template.sections,updateProject]);
  useEffect(() => {if(!autosave){setSaveState('unsaved');return;}if(!navigator.onLine){setSaveState('offline');return;}setSaveState('saving'); const timer=window.setTimeout(() => {persist(record).then(()=>{setSaveState('saved');setNotice('')}).catch(error=>{setSaveState('error');setNotice(error.message||'Save failed. Use Save to retry.')});},700); return()=>window.clearTimeout(timer); },[autosave,persist,record]);

  const updateValue=(id,value)=>{setSaveState('unsaved');const sharedKey=sharedFieldKey(id);if(sharedKey&&!standalone)updateProject(project.id,{sharedFields:{...(project.sharedFields||{}),[sharedKey]:value}});setRecord(previous=>{const values={...previous.values,[id]:value};const calculated=template.calculate?.(values);return{...previous,values:calculated?{...values,...calculated}:values};});};
  const sectionComplete=section=>section.fields.filter(field=>field.required!==false).every(field=>Array.isArray(record.values[field.id]) ? record.values[field.id].length>0 : Boolean(textValue(record.values[field.id])));
  const saveNow=async()=>{if(!navigator.onLine){setSaveState('offline');setNotice('Offline — changes are cached but not saved to Aureqin.');return false;}setSaveState('saving');try{await persist(record);setSaveState('saved');setNotice('Document saved to Aureqin');return true}catch(error){setSaveState('error');setNotice(error.message||'Document could not be saved to Aureqin. Use Save to retry.');return false;}};
  const generateCollectionSheet=()=>{const rows=record.values.collectionRows||[];const artifact={id:`collection-sheet-${Date.now()}`,schemaVersion:1,type:'collection-sheet',phase:'Measure',title:`${project.name} — Data Collection Sheet`,description:`Printable field sheet with ${rows.length} planned metrics.`,sourceDocumentId:record.id,sourceTemplateId:template.id,createdAt:new Date().toISOString(),content:{rows}};updateProject(project.id,{artifacts:[...(project.artifacts||[]),artifact]});const popup=window.open('','_blank','noopener,noreferrer');if(popup){const cells=['metric','operationalDefinition','unit','method','source','frequency','sampleSize','owner','start','end'];const clean=value=>String(value??'').replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));popup.document.write(`<!doctype html><html><head><title>${clean(artifact.title)}</title><style>@page{size:landscape;margin:12mm}body{font:12px Arial;color:#172033}table{width:100%;border-collapse:collapse}th,td{border:1px solid #9aa4b2;padding:7px;vertical-align:top}th{background:#eef2f7}td{height:36px}@media print{button{display:none}}</style></head><body><h1>${clean(artifact.title)}</h1><p>Generated ${new Date().toLocaleString()} · Source: ${clean(template.name)}</p><button onclick="window.print()">Print / Save PDF</button><table><thead><tr>${['Metric','Operational Definition','Unit','Method','Source','Frequency','Sample Size','Owner','Start','End','Observed Value','Collector Notes'].map(label=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${cells.map(key=>`<td>${clean(row[key])}</td>`).join('')}<td></td><td></td></tr>`).join('')||'<tr><td colspan="12">No collection items have been added yet.</td></tr>'}</tbody></table></body></html>`);popup.document.close()}setNotice('Collection Sheet saved to Project Artifacts');};
  const toggleAutosave=()=>setAutosave(value=>{const next=!value;localStorage.setItem('axentra_document_autosave',next?'on':'off');if(next)window.setTimeout(saveNow,0);return next;});
  useEffect(()=>{const host=document.querySelector('.document-workspace .workspace-shell-content');if(!host)return;let bar=host.querySelector('.dw-autosave-control');if(!bar){bar=document.createElement('div');bar.className='dw-autosave-control';host.prepend(bar)}bar.innerHTML=`<button type="button" aria-pressed="${autosave}"><i></i> Autosave ${autosave?'On':'Off'}</button><span class="${saveState}">${saveState==='saving'?'Saving…':saveState==='saved'?'Saved':saveState==='unsaved'?'Unsaved changes':'Offline / retry needed'}</span>`;const button=bar.querySelector('button');button.addEventListener('click',toggleAutosave);return()=>button.removeEventListener('click',toggleAutosave);});
  useEffect(()=>{if(template.id!=='data-collection-plan')return;const bar=document.querySelector('.document-workspace .dw-autosave-control');if(!bar)return;let button=bar.querySelector('[data-collection-sheet]');if(!button){button=document.createElement('button');button.type='button';button.dataset.collectionSheet='true';button.textContent='Generate Collection Sheet';bar.append(button)}button.addEventListener('click',generateCollectionSheet);return()=>button.removeEventListener('click',generateCollectionSheet);});
  const advanceState=defineAdvanceState({template,activeIndex,values:record.values,project});
  const sequencePrevious=previousDmaicArtifact(template.id,project);
  const sequenceNext=nextDmaicArtifact(template.id,project);
  const openSequenceArtifact=async artifact=>{if(!artifact||!project.id)return;const saved=await saveNow();if(saved)navigate(artifact.id==='charter'?`/projects/${project.id}/charter`:projectDocumentRoute(project.id,artifact.id));};
  const openSuccessor=async()=>{if(!project.id){setNotice('A valid project is required before opening the next document.');return;}await openSequenceArtifact(sequenceNext);};
  const requestSequenceNext=()=>{if(!sequenceNext)return;if(advanceState.missing.length){setProgressionWarning(true);return;}openSuccessor();};
  const guided=Boolean(location.state?.guided);
  const advance=async()=>{if(!advanceState.atLast){const saved=await saveNow();if(saved){setActiveIndex(index=>index+1);setNotice('Section saved · continue to the next section');}return;}if(advanceState.next){if(advanceState.missing.length){setProgressionWarning(true);return;}await openSuccessor();return;}setNotice(`${template.name} completes the configured DMAIC sequence. Return to Project Binder when ready.`);};
  const advanceGuidedSection=async()=>{if(await saveNow())setActiveIndex(index=>Math.min(index+1,template.sections.length-1));};
  // Guided mode: GuidedWorkspace.js is the single source of truth for section navigation, the CTA
  // footer, and when the Continue-to-next-document button appears — no navigation/button-rendering
  // decisions live here (this mirrors ProjectCharter.js's guided branch exactly). This just reports
  // the live state GuidedWorkspace needs plus callable handles, so GuidedWorkspace's own footer
  // buttons drive this component's existing, unchanged navigation/persistence functions rather than
  // reimplementing them. Runs every render so the reported handles always close over current state.
  useEffect(() => {
    if (!guided || !onGuidedState) return;
    onGuidedState({
      sectionIndex: activeIndex,
      totalSections: template.sections.length,
      completedSections: template.sections.filter(sectionComplete).length,
      isLastSection: activeIndex === template.sections.length - 1,
      allRequiredFieldsFilled: scores.completion === 100,
      goToPrevious: () => setActiveIndex(i => Math.max(0, i - 1)),
      goToNext: advanceGuidedSection,
      save: saveNow,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
  const diagram=DIAGRAM_TEMPLATES[template.id]||null;
  const reportElement=()=><DocumentReport template={template} project={project} record={record} phase={displayPhase} diagram={diagram?diagram.render(record,project):null}/>;
  // Both Print and Export PDF render the full multi-section report (every section, and the
  // diagram when there is one) into their own isolated DOM target — an iframe's own document for
  // Print, an off-screen container for Export PDF — rather than toggling visibility on a node
  // shared with the live editor. That prior approach depended on CSS cascade order and browser
  // print-event timing lining up correctly and proved unreliable. This render uses createRoot
  // directly on the target (the browser's own live React runtime, the same mechanism the whole
  // app already renders through), not a serialize-to-string step, so there's no separate
  // serialization/parsing path that could produce something different from what's on screen.
  const print=()=>{
    const iframe=document.createElement('iframe');
    iframe.style.position='fixed';iframe.style.right='0';iframe.style.bottom='0';iframe.style.width='0';iframe.style.height='0';iframe.style.border='0';
    document.body.appendChild(iframe);
    const frameDoc=iframe.contentDocument;
    frameDoc.open();frameDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');frameDoc.close();
    frameDoc.title=`${template.name} — ${project.name}`;
    const styleEl=frameDoc.createElement('style');
    styleEl.textContent=`${collectDocumentCss()}\nbody{margin:0;background:#fff}@page{margin:12mm}`;
    frameDoc.head.appendChild(styleEl);
    const printRoot=createRoot(frameDoc.body);
    const cleanup=()=>{try{printRoot.unmount()}catch{}if(iframe.parentNode)iframe.parentNode.removeChild(iframe)};
    // flushSync forces this root's initial commit to happen synchronously, so the DOM is
    // guaranteed populated the instant this call returns — no delay-and-hope-it-was-enough-time
    // needed to know the report actually rendered before we act on it.
    flushSync(()=>printRoot.render(reportElement()));

    if(!frameDoc.body.textContent.trim()){cleanup();setNotice('Print preview could not be generated. Please try again.');return;}
    // The content is committed; this remaining wait is only for the browser's own layout/paint
    // pass on that already-present content before invoking print, not for React.
    window.setTimeout(()=>{
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      window.setTimeout(cleanup,1000);
    },200);
  };
  const exportPdf=async()=>{
    setNotice('Preparing PDF...');
    const container=document.createElement('div');
    container.style.cssText='position:fixed;left:-10000px;top:0;width:900px;background:#fff';
    document.body.appendChild(container);
    const exportRoot=createRoot(container);
    try{
      flushSync(()=>exportRoot.render(reportElement()));
      if(!container.textContent.trim())throw new Error('The report could not be generated for export.');
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const canvas=await html2canvas(container,{scale:1.5,backgroundColor:'#ffffff'}),pdf=new jsPDF(diagram?diagram.orientation:'p','mm','a4'),width=diagram?diagram.pageWidth:190,pageHeight=diagram?diagram.pageHeight:277,height=canvas.height*width/canvas.width;
      let offset=0;while(offset<height){pdf.addImage(canvas.toDataURL('image/jpeg',.9),'JPEG',10,10-offset,width,height);offset+=pageHeight;if(offset<height)pdf.addPage();}
      pdf.save(`${project.name}-${template.name}.pdf`.replace(/[^a-z0-9.-]+/gi,'-').toLowerCase());
      setNotice('PDF exported');
    }finally{exportRoot.unmount();document.body.removeChild(container);}
  };
  const addToReport=async()=>{await addReportItem({toolId:`document-${template.id}`,title:`${template.name} — ${project.name}`,timestamp:new Date().toISOString(),projectId:project.id,phase:displayPhase,assetType:'document',documentId:record.id,statsSummary:{Completion:`${scores.completion}%`,Quality:`${scores.quality}/100`},interpretation:`${template.name} project document. ${scores.populated} of ${scores.total} required elements are complete.`,documentSnapshot:{schemaVersion:record.schemaVersion,templateId:record.templateId,values:record.values}});setNotice('Added to Report Builder');};

  // Phase 5C — guided mode completely replaces this component's output: no WorkspaceShell, no
  // score/quality header, no section sidebar, no Attach File/+Add to Report/Preview Diagram, no
  // sequence-nav bar. Just the current section's fields (the same Field mapping the standard
  // dw-section-grid uses, reused verbatim — zero duplicated business logic). Everything else
  // guided-mode-specific — the progress tracker, the explanation panel, section-nav/Continue
  // buttons — is rendered by GuidedWorkspace.js (see the onGuidedState effect above).
  // A missing section here means template.sections[activeIndex] is out of range or the template
  // itself is malformed — surface that clearly instead of letting `current.title` throw an
  // uncaught TypeError that takes down the whole guided flow (or the standard workspace).
  if (!current) {
    return <div className="dw-section-only"><p className="dw-section-error">This document's section {activeIndex + 1} of {template.sections.length} could not be found — its template may be misconfigured.</p></div>;
  }

  if (guided) {
    return (
      <div className="gw-section-only">
        <div className="gw-section-header"><div><span>SECTION {activeIndex+1} OF {template.sections.length}</span><h2>{current?.title}</h2><p>{current?.guidance}</p></div></div>
        <section className={`dw-section-grid cols-${Math.min(current?.cols||1,2)}`}>{current?.fields?.map(field=><Field key={field.id} field={field} value={record.values[field.id]} onChange={value=>updateValue(field.id,value)} connectionProvenance={record.connectionProvenance} />)}</section>
      </div>
    );
  }

  return <WorkspaceShell className={`document-workspace ${guideOpen?'':'guidance-closed'}`} mode={mode} backTo={standalone?'/templates':projectHubRoute(project.id)} backLabel={standalone?'Templates':PROJECT_HUB_BACK_LABEL} breadcrumb={standalone?<span>Standalone / {displayPhase} / {template.name}</span>:<><Link to={`/projects/${project.id}`}>Project Home</Link><span> / </span><span>{displayPhase} / {template.name}</span></>} previousLabel="Previous" previousDisabled={false} onPrevious={()=>navigate(-1)} sequencePreviousLabel={sequencePrevious?.sequenceLabel} sequenceNextLabel={sequenceNext?.sequenceLabel} sequencePreviousDisabled={!sequencePrevious} sequenceNextDisabled={!sequenceNext} onSequencePrevious={standalone?undefined:()=>openSequenceArtifact(sequencePrevious)} onSequenceNext={standalone?undefined:requestSequenceNext} onMinimize={()=>setMode('minimized')} onMaximize={()=>setMode('maximized')} onRestore={()=>setMode('normal')} onSave={saveNow} saving={saveState==='saving'} onExport={exportPdf} onPrint={print} onHelp={()=>setGuideOpen(true)} suiteId={lifecycle.id}>
    <div ref={workspaceRef}>{staleConnections.length>0&&<div className="dw-connection-stale-notice" role="status"><span>{staleConnections.length} value{staleConnections.length>1?'s':''} pulled in from {[...new Set(staleConnections.map(item=>item.sourceDocName))].join(', ')} may be out of date — the source document has changed since.</span><button type="button" className="btn-secondary" onClick={resyncStaleConnections}>Re-sync</button></div>}<header className="dw-executive"><div><span className={`badge badge-${displayPhase.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}`}>{standalone?'Standalone':displayPhase} workspace</span><h1>{template.name}</h1><p>{project.name} &middot; {template.desc}</p></div><div className={`dw-autosave ${saveState}`}><i />{documentSaveStateLabel(saveState)}</div><div className="dw-score"><div><span>Completion</span><strong>{scores.completion}%</strong><i><b style={{width:`${scores.completion}%`}} /></i></div><div><span>Quality score</span><strong>{scores.quality}<small>/100</small></strong><p>{scores.quality>=80?'Review ready':'Needs development'}</p></div><div><span>{standalone?'Context':'Project'}</span><strong>{project.name}</strong><p>{scores.populated} of {scores.total} required elements</p></div><div className="dw-report-action">{!standalone&&<><button type="button" className="btn-secondary" onClick={()=>setAssetsOpen(true)}>Linked Assets</button><button type="button" className="btn-secondary" onClick={()=>setAssetUploadOpen(true)}>Attach File</button><button type="button" className="btn-secondary" onClick={addToReport}>+ Add to Report</button></>}{diagram&&<button type="button" className="btn-secondary" onClick={()=>setPreviewOpen(true)}>Preview Diagram</button>}{notice&&<span>{notice}</span>}</div></div></header>
    <div className="dw-layout"><aside className="dw-nav"><span>DOCUMENT SECTIONS</span>{template.sections.map((section,index)=><button type="button" key={section.id||section.title} className={activeIndex===index?'active':''} onClick={()=>setActiveIndex(index)}><b>{String(index+1).padStart(2,'0')}</b><span>{section?.title}</span><i>{sectionComplete(section)?'✓':''}</i></button>)}</aside><main className="dw-main"><header><div><span>SECTION {activeIndex+1} OF {template.sections.length}</span><h2>{current?.title}</h2><p>{current?.guidance}</p></div><em className={sectionComplete(current)?'complete':''}>{sectionComplete(current)?'✓ Section complete':'Required fields remaining'}</em></header><section className={`dw-section-grid cols-${Math.min(current?.cols||1,2)}`}>{current?.fields?.map(field=><Field key={field.id} field={field} value={record.values[field.id]} onChange={value=>updateValue(field.id,value)} connectionProvenance={record.connectionProvenance} />)}</section>{!standalone&&<LinkedAssetsList project={project} artifactType="document" artifactId={template.id} />}<footer><button type="button" className="btn-secondary" disabled={activeIndex===0} onClick={()=>setActiveIndex(index=>index-1)}>&larr; Previous section</button><span>{activeIndex+1} of {template.sections.length}</span><button type="button" className="btn-primary" disabled={advanceState.atLast&&!advanceState.next} onClick={advance}>Next &rarr;</button></footer></main><aside className={`dw-guide ${guideOpen?'open':''}`}><button type="button" onClick={()=>setGuideOpen(open=>!open)} aria-label={guideOpen?'Collapse guidance':'Open guidance'}>{guideOpen?'×':'?'}</button>{guideOpen&&<><span>CONTEXT GUIDANCE</span><h3>{current?.title}</h3><p>{current?.guidance}</p><div><b>What a good version looks like</b><p>{sectionQualityGuidance(current)}</p></div>{current?.example&&<div><b>Example</b><p>{current.example}</p></div>}<div><b>Quality check</b><p>{sectionComplete(current)?'Required information is present. Review clarity and evidence before approval.':'Complete every required element in this section.'}</p></div><div><b>Recommended next step</b><p>Validate this section with the accountable owner, then continue to the next {template.phase} artifact.</p></div></>}</aside></div></div>
    {previewOpen&&diagram&&<div className="dw-output-preview" role="dialog" aria-modal="true" aria-label={`${diagram.label} preview`}><button className="dw-output-backdrop" onClick={()=>setPreviewOpen(false)} aria-label="Close preview"/><div><button className="btn-secondary no-print" onClick={()=>setPreviewOpen(false)}>Close</button>{diagram.render(record,project)}</div></div>}
    {assetsOpen&&<AssetReferences project={project} references={record.references} datasets={datasets} analyses={analysisResults} evidence={project.evidenceLibrary||[]} reports={reportItems} onChange={references=>setRecord(previous=>({...previous,references}))} onClose={()=>setAssetsOpen(false)} />}
    {assetUploadOpen&&!standalone&&<AssetUploadModal project={project} defaultLink={{artifactType:'document',artifactId:template.id,artifactLabel:template.name}} defaultStage={displayPhase} onClose={()=>setAssetUploadOpen(false)} onUploaded={()=>setAssetUploadOpen(false)} />}
    {progressionWarning&&<div className="dw-progression-modal" role="dialog" aria-modal="true" aria-labelledby="dw-progression-title"><button type="button" className="dw-progression-backdrop" onClick={()=>setProgressionWarning(false)} aria-label="Stay here"/><section><span>GUIDED PROGRESSION</span><h2 id="dw-progression-title">This document is incomplete.</h2><p><strong>{advanceState.completion}% complete</strong> · {advanceState.missing.length} required {advanceState.missing.length===1?'item remains':'items remain'}.</p><ul>{advanceState.missingDetails.slice(0,6).map(item=><li key={`${item.section}:${item.field}`}><strong>{item.section}:</strong> {item.field}</li>)}</ul>{advanceState.missingDetails.length>6&&<p>And {advanceState.missingDetails.length-6} more required items.</p>}<p>You can continue to {sequenceNext?.sequenceLabel} and return here later. This document will remain incomplete.</p><footer><button type="button" className="btn-secondary" onClick={()=>setProgressionWarning(false)}>Stay here</button><button type="button" className="btn-primary" onClick={async()=>{setProgressionWarning(false);await openSuccessor();}}>Continue anyway</button></footer></section></div>}
  </WorkspaceShell>;
}

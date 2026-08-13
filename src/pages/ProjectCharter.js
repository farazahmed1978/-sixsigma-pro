import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useProjects } from '../context/ProjectsContext';
import { useReport } from '../context/ReportContext';
import WorkspaceShell from '../components/WorkspaceShell';
import {artifactResume,documentRoute} from '../utils/projectResume';
import './ProjectCharter.css';

export const projectCharterLinkTarget=(projectId,to)=>to==='/templates'?documentRoute(projectId,'sipoc'):to;
function Link({to,...props}){const{id}=useParams();return <RouterLink to={projectCharterLinkTarget(id,to)} {...props}/>}

export const PROJECT_CHARTER_SCHEMA_VERSION = 2;
export const PROJECT_CHARTER_SECTIONS = [
  { id: 'overview', label: 'Project Overview', icon: '01', fields: ['projectSummary', 'targetDate'], tip: 'Summarize the mandate in language an executive can understand in under one minute.', next: 'Confirm the sponsor, owner, and target completion date.' },
  { id: 'need', label: 'Business Need', icon: '02', fields: ['businessCase', 'problemStatement'], tip: 'Use baseline evidence and explain the customer, cost, compliance, or strategic consequence.', next: 'Quantify the gap and validate the baseline with the process owner.' },
  { id: 'goals', label: 'Goals', icon: '03', fields: ['goalStatement'], tip: 'Write a SMART goal with a baseline, target, metric, and deadline.', next: 'Confirm that the goal is measurable and time-bound.' },
  { id: 'scope', label: 'Scope', icon: '04', fields: ['scopeIn', 'scopeOut'], tip: 'Clear exclusions prevent scope creep and accelerate the Define gate review.', next: 'Validate boundaries with affected functional leaders.' },
  { id: 'team', label: 'Team', icon: '05', fields: ['team'], tip: 'Every core member should have a specific charter role and realistic allocation.', next: 'Confirm availability with each member’s manager.' },
  { id: 'stakeholders', label: 'Stakeholders', icon: '06', fields: ['stakeholders'], tip: 'Capture both decision-makers and groups affected by the future-state process.', next: 'Set an engagement cadence for high-influence stakeholders.' },
  { id: 'timeline', label: 'Timeline', icon: '07', fields: ['timeline'], tip: 'Use decision gates and meaningful DMAIC outcomes instead of task-level activity.', next: 'Check dependencies and agree milestone owners.' },
  { id: 'financial', label: 'Financial Impact', icon: '08', fields: ['financialImpact'], tip: 'Separate hard savings, cost avoidance, revenue, and non-financial benefits.', next: 'Assign a finance partner to validate the benefit estimate.' },
  { id: 'risks', label: 'Risks', icon: '09', fields: ['risks'], tip: 'Prioritize threats to data, adoption, resources, schedule, and benefits realization.', next: 'Assign a mitigation owner for every material risk.' },
  { id: 'assumptions', label: 'Assumptions', icon: '10', fields: ['assumptions'], tip: 'Document beliefs that could materially change scope, schedule, or expected value.', next: 'Convert uncertain assumptions into early validation actions.' },
  { id: 'constraints', label: 'Constraints', icon: '11', fields: ['constraints'], tip: 'Record fixed limits involving policy, technology, budget, capacity, or timing.', next: 'Escalate constraints that threaten the target outcome.' },
  { id: 'approval', label: 'Approval', icon: '12', fields: ['approvals'], tip: 'Approval confirms the mandate, resources, scope, and expected business value.', next: 'Schedule the Define gate review and capture sponsor approval.' },
];
const SECTIONS = PROJECT_CHARTER_SECTIONS;

const EMPTY = { schemaVersion: PROJECT_CHARTER_SCHEMA_VERSION, projectSummary: '', targetDate: '', businessCase: '', problemStatement: '', goalStatement: '', scopeIn: '', scopeOut: '', team: [], stakeholders: [], timeline: [], financialImpact: '', risks: [], assumptions: '', constraints: '', approvals: [] };
const plain = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
const rowId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function ExpandedEditor({ label, value, onChange, rich = false, onClose }) {
  const editorRef = useRef(null);
  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = ''; };
  }, [onClose]);
  useEffect(() => {
    if (rich && editorRef.current && editorRef.current.innerHTML !== (value || '')) editorRef.current.innerHTML = value || '';
    window.setTimeout(() => editorRef.current?.focus(), 0);
  }, [rich, value]);
  const format = command => { editorRef.current?.focus(); document.execCommand(command, false); onChange(editorRef.current?.innerHTML || ''); };
  return <div className="pc-focus-modal" role="dialog" aria-modal="true" aria-label={`${label} expanded editor`}><button type="button" className="pc-focus-backdrop" onClick={onClose} aria-label="Close expanded editor" /><div className="pc-focus-shell"><header><div><span>FOCUSED EDITOR</span><h2>{label}</h2></div><div><button type="button" className="btn-secondary" onClick={onClose}>Close</button><button type="button" className="btn-primary" onClick={onClose}>Save / Done</button></div></header>{rich ? <div className="pc-focus-rich"><div className="pc-toolbar"><button type="button" onClick={() => format('bold')}><strong>B</strong></button><button type="button" onClick={() => format('italic')}><em>I</em></button><button type="button" onClick={() => format('insertUnorderedList')}>• List</button><button type="button" onClick={() => format('insertOrderedList')}>1. List</button></div><div ref={editorRef} contentEditable role="textbox" aria-label={`${label} expanded`} aria-multiline="true" data-placeholder="Add charter detail…" onInput={event => onChange(event.currentTarget.innerHTML)} suppressContentEditableWarning /></div> : <textarea ref={editorRef} value={value || ''} onChange={event => onChange(event.target.value)} aria-label={`${label} expanded`} placeholder="Add charter detail…" /> }<footer><span>Changes sync immediately · Press Esc to close</span><button type="button" className="btn-primary" onClick={onClose}>Save / Done</button></footer></div></div>;
}

function MultilineField({ label, required, value, onChange, placeholder }) {
  const [expanded, setExpanded] = useState(false);
  return <div className="pc-control pc-span-2 pc-expandable"><div className="pc-multiline-head"><label>{label}{required && <i>Required</i>}</label><button type="button" className="pc-expand-btn" onClick={() => setExpanded(true)} aria-label={`Expand ${label}`} title="Expand editor">⛶</button></div><textarea rows="5" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />{expanded && <ExpandedEditor label={label} value={value} onChange={onChange} onClose={() => setExpanded(false)} />}</div>;
}

function RichField({ label, required, hint, value, onChange }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || ''; }, [value]);
  const format = command => { ref.current?.focus(); document.execCommand(command, false); onChange(ref.current?.innerHTML || ''); };
  return <div className="pc-field pc-expandable"><div className="pc-label"><label>{label}{required && <i>Required</i>}</label><span>{hint}</span><button type="button" className="pc-expand-btn" onClick={() => setExpanded(true)} aria-label={`Expand ${label}`} title="Expand editor">⛶</button></div><div className="pc-editor"><div className="pc-toolbar"><button type="button" onClick={() => format('bold')}><strong>B</strong></button><button type="button" onClick={() => format('italic')}><em>I</em></button><button type="button" onClick={() => format('insertUnorderedList')}>• List</button><button type="button" onClick={() => format('insertOrderedList')}>1. List</button></div><div ref={ref} contentEditable role="textbox" aria-label={label} aria-multiline="true" data-placeholder="Add charter detail…" onInput={e => onChange(e.currentTarget.innerHTML)} onBlur={e => onChange(e.currentTarget.innerHTML)} suppressContentEditableWarning /></div>{expanded && <ExpandedEditor label={label} value={value} onChange={onChange} rich onClose={() => setExpanded(false)} />}</div>;
}

function EditableTable({ title, description, columns, rows, onChange, addLabel }) {
  const add = () => onChange([...rows, { id: rowId(title), ...Object.fromEntries(columns.map(c => [c.key, ''])) }]);
  const update = (id, key, value) => onChange(rows.map(row => row.id === id ? { ...row, [key]: value } : row));
  return <div className="pc-table-card"><div className="pc-table-head"><div><h3>{title}<i>Required</i></h3><p>{description}</p></div><button type="button" className="btn-secondary" onClick={add}>+ {addLabel}</button></div>{rows.length === 0 ? <button type="button" className="pc-empty" onClick={add}>Add the first {addLabel.toLowerCase()}</button> : <div className="pc-table-scroll"><table><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}<th aria-label="Actions" /></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{columns.map(c => <td key={c.key}><input type={c.type || 'text'} value={row[c.key] || ''} placeholder={c.placeholder} onChange={e => update(row.id, c.key, e.target.value)} /></td>)}<td><button type="button" className="pc-delete" aria-label={`Remove ${title} row`} onClick={() => onChange(rows.filter(item => item.id !== row.id))}>×</button></td></tr>)}</tbody></table></div>}</div>;
}

function Preview({ project, charter, completion, quality, onClose, previewRef }) {
  const renderText = value => plain(value) || 'Not provided';
  return <div className="pc-modal" role="dialog" aria-modal="true" aria-label="Charter preview"><button className="pc-modal-backdrop" onClick={onClose} aria-label="Close preview" /><div className="pc-preview-shell"><div className="pc-preview-actions"><strong>Executive preview</strong><button type="button" onClick={onClose}>×</button></div><article ref={previewRef} className="pc-preview"><header><span>PROJECT CHARTER · DEFINE</span><h1>{project.name}</h1><p>{renderText(charter.projectSummary)}</p><div><b>{completion}% complete</b><b>{quality}/100 quality</b><b>Sponsor: {project.champion || 'Not assigned'}</b><b>Target: {charter.targetDate || 'Not set'}</b></div></header><section><h2>Business Need</h2><p>{renderText(charter.businessCase)}</p><h3>Problem Statement</h3><p>{renderText(charter.problemStatement)}</p></section><section><h2>Goal</h2><p>{renderText(charter.goalStatement)}</p></section><section className="pc-preview-grid"><div><h2>In Scope</h2><p>{renderText(charter.scopeIn)}</p></div><div><h2>Out of Scope</h2><p>{renderText(charter.scopeOut)}</p></div></section><section><h2>Financial Impact</h2><p>{renderText(charter.financialImpact)}</p></section><footer>Aureqin · Project Charter</footer></article></div></div>;
}

export default function ProjectCharter() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getProject, updateProject } = useProjects();
  const { addReportItem } = useReport();
  const project = getProject(id);
  const exists = Boolean(project);
  const [charter, setCharter] = useState(() => ({ ...EMPTY, ...(project?.charter || {}) }));
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0,SECTIONS.findIndex(section=>section.id===(project?.resumeTarget?.artifactId==='charter'?project.resumeTarget.sectionId:'overview'))));
  const [saveState, setSaveState] = useState('saved');
  const [guideOpen, setGuideOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState('normal');
  const [reportNotice, setReportNotice] = useState('');
  const [progressionWarning, setProgressionWarning] = useState(false);
  const previewRef = useRef(null);
  const hydrated = useRef(id);

  useEffect(() => { if (hydrated.current !== id) { setCharter({ ...EMPTY, ...(project?.charter || {}) });setActiveIndex(Math.max(0,SECTIONS.findIndex(section=>section.id===(project?.resumeTarget?.artifactId==='charter'?project.resumeTarget.sectionId:'overview')))); hydrated.current = id; } }, [id, project]);
  useEffect(()=>{if(!project)return;const sectionId=SECTIONS[activeIndex]?.id,currentResume=project.resumeTarget;if(currentResume?.artifactId==='charter'&&currentResume.sectionId===sectionId)return;updateProject(id,{resumeTarget:artifactResume({projectId:id,artifactId:'charter',artifactName:'Project Charter',sectionId})}).catch(()=>{})},[activeIndex,id,project,updateProject]);
  useEffect(()=>{if(!project)return;const shared=project.sharedFields||{};setCharter(current=>{const next={...current,targetDate:current.targetDate||shared.targetDate||'',businessCase:current.businessCase||shared.businessCaseSummary||'',goalStatement:current.goalStatement||shared.goalSummary||'',scopeIn:current.scopeIn||shared.scopeSummary||''};return next.targetDate===current.targetDate&&next.businessCase===current.businessCase&&next.goalStatement===current.goalStatement&&next.scopeIn===current.scopeIn?current:next})},[project]);
  useEffect(() => { if (!exists) return undefined; setSaveState('saving'); const timer = window.setTimeout(() => { updateProject(id, { charter: { ...charter, updatedAt: new Date().toISOString() } }); setSaveState('saved'); }, 700); return () => window.clearTimeout(timer); }, [charter, exists, id, updateProject]);

  const update = (field, value) => {const sharedKey={targetDate:'targetDate',businessCase:'businessCaseSummary',goalStatement:'goalSummary',scopeIn:'scopeSummary'}[field];if(sharedKey)updateProject(id,{sharedFields:{...(project.sharedFields||{}),[sharedKey]:value},...(field==='targetDate'?{targetDate:value}:{})});setCharter(current => ({ ...current, [field]: value }));};
  const complete = field => Array.isArray(charter[field]) ? charter[field].some(row => Object.entries(row).some(([key, value]) => key !== 'id' && plain(value))) : Boolean(plain(charter[field]));
  const completedSections = SECTIONS.filter(section => section.fields.every(complete)).length;
  const completion = Math.round((SECTIONS.reduce((sum, section) => sum + section.fields.filter(complete).length, 0) / SECTIONS.reduce((sum, section) => sum + section.fields.length, 0)) * 100);
  const missingSections=SECTIONS.filter(section=>!section.fields.every(complete));
  const missingRequiredCount=SECTIONS.reduce((sum,section)=>sum+section.fields.filter(field=>!complete(field)).length,0);
  const qualityChecks = useMemo(() => [plain(charter.projectSummary).length >= 40, Boolean(charter.targetDate), plain(charter.businessCase).length >= 80, plain(charter.problemStatement).length >= 50 && /\d/.test(plain(charter.problemStatement)), /\d/.test(plain(charter.goalStatement)), plain(charter.scopeIn) && plain(charter.scopeOut), charter.team.some(r => r.name && r.role), charter.stakeholders.length > 0, charter.timeline.some(r => r.date), /\d/.test(plain(charter.financialImpact)), charter.risks.some(r => r.risk && r.mitigation), charter.approvals.some(r => r.name && r.status)], [charter]);
  const quality = Math.round((qualityChecks.filter(Boolean).length / qualityChecks.length) * 100);
  const current = SECTIONS[activeIndex];
  const saveNow = async () => { await updateProject(id, { charter: { ...charter, schemaVersion: PROJECT_CHARTER_SCHEMA_VERSION, updatedAt: new Date().toISOString() },resumeTarget:artifactResume({projectId:id,artifactId:'charter',artifactName:'Project Charter',sectionId:current.id}) }); setSaveState('saved'); };
  const continueToSipoc=async()=>{await saveNow();await updateProject(id,{resumeTarget:artifactResume({projectId:id,artifactId:'sipoc',artifactName:'SIPOC',sectionId:project.documents?.['document-sipoc']?.sectionState?.activeSectionId||''})});navigate(documentRoute(id,'sipoc'))};
  const requestSipoc=()=>{if(missingRequiredCount){setProgressionWarning(true);return;}continueToSipoc()};
  const exportPdf = async () => { setPreviewOpen(true); setExporting(true); await new Promise(resolve => window.setTimeout(resolve, 200)); try { const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: '#ffffff' }); const pdf = new jsPDF('p', 'mm', 'a4'); const width = 190; const height = canvas.height * width / canvas.width; pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, width, Math.min(height, 277)); pdf.save(`${project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-charter.pdf`); } finally { setExporting(false); } };
  const addCharterToReport = async () => { await addReportItem({ toolId: 'document-charter', title: `Project Charter — ${project.name}`, timestamp: new Date().toISOString(), projectId: project.id, phase:'Define', assetType:'document', documentId: 'project-charter', statsSummary: { Completion: `${completion}%`, Quality: `${quality}/100` }, interpretation: `Project Charter for ${project.name}. ${completedSections} of ${SECTIONS.length} sections are complete.`, documentSnapshot: { schemaVersion: PROJECT_CHARTER_SCHEMA_VERSION, templateId: 'charter', values: charter } }); setReportNotice('Added to Report Builder'); };

  if (!project) return <div className="pc-not-found"><h1>Project not found</h1><p>This charter is not connected to an active project.</p><Link className="btn-primary" to="/projects">Return to projects</Link></div>;

  const table = {
    team: [{ key: 'name', label: 'Name', placeholder: 'Full name' }, { key: 'role', label: 'Role', placeholder: 'Process owner' }, { key: 'allocation', label: 'Allocation', placeholder: '20%' }],
    stakeholders: [{ key: 'name', label: 'Stakeholder', placeholder: 'Name or group' }, { key: 'interest', label: 'Interest', placeholder: 'Primary concern' }, { key: 'engagement', label: 'Engagement', placeholder: 'Weekly review' }],
    timeline: [{ key: 'milestone', label: 'Milestone', placeholder: 'Define gate' }, { key: 'owner', label: 'Owner', placeholder: 'Accountable lead' }, { key: 'date', label: 'Target date', type: 'date' }],
    risks: [{ key: 'risk', label: 'Risk', placeholder: 'Describe exposure' }, { key: 'impact', label: 'Impact', placeholder: 'High / Medium / Low' }, { key: 'mitigation', label: 'Mitigation', placeholder: 'Action and owner' }],
    approvals: [{ key: 'name', label: 'Approver', placeholder: 'Full name' }, { key: 'role', label: 'Role', placeholder: 'Executive sponsor' }, { key: 'status', label: 'Status', placeholder: 'Pending / Approved' }, { key: 'date', label: 'Date', type: 'date' }],
  };

  const renderActiveSection = () => {
    switch (current.id) {
      case 'overview': return <div className="pc-form-grid"><MultilineField label="Executive summary" required value={charter.projectSummary} onChange={value => update('projectSummary', value)} placeholder="Summarize the opportunity, intended outcome, and organizational value." /><div className="pc-control"><label>Project owner</label><input value={project.owner || ''} readOnly /></div><div className="pc-control"><label>Target completion date <i>Required</i></label><input type="date" value={charter.targetDate} onChange={e => update('targetDate', e.target.value)} /></div></div>;
      case 'need': return <div className="pc-stack"><RichField label="Business Case" required hint="Strategic, customer, financial, or compliance rationale." value={charter.businessCase} onChange={v => update('businessCase', v)} /><RichField label="Problem Statement" required hint="Current-state gap with baseline, location, and timeframe." value={charter.problemStatement} onChange={v => update('problemStatement', v)} /></div>;
      case 'goals': return <RichField label="Goal Statement" required hint="Baseline, target, metric, and deadline." value={charter.goalStatement} onChange={v => update('goalStatement', v)} />;
      case 'scope': return <div className="pc-form-grid"><RichField label="In Scope" required hint="Processes, locations, products, and segments included." value={charter.scopeIn} onChange={v => update('scopeIn', v)} /><RichField label="Out of Scope" required hint="Adjacent work intentionally excluded." value={charter.scopeOut} onChange={v => update('scopeOut', v)} /></div>;
      case 'team': return <EditableTable title="Core team" description="People accountable for analysis and delivery." addLabel="Team member" columns={table.team} rows={charter.team} onChange={v => update('team', v)} />;
      case 'stakeholders': return <EditableTable title="Stakeholder register" description="Leaders, customers, and partners affected by the outcome." addLabel="Stakeholder" columns={table.stakeholders} rows={charter.stakeholders} onChange={v => update('stakeholders', v)} />;
      case 'timeline': return <EditableTable title="Milestone plan" description="Decision points and major DMAIC outcomes." addLabel="Milestone" columns={table.timeline} rows={charter.timeline} onChange={v => update('timeline', v)} />;
      case 'financial': return <RichField label="Financial Impact" required hint="Hard savings, cost avoidance, revenue, and validation owner." value={charter.financialImpact} onChange={v => update('financialImpact', v)} />;
      case 'risks': return <EditableTable title="Risk register" description="Threats to outcomes, schedule, adoption, or data quality." addLabel="Risk" columns={table.risks} rows={charter.risks} onChange={v => update('risks', v)} />;
      case 'assumptions': return <RichField label="Assumptions" required hint="Conditions believed true for planning and estimation." value={charter.assumptions} onChange={v => update('assumptions', v)} />;
      case 'constraints': return <RichField label="Constraints" required hint="Fixed limits involving time, people, technology, policy, or budget." value={charter.constraints} onChange={v => update('constraints', v)} />;
      case 'approval': return <EditableTable title="Approval register" description="Formal review status for sponsors and accountable leaders." addLabel="Approver" columns={table.approvals} rows={charter.approvals} onChange={v => update('approvals', v)} />;
      default: return null;
    }
  };

  return <WorkspaceShell className="project-charter-shell" mode={workspaceMode} backTo={`/projects/${id}`} backLabel="Project Home" breadcrumb={<><Link to={`/projects/${id}`}>Project Home</Link><span> / Define / Project Charter</span></>} previousLabel="Back" nextLabel="SIPOC" previousDisabled={false} nextDisabled={false} onPrevious={() => navigate(-1)} onNext={requestSipoc} onMinimize={() => setWorkspaceMode('minimized')} onMaximize={() => setWorkspaceMode('maximized')} onRestore={() => setWorkspaceMode('normal')} onSave={saveNow} onExport={exportPdf} onPrint={() => window.print()} onHelp={() => setGuideOpen(true)}><div className="pc-page">
    <header className="pc-executive"><div className="pc-crumb"><Link to="/projects">Projects</Link><span>/</span><strong>Project Charter</strong></div><div className="pc-title-row"><div><span className="badge badge-define">Define phase</span><h1>{project.name}</h1><p>Project charter · Executive alignment workspace</p></div><div className={`pc-save ${saveState}`}><i />{saveState === 'saving' ? 'Autosaving…' : 'All changes saved'}</div></div><div className="pc-summary-grid"><div><span>Completion</span><strong>{completion}%</strong><div className="pc-mini-bar"><i style={{ width: `${completion}%` }} /></div></div><div><span>Charter quality</span><strong>{quality}<small>/100</small></strong><p>{quality >= 80 ? 'Review ready' : 'Needs development'}</p></div><div><span>Sponsor</span><strong className="pc-summary-text">{project.champion || 'Not assigned'}</strong><p>Executive accountability</p></div><div><span>Target completion</span><strong className="pc-summary-text">{charter.targetDate || 'Not set'}</strong><p>{completedSections} of {SECTIONS.length} sections complete</p></div></div><div className="pc-actionbar"><button className="btn-secondary" type="button" onClick={saveNow}>Save Draft</button><button className="btn-secondary" type="button" onClick={() => setPreviewOpen(true)}>Preview</button><button className="btn-secondary" type="button" onClick={exportPdf} disabled={exporting}>{exporting ? 'Exporting…' : 'Export PDF'}</button><button className="btn-secondary" type="button" onClick={addCharterToReport}>+ Add to Report</button>{reportNotice && <span>{reportNotice}</span>}</div><div className="pc-overall"><span>Overall progress</span><div role="progressbar" aria-valuenow={completion} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${completion}%` }} /></div><strong>{completedSections}/{SECTIONS.length} complete</strong></div></header>
    <div className={`pc-workspace ${guideOpen ? '' : 'guide-closed'}`}><aside className="pc-nav"><span>Charter sections</span>{SECTIONS.map((section, index) => <button type="button" key={section.id} className={index === activeIndex ? 'active' : ''} onClick={() => setActiveIndex(index)}><b>{section.icon}</b><span>{section.label}</span><i className={section.fields.every(complete) ? 'done' : ''}>{section.fields.every(complete) ? '✓' : ''}</i></button>)}</aside><main className="pc-main"><div className="pc-section-header"><div><span>SECTION {current.icon} OF {SECTIONS.length}</span><h2>{current.label}</h2><p>{current.tip}</p></div><div className={current.fields.every(complete) ? 'pc-complete done' : 'pc-complete'}>{current.fields.every(complete) ? '✓ Section complete' : 'Required fields remaining'}</div></div><div className="pc-section-content" data-active-section={current.id}>{renderActiveSection()}</div><footer className="pc-footer"><button type="button" className="btn-secondary" disabled={activeIndex === 0} onClick={() => setActiveIndex(i => i - 1)}>← Previous</button><span>{activeIndex + 1} of {SECTIONS.length}</span><button type="button" className="btn-primary" disabled={activeIndex === SECTIONS.length - 1} onClick={() => setActiveIndex(i => i + 1)}>Next →</button></footer></main><aside className={`pc-guide ${guideOpen ? 'open' : ''}`}><button type="button" className="pc-guide-toggle" onClick={() => setGuideOpen(value => !value)} aria-label={guideOpen ? 'Collapse guidance' : 'Open guidance'}>{guideOpen ? '×' : '?'}</button>{guideOpen && <><span>SECTION GUIDANCE</span><h3>{current.label}</h3><p>{current.tip}</p><div><b>Recommended next step</b><p>{current.next}</p></div><div><b>Quality signal</b><p>{current.fields.every(complete) ? 'This section meets completion requirements.' : 'Complete every required element before gate review.'}</p></div></>}</aside></div>
    {previewOpen && <Preview project={project} charter={charter} completion={completion} quality={quality} onClose={() => setPreviewOpen(false)} previewRef={previewRef} />}
    {progressionWarning&&<div className="pc-progression-modal" role="dialog" aria-modal="true" aria-labelledby="pc-progression-title"><button type="button" className="pc-progression-backdrop" onClick={()=>setProgressionWarning(false)} aria-label="Stay here"/><section><span>GUIDED PROGRESSION</span><h2 id="pc-progression-title">This document is incomplete.</h2><p><strong>{completion}% complete</strong> · {missingRequiredCount} required {missingRequiredCount===1?'item remains':'items remain'}.</p><ul>{missingSections.slice(0,6).map(section=><li key={section.id}>{section.label}</li>)}</ul><p>You can continue to SIPOC and return here later. This charter will remain incomplete.</p><footer><button type="button" className="btn-secondary" onClick={()=>setProgressionWarning(false)}>Stay here</button><button type="button" className="btn-primary" onClick={async()=>{setProgressionWarning(false);await continueToSipoc()}}>Continue anyway</button></footer></section></div>}
  </div></WorkspaceShell>;
}

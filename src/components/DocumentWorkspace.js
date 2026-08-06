import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import WorkspaceShell from './WorkspaceShell';
import ExpandableEditor from './ExpandableEditor';
import { createDocument, documentIdFor, documentScores, textValue } from '../utils/documentModel';
import './DocumentWorkspace.css';

function MultilineField({ field, value, onChange }) {
  const [expanded, setExpanded] = useState(false);
  return <div className={`dw-field ${field.span ? 'wide' : ''}`}><div className="dw-field-label"><label>{field.label}{field.required !== false && <i>Required</i>}</label><button type="button" onClick={() => setExpanded(true)} title={`Expand ${field.label}`} aria-label={`Expand ${field.label}`}>&#10530;</button></div><textarea rows="6" value={value || ''} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} />{expanded && <ExpandableEditor label={field.label} value={value || ''} onChange={onChange} onClose={() => setExpanded(false)} />}</div>;
}

function StructuredTable({ field, rows = [], onChange }) {
  const columns = field.columns || [{ key: 'item', label: 'Item' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }];
  const add = () => onChange([...rows, { id: `row-${Date.now()}`, ...Object.fromEntries(columns.map(column => [column.key, ''])) }]);
  return <div className="dw-table"><div className="dw-table-heading"><div><h3>{field.label}{field.required !== false && <i>Required</i>}</h3><p>{field.help || 'Add and maintain structured project records.'}</p></div><button type="button" className="btn-secondary" onClick={add}>+ Add row</button></div><div className="dw-table-scroll"><table><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}<th /></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{columns.map(column => <td key={column.key}><input value={row[column.key] || ''} onChange={event => onChange(rows.map(item => item.id === row.id ? { ...item, [column.key]: event.target.value } : item))} /></td>)}<td><button type="button" aria-label="Delete row" onClick={() => onChange(rows.filter(item => item.id !== row.id))}>&times;</button></td></tr>)}</tbody></table></div>{!rows.length && <button type="button" className="dw-table-empty" onClick={add}>Add the first row</button>}</div>;
}

function Field({ field, value, onChange }) {
  if (field.type === 'textarea') return <MultilineField field={field} value={value} onChange={onChange} />;
  if (field.type === 'table') return <StructuredTable field={field} rows={Array.isArray(value) ? value : []} onChange={onChange} />;
  if (field.type === 'sig') return null;
  return <div className={`dw-field ${field.span ? 'wide' : ''}`}><label>{field.label}{field.required !== false && <i>Required</i>}</label><input type={field.type === 'date' ? 'date' : 'text'} value={value || ''} placeholder={field.placeholder} onChange={event => onChange(event.target.value)} /></div>;
}

export default function DocumentWorkspace({ template, project, updateProject, onPrintPreview }) {
  const stored = project.documents?.[documentIdFor(template.id)];
  const [document, setDocument] = useState(() => createDocument(template, project.id, stored));
  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState('normal');
  const [guideOpen, setGuideOpen] = useState(true);
  const [saveState, setSaveState] = useState('saved');
  const hydratedKey = useRef(`${project.id}:${template.id}`);
  const documentsRef = useRef(project.documents || {});
  documentsRef.current = project.documents || {};
  const scores = useMemo(() => documentScores(template, document.values), [document.values, template]);
  const current = template.sections[activeIndex];

  useEffect(() => {
    const key = `${project.id}:${template.id}`;
    if (hydratedKey.current !== key) { setDocument(createDocument(template, project.id, project.documents?.[documentIdFor(template.id)])); setActiveIndex(0); hydratedKey.current = key; }
  }, [project, template]);

  const persist = useCallback(next => {
    const record = { ...next, updatedAt: new Date().toISOString() };
    updateProject(project.id, { documents: { ...documentsRef.current, [record.id]: record } });
  }, [project.id, updateProject]);

  useEffect(() => {
    setSaveState('saving');
    const timer = window.setTimeout(() => { persist(document); setSaveState('saved'); }, 700);
    return () => window.clearTimeout(timer);
  }, [document, persist]);

  const updateValue = (id, value) => setDocument(currentDocument => ({ ...currentDocument, values: { ...currentDocument.values, [id]: value } }));
  const saveNow = () => { persist(document); setSaveState('saved'); };
  const sectionComplete = section => section.fields.filter(field => field.type !== 'sig' && field.required !== false).every(field => textValue(document.values[field.id]));
  const restore = () => setMode('normal');
  const print = () => { onPrintPreview?.(document.values); window.setTimeout(() => window.print(), 50); };

  return <WorkspaceShell className={`document-workspace ${guideOpen ? '' : 'guidance-closed'}`} mode={mode} backTo="/projects" backLabel="Project" breadcrumb={<><Link to="/projects">Projects</Link><span> / </span><Link to="/templates">Documents</Link><span> / {template.name}</span></>} previousLabel={activeIndex ? template.sections[activeIndex - 1].title : 'Previous'} nextLabel={activeIndex < template.sections.length - 1 ? template.sections[activeIndex + 1].title : 'Next'} previousDisabled={activeIndex === 0} nextDisabled={activeIndex === template.sections.length - 1} onPrevious={() => setActiveIndex(index => Math.max(0, index - 1))} onNext={() => setActiveIndex(index => Math.min(template.sections.length - 1, index + 1))} onMinimize={() => setMode('minimized')} onMaximize={() => setMode('maximized')} onRestore={restore} onSave={saveNow} saving={saveState === 'saving'} onExport={print} onPrint={print} onHelp={() => setGuideOpen(true)}>
    <header className="dw-executive"><div><span className={`badge badge-${template.phase.toLowerCase()}`}>{template.phase} workspace</span><h1>{template.name}</h1><p>{project.name} &middot; {template.desc}</p></div><div className={`dw-autosave ${saveState}`}><i />{saveState === 'saving' ? 'Autosaving...' : 'All changes saved'}</div><div className="dw-score"><div><span>Completion</span><strong>{scores.completion}%</strong><i><b style={{ width: `${scores.completion}%` }} /></i></div><div><span>Quality score</span><strong>{scores.quality}<small>/100</small></strong><p>{scores.quality >= 80 ? 'Review ready' : 'Needs development'}</p></div><div><span>Project</span><strong>{project.name}</strong><p>{scores.populated} of {scores.total} required fields</p></div></div></header>
    <div className="dw-layout"><aside className="dw-nav"><span>DOCUMENT SECTIONS</span>{template.sections.map((section, index) => <button type="button" key={`${section.title}-${index}`} className={activeIndex === index ? 'active' : ''} onClick={() => setActiveIndex(index)}><b>{String(index + 1).padStart(2, '0')}</b><span>{section.title}</span><i>{sectionComplete(section) ? '✓' : ''}</i></button>)}</aside><main className="dw-main"><header><div><span>SECTION {activeIndex + 1} OF {template.sections.length}</span><h2>{current.title}</h2><p>{current.guidance || `Complete the ${current.title.toLowerCase()} details with clear, reviewable information.`}</p></div><em className={sectionComplete(current) ? 'complete' : ''}>{sectionComplete(current) ? '✓ Section complete' : 'Required fields remaining'}</em></header><section className={`dw-section-grid cols-${Math.min(current.cols || 1, 2)}`}>{current.fields.map(field => <Field key={field.id} field={field} value={document.values[field.id]} onChange={value => updateValue(field.id, value)} />)}</section><footer><button type="button" className="btn-secondary" disabled={activeIndex === 0} onClick={() => setActiveIndex(index => index - 1)}>&larr; Previous</button><span>{activeIndex + 1} of {template.sections.length}</span><button type="button" className="btn-primary" disabled={activeIndex === template.sections.length - 1} onClick={() => setActiveIndex(index => index + 1)}>Next &rarr;</button></footer></main><aside className={`dw-guide ${guideOpen ? 'open' : ''}`}><button type="button" onClick={() => setGuideOpen(open => !open)} aria-label={guideOpen ? 'Collapse guidance' : 'Open guidance'}>{guideOpen ? '×' : '?'}</button>{guideOpen && <><span>CONTEXT GUIDANCE</span><h3>{current.title}</h3><p>{current.guidance || `Document the information decision-makers need to understand and approve this section.`}</p><div><b>Recommended next step</b><p>Validate this section with the accountable project owner before continuing.</p></div><div><b>Connected assets</b><p>This document can reference project datasets, analyses, reports, and other documents through its versioned reference model.</p></div></>}</aside></div>
  </WorkspaceShell>;
}

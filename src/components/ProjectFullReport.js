import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import DocumentReport, {collectDocumentCss} from './DocumentReport';

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// One page summarizing the assembled report itself — project name, suite, current stage, when it
// was generated, and how many documents follow — so Print All / Save to File hand back a
// self-describing artifact instead of dropping the reader straight into the first document with no
// context for what they're holding or how current it is.
function ProjectReportCover({project,lifecycle,stageLabel,entryCount,generatedAt}){
  return <div className="dr-report dr-cover">
    <header className="dr-header"><div><span>{lifecycle.label}</span><h1>{project.name}</h1><p>{project.goal||''}</p></div><div className="dr-meta"><span>Generated {generatedAt}</span><span>{entryCount} document{entryCount===1?'':'s'}</span></div></header>
    <div className="dr-grid">
      <div className="dr-field"><h4>Suite</h4><p>{lifecycle.label}</p></div>
      <div className="dr-field"><h4>Current Stage</h4><p>{stageLabel}</p></div>
      <div className="dr-field"><h4>Owner</h4><p>{project.owner||'—'}</p></div>
      <div className="dr-field"><h4>Champion / Sponsor</h4><p>{project.champion||'—'}</p></div>
    </div>
  </div>;
}

// The full project report: a cover page followed by every supplied document entry — each rendered
// through the exact same DocumentReport component the per-document Print/Export PDF buttons use,
// so a combined export can never drift from what a single document's export looks like. `entries`
// is expected pre-filtered (documents with a saved record only) and pre-ordered (by suite lifecycle
// stage) by projectReportEntries in utils/projectReport.js — this component only lays out whatever
// it's given, the same pure-function-of-props contract DocumentReport itself follows: no DOM, no
// visibility state, callable by Print All, Save to File, tests, or any future automation.
export default function ProjectFullReport({project,lifecycle,stageLabel,entries,generatedAt}){
  return <div className="dr-project-report">
    <ProjectReportCover project={project} lifecycle={lifecycle} stageLabel={stageLabel} entryCount={entries.length} generatedAt={generatedAt}/>
    {entries.map(({template,record,phase,diagram})=><div key={template.id} className="dr-page-break"><DocumentReport template={template} project={project} record={record} phase={phase} diagram={diagram}/></div>)}
  </div>;
}

// A pure function of (project, lifecycle, stageLabel, entries, generatedAt) returning a standalone
// HTML document string — the multi-document equivalent of DocumentReport.js's
// renderReportDocument(), same reasons: testable and callable without a DOM, and the single place
// this combined document's HTML shape is authored.
export function renderProjectFullReportDocument({project,lifecycle,stageLabel,entries,generatedAt}){
  const markup=renderToStaticMarkup(<ProjectFullReport project={project} lifecycle={lifecycle} stageLabel={stageLabel} entries={entries} generatedAt={generatedAt}/>);
  const css=collectDocumentCss();
  const title=escapeHtml(`${project.name} — Full Report`);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}\nbody{margin:0;background:#fff}@page{margin:12mm}</style></head><body>${markup}</body></html>`;
}

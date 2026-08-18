import React, { useState } from 'react';
import { helpFor } from '../config/helpContent';
import './HelpButton.css';

// The one reusable "?" help affordance every surface uses (Project Hub tabs, Document Library
// cards, Project Binder, Report Builder, Analysis Catalog, Evidence Library, Project Workspace
// home, WorkspaceShell's sequence nav) — standardized on the same interaction DocumentWorkspace.js
// already established (a "?" toggle that reveals a contextual guidance panel). By default it never
// carries its own help text: passing (surfaceId, suiteId) resolves content from
// config/helpContent.js's helpFor(), so content stays centrally editable and AI-readable instead of
// being copy-pasted into each component. Per-document-card help (Document Library) is the one
// surface whose content is naturally per-template data already living on the template object
// (name/desc/first-section guidance) rather than a fixed central list — for that case a caller may
// pass a pre-resolved `content` object directly instead of (surfaceId, suiteId); both paths render
// through the same panel. Renders nothing if no content is available, so it's always safe to drop
// into a component without first checking whether an entry exists.
export default function HelpButton({ surfaceId, suiteId, content: providedContent, label }) {
  const [open, setOpen] = useState(false);
  const content = providedContent || helpFor(surfaceId, suiteId);
  if (!content) return null;
  return (
    <span className="help-trigger" onClick={event => event.stopPropagation()}>
      <button
        type="button"
        className="help-trigger-btn"
        onClick={event => { event.stopPropagation(); setOpen(value => !value); }}
        aria-expanded={open}
        aria-label={open ? `Collapse help: ${content.title}` : `Help: ${label || content.title}`}
        title={open ? 'Close help' : 'Help'}
      >
        {open ? '×' : '?'}
      </button>
      {open && (
        <div className="help-panel" role="note" aria-label={`${content.title} help`}>
          <h4>{content.title}</h4>
          <p>{content.summary}</p>
          {content.whenToUse && (
            <div>
              <b>When to use it</b>
              <p>{content.whenToUse}</p>
            </div>
          )}
          {content.example && (
            <div>
              <b>Example</b>
              <p>{content.example}</p>
            </div>
          )}
          {content.connectsTo && (
            <div>
              <b>How it connects</b>
              <p>{content.connectsTo}</p>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

import React, { useState } from 'react';
import { helpFor } from '../config/helpContent';
import './HelpButton.css';

// The one reusable help affordance every surface uses (Project Hub tabs, Document Library cards,
// Project Binder, Report Builder, Analysis Catalog, Evidence Library, Project Workspace home,
// WorkspaceShell's sequence nav) — standardized on the same "? Help" labeled-button interaction
// WorkspaceShell's own toolbar already established (see .workspace-shell-actions button in
// WorkspaceShell.css, which DocumentWorkspace's Help button uses), not a tiny unlabeled dot: a
// full button with visible text, sized and styled like every other button on the platform, so it
// reads as "a clickable help button" at a glance rather than needing to be discovered. It never
// carries its own help text: passing (surfaceId, suiteId) resolves content from
// config/helpContent.js's helpFor(), so content stays centrally editable and AI-readable instead of
// being copy-pasted into each component. Per-document-card help (Document Library) is the one
// surface whose content is naturally per-template data already living on the template object
// (name/desc/first-section guidance) rather than a fixed central list — for that case a caller may
// pass a pre-resolved `content` object directly instead of (surfaceId, suiteId); both paths render
// through the same panel. Renders nothing if no content is available, so it's always safe to drop
// into a component without first checking whether an entry exists.
//
// The panel's z-index is pinned to 9999 (see HelpButton.css) so it wins any stacking-context
// conflict, but z-index alone cannot rescue a trigger nested inside an ancestor with
// `overflow:auto/hidden` (e.g. a horizontally-scrolling tab row) — that ancestor clips the
// absolutely-positioned panel regardless of z-index, a different CSS mechanism entirely. Callers
// placing a trigger inside a scrollable container must render it as a sibling just outside that
// container instead (see ProjectDetail.js's tab nav for the pattern), not rely on z-index to fix
// clipping it can't fix.
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
        {open ? '×' : '?'} <span>Help</span>
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

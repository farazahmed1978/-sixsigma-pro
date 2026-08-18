import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import HelpButton from './HelpButton';
import './WorkspaceShell.css';

export default function WorkspaceShell({
  children, className = '', mode = 'normal', backTo = '/projects', backLabel = 'Projects',
  previousLabel = 'Previous', nextLabel = 'Next', previousDisabled = false, nextDisabled = false,
  onPrevious, onNext, onMinimize, onMaximize, onRestore, breadcrumb, onSave, onExport,
  onPrint, onHelp, saveLabel = 'Save', saving = false, sequencePreviousLabel,
  sequenceNextLabel, sequencePreviousDisabled = false, sequenceNextDisabled = false,
  onSequencePrevious, onSequenceNext, suiteId,
}) {
  useEffect(() => {
    const handleEscape = event => { if (event.key === 'Escape' && mode !== 'normal') onRestore?.(); };
    document.addEventListener('keydown', handleEscape);
    document.body.classList.toggle('workspace-shell-locked', mode === 'maximized');
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('workspace-shell-locked');
    };
  }, [mode, onRestore]);

  return <div className={`workspace-shell workspace-mode-${mode} ${className}`}>
    <div className="workspace-shell-bar" role="toolbar" aria-label="Workspace controls">
      <Link to={backTo} className="workspace-shell-back">&larr; <span>Back to {backLabel}</span></Link>
      {breadcrumb && <div className="workspace-shell-breadcrumb" aria-label="Breadcrumb">{breadcrumb}</div>}
      <div className="workspace-shell-navigation">
        <button type="button" onClick={onPrevious} disabled={previousDisabled} title="Return to the screen you visited immediately before this one">&larr; History: {previousLabel}</button>
        {!onSequenceNext && <button type="button" onClick={onNext} disabled={nextDisabled}>{nextLabel} &rarr;</button>}
      </div>
      {onSequenceNext && <div className="workspace-shell-sequence" aria-label="Ordered workflow navigation">
        <span>Sequence</span>
        <HelpButton surfaceId="workspace-shell-sequence" suiteId={suiteId}/>
        <button type="button" onClick={onSequencePrevious} disabled={sequencePreviousDisabled} title="Move to the previous item in the ordered workflow">&larr; {sequencePreviousLabel || 'Previous item'}</button>
        <button type="button" onClick={onSequenceNext} disabled={sequenceNextDisabled} title="Move to the next item in the ordered workflow">{sequenceNextLabel || 'Next item'} &rarr;</button>
      </div>}
      <div className="workspace-shell-display">
        {mode === 'normal' && <button type="button" onClick={onMinimize} title="Collapse workspace side panels">&minus; <span>Minimize</span></button>}
        {mode !== 'normal' && <button type="button" onClick={onRestore}>&#8634; <span>Restore</span></button>}
        {mode !== 'maximized' && <button type="button" className="primary" onClick={onMaximize}>&#10530; <span>Full Screen</span></button>}
      </div>
      {(onSave || onExport || onPrint || onHelp) && <div className="workspace-shell-actions">
        {onHelp && <button type="button" onClick={onHelp} title="Workspace help">? <span>Help</span></button>}
        {onPrint && <button type="button" onClick={onPrint}>Print</button>}
        {onExport && <button type="button" onClick={onExport}>Export PDF</button>}
        {onSave && <button type="button" className="primary" onClick={onSave} disabled={saving}>{saving ? 'Saving...' : saveLabel}</button>}
      </div>}
    </div>
    <div className="workspace-shell-content">{children}</div>
  </div>;
}

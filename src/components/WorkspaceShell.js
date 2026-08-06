import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './WorkspaceShell.css';

export default function WorkspaceShell({
  children,
  className = '',
  mode = 'normal',
  backTo = '/projects',
  backLabel = 'Projects',
  previousLabel = 'Previous',
  nextLabel = 'Next',
  previousDisabled = false,
  nextDisabled = false,
  onPrevious,
  onNext,
  onMinimize,
  onMaximize,
  onRestore,
}) {
  useEffect(() => {
    const handleEscape = event => {
      if (event.key === 'Escape' && mode !== 'normal') onRestore?.();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.classList.toggle('workspace-shell-locked', mode === 'maximized');
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.classList.remove('workspace-shell-locked');
    };
  }, [mode, onRestore]);

  return <div className={`workspace-shell workspace-mode-${mode} ${className}`}>
    <div className="workspace-shell-bar" role="toolbar" aria-label="Workspace controls">
      <Link to={backTo} className="workspace-shell-back">← <span>Back to {backLabel}</span></Link>
      <div className="workspace-shell-navigation">
        <button type="button" onClick={onPrevious} disabled={previousDisabled}>← {previousLabel}</button>
        <button type="button" onClick={onNext} disabled={nextDisabled}>{nextLabel} →</button>
      </div>
      <div className="workspace-shell-display">
        {mode === 'normal' && <button type="button" onClick={onMinimize} title="Collapse workspace side panels">− <span>Minimize</span></button>}
        {mode !== 'normal' && <button type="button" onClick={onRestore}>↙ <span>Restore</span></button>}
        {mode !== 'maximized' && <button type="button" className="primary" onClick={onMaximize}>⛶ <span>Full Screen</span></button>}
      </div>
    </div>
    <div className="workspace-shell-content">{children}</div>
  </div>;
}

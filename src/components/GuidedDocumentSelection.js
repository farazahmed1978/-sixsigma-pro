import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useProjects} from '../context/ProjectsContext';
import {PM_REQUIRED_DOCUMENTS, PM_OPTIONAL_DOCUMENTS} from '../config/guidedFlow';
import {projectHubRoute} from '../utils/projectResume';
import './GuidedDocumentSelection.css';

// Phase 5C, Part 2 — shown once a PM project's mandatory documents are done and
// project.selectedDocuments hasn't been set yet (see ProjectDetail.js's guided branch). Purely
// presentational over the same PM_REQUIRED_DOCUMENTS/PM_OPTIONAL_DOCUMENTS config the AI layer can
// read directly — no business logic duplicated here beyond which ids are checked.
export default function GuidedDocumentSelection({project}) {
  const navigate = useNavigate();
  const {updateProject} = useProjects();
  const [selected, setSelected] = useState(() => new Set(PM_REQUIRED_DOCUMENTS.map(doc => doc.id)));

  const toggle = id => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const confirm = async () => {
    await updateProject(project.id, {selectedDocuments: [...selected]});
    navigate(projectHubRoute(project.id));
  };

  let cardIndex = 0;

  return (
    <div className="guided-document-selection">
      <div className="gds-shell">
        <header className="gds-header">
          <h1>Your foundation is set. Now choose your planning documents.</h1>
          <p>Select the documents that apply to your project. Required ones are already checked. You can always add or remove documents later from the full view.</p>
        </header>

        <section className="gds-section">
          <h2>Always included</h2>
          <div className="gds-grid">
            {PM_REQUIRED_DOCUMENTS.map(doc => (
              <label key={doc.id} className="gds-card selected locked" style={{animationDelay: `${cardIndex++ * 35}ms`}}>
                <input type="checkbox" checked disabled aria-label={`${doc.label} (required)`} />
                <div className="gds-card-body">
                  <div className="gds-card-check" aria-hidden="true">
                    <svg viewBox="0 0 16 16"><polyline points="3,9 7,13 13,4" /></svg>
                  </div>
                  <div>
                    <div className="gds-card-title"><strong>{doc.label}</strong><i className="gds-badge-required">Required</i></div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="gds-section">
          <h2>Choose what applies</h2>
          <div className="gds-grid">
            {PM_OPTIONAL_DOCUMENTS.map(doc => {
              const isSelected = selected.has(doc.id);
              return (
                <label key={doc.id} className={`gds-card${isSelected ? ' selected' : ''}`} style={{animationDelay: `${cardIndex++ * 35}ms`}}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggle(doc.id)} aria-label={doc.label} />
                  <div className="gds-card-body">
                    <div className="gds-card-check" aria-hidden="true">
                      <svg viewBox="0 0 16 16"><polyline points="3,9 7,13 13,4" /></svg>
                    </div>
                    <div>
                      <div className="gds-card-title"><strong>{doc.label}</strong><i className="gds-badge-optional">Optional</i></div>
                      <p>{doc.description}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="gds-cta-footer">
        <span className="gds-cta-count">{selected.size} document{selected.size === 1 ? '' : 's'} selected</span>
        <button type="button" className="btn-primary" onClick={confirm}>Start with these →</button>
      </footer>
    </div>
  );
}

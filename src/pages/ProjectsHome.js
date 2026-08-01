import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useProjects, PHASES } from '../context/ProjectsContext';
import { useReport } from '../context/ReportContext';
import './ProjectWorkspace.css';

// Mirrors the phase assigned to each tool in App.js's toolMeta — used only to
// suggest a default phase when assigning an item; the user can move it.
const TOOL_PHASE = {
  'control-chart': 'Control',
  'run-chart': 'Control',
  'capability': 'Measure',
  'histogram': 'Analyze',
  'pareto': 'Analyze',
  'scatter': 'Analyze',
  'boxplot': 'Analyze',
  'fishbone': 'Analyze',
  'fmea': 'Improve',
  'msa': 'Measure',
  'gage-rr': 'Measure',
  'vsm': 'Improve',
  'descriptive': 'Measure',
  'multivari': 'Analyze',
  'correlation': 'Analyze',
  'regression': 'Analyze',
  'anova': 'Analyze',
  'sigma-calculator': 'Measure',
  'sample-size-calculator': 'Measure',
  'power-calculator': 'Measure',
};

const PHASE_COLOR = {
  Define: 'var(--yellow)',
  Measure: 'var(--green)',
  Analyze: 'var(--orange)',
  Improve: 'var(--purple)',
  Control: 'var(--cyan)',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { getProject, updateProject, assignItemToPhase, removeItemFromProject, updatePhaseNotes } = useProjects();
  const { items } = useReport();
  const [editingHeader, setEditingHeader] = useState(false);

  const project = getProject(id);

  if (!project) {
    return <Navigate to="/projects" replace />;
  }

  const assignedIds = new Set(PHASES.flatMap(ph => project.phases[ph].itemIds));
  const unassignedItems = items.filter(item => !assignedIds.has(item.id));

  const itemById = (itemId) => items.find(i => i.id === itemId);

  return (
    <div className="pw-page">
      <Link to="/projects" className="pw-back-link">← All Projects</Link>

      <div className="card pw-header-card">
        {editingHeader ? (
          <div className="form-grid">
            <div className="form-group">
              <label>Project Name</label>
              <input type="text" value={project.name} onChange={e => updateProject(project.id, { name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Goal</label>
              <input type="text" value={project.goal} onChange={e => updateProject(project.id, { goal: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Project Owner</label>
              <input type="text" value={project.owner} onChange={e => updateProject(project.id, { owner: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Champion / Sponsor</label>
              <input type="text" value={project.champion} onChange={e => updateProject(project.id, { champion: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="pw-header-display">
            <div>
              <h1>{project.name}</h1>
              {project.goal && <p className="pw-project-goal">{project.goal}</p>}
              <div className="pw-header-meta-row">
                {project.owner && <span>Owner: <strong>{project.owner}</strong></span>}
                {project.champion && <span>Champion: <strong>{project.champion}</strong></span>}
              </div>
            </div>
          </div>
        )}
        <button className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => setEditingHeader(e => !e)}>
          {editingHeader ? 'Done' : 'Edit Details'}
        </button>
      </div>

      {unassignedItems.length > 0 && (
        <div className="card pw-unassigned-card">
          <h3 className="section-title">Unassigned Report Items</h3>
          <p className="pw-hint">These exist in your Report Builder but aren't placed in this project's DMAIC story yet. Assign each to a phase below.</p>
          <div className="pw-unassigned-list">
            {unassignedItems.map(item => (
              <div key={item.id} className="pw-unassigned-item">
                <span>{item.title}</span>
                <select
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) assignItemToPhase(project.id, e.target.value, item.id);
                  }}
                >
                  <option value="" disabled>Add to phase…</option>
                  {PHASES.map(ph => (
                    <option key={ph} value={ph}>
                      {ph}{TOOL_PHASE[item.toolId] === ph ? ' (suggested)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pw-phase-board">
        {PHASES.map(phase => (
          <div key={phase} className="pw-phase-col" style={{ '--phase-color': PHASE_COLOR[phase] }}>
            <div className="pw-phase-col-header">
              <span className="cat-dot" style={{ background: PHASE_COLOR[phase] }} />
              {phase}
              <span className="pw-phase-count">{project.phases[phase].itemIds.length}</span>
            </div>

            {project.phases[phase].itemIds.length === 0 ? (
              <div className="pw-phase-empty">No items yet</div>
            ) : (
              project.phases[phase].itemIds.map(itemId => {
                const item = itemById(itemId);
                if (!item) return null;
                return (
                  <div key={itemId} className="pw-phase-item">
                    <span>{item.title}</span>
                    <button
                      className="pw-remove-btn"
                      title="Remove from project"
                      onClick={() => removeItemFromProject(project.id, itemId)}
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}

            <textarea
              className="pw-phase-notes"
              placeholder={`${phase} notes…`}
              value={project.phases[phase].notes}
              onChange={e => updatePhaseNotes(project.id, phase, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

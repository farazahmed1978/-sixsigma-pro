import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';
import {lifecycleForProject,lifecycleStageLabels} from '../foundation/lifecycle';
import { useInteractions } from '../context/InteractionContext';
import './ProjectWorkspace.css';
import {projectResumeCta} from '../utils/projectResume';

function projectProgress(project) {
  const stages=lifecycleStageLabels(lifecycleForProject(project));
  const done = stages.filter(stage => (project.phases?.[stage]?.itemIds||[]).length > 0).length;
  return Math.round((done / stages.length) * 100);
}

function currentPhase(project) {
  // First configured lifecycle stage with no assigned records is where work resumes.
  const next = lifecycleStageLabels(lifecycleForProject(project)).find(stage => (project.phases?.[stage]?.itemIds||[]).length === 0);
  return next || 'Complete';
}

export default function ProjectsHome() {
  const { projects, createProject, deleteProject, deletingProjectId } = useProjects();
  const {confirm,toast}=useInteractions();
  const [showForm, setShowForm] = useState(false);
  const emptyForm = { name: '', goal: '', owner: '', champion: '', suiteId: 'operational-excellence' };
  const [form, setForm] = useState(emptyForm);

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createProject({ ...form, methodology: form.suiteId === 'project-management' ? 'pmp' : 'lean-six-sigma' });
    setForm(emptyForm);
    setShowForm(false);
  };

  return (
    <div className="pw-page">
      <div className="pw-header">
        <div>
          <h1>Project Workspace</h1>
          <p>Group project records through each suite's native lifecycle, all in one place.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {showForm && (
        <div className="card pw-new-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Reduce Customer Complaint Rate"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Goal</label>
              <input
                type="text"
                value={form.goal}
                onChange={e => setForm(p => ({ ...p, goal: e.target.value }))}
                placeholder="e.g. Reduce defects from 4.5% to under 2%"
              />
            </div>
            <div className="form-group">
              <label>Project Owner</label>
              <input
                type="text"
                value={form.owner}
                onChange={e => setForm(p => ({ ...p, owner: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Champion / Sponsor</label>
              <input
                type="text"
                value={form.champion}
                onChange={e => setForm(p => ({ ...p, champion: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Suite</label>
              <select
                value={form.suiteId}
                onChange={e => setForm(p => ({ ...p, suiteId: e.target.value }))}
              >
                <option value="operational-excellence">Operational Excellence</option>
                <option value="project-management">Project Management</option>
              </select>
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={handleCreate}>
            Create Project
          </button>
        </div>
      )}

      {projects.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="empty-state-icon">🗂️</div>
          <h3>No Projects Yet</h3>
          <p>Create a project to start organizing work through its native lifecycle.</p>
        </div>
      ) : (
        <div className="pw-project-grid">
          {projects.map(project => {
            const progress = projectProgress(project);
            const phase = currentPhase(project);
            const resume = projectResumeCta(project);
            return (
              <div key={project.id} className="card pw-project-card">
                <div className="pw-project-card-top">
                  <h3>{project.name}</h3>
                  <button
                    className="pw-delete-btn"
                    disabled={Boolean(deletingProjectId)}
                    title="Delete project"
                    onClick={async () => {
                      if (await confirm({title:'Delete project and its contents?',message:`“${project.name}” and its project-owned datasets, documents, analyses, report assets, artifacts, and placements will be permanently removed. Shared organization assets are not affected. This cannot be undone.`,confirmLabel:'Delete Project and Contents',destructive:true})) {
                        try{await deleteProject(project.id);toast('Project and its contents deleted and verified.');}catch(error){toast(error.message||'Project deletion could not be verified. Retry the deletion.');}
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
                {project.goal && <p className="pw-project-goal">{project.goal}</p>}
                <div className="pw-progress-track">
                  <div className="pw-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="pw-project-meta">
                  <span className="badge">{phase === 'Complete' ? '✓ Complete' : `${phase} Phase`}</span>
                  <span className="pw-progress-label">{progress}% populated</span>
                </div>
                <div className="pw-project-actions">
                  <Link to={resume.target.route} className="btn-primary pw-open-btn">{resume.label}</Link>
                  <Link to={`/projects/${project.id}`} className="btn-secondary pw-open-btn">Open Project →</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

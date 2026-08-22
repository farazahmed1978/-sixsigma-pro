import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProjects } from '../context/ProjectsContext';
import {lifecycleForProject,lifecycleStageLabels} from '../foundation/lifecycle';
import { useInteractions } from '../context/InteractionContext';
import './ProjectWorkspace.css';
import {projectResumeCta} from '../utils/projectResume';
import {printProjectReport,exportProjectReportToFile} from '../utils/projectReport';
import HelpButton from '../components/HelpButton';
import NewProjectEntry from '../components/NewProjectEntry';
import {pendingAssignedTollgates} from '../foundation/tollgate';
import {useAuth} from '../context/AuthContext';

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

// Print All and Save to File both delegate to utils/projectReport.js's printProjectReport() /
// exportProjectReportToFile() — plain functions of (project, options) that assemble and render the
// combined report entirely outside this component, so they stay directly callable (by tests, or by
// a future automation/AI layer) independent of any UI state. `notice` here is purely a local
// display of whatever status string those functions choose to report through onStatus; it holds no
// data or logic those functions don't already have on their own.
function ProjectCard({ project, resume, progress, phase, deletingProjectId, onDelete }) {
  const [notice, setNotice] = useState('');
  return (
    <div className="card pw-project-card">
      <div className="pw-project-card-top">
        <h3>{project.name}</h3>
        <button
          className="pw-delete-btn"
          disabled={Boolean(deletingProjectId)}
          title="Delete project"
          onClick={() => onDelete(project)}
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
        <button type="button" className="btn-secondary pw-open-btn" onClick={() => printProjectReport(project, { onStatus: setNotice })}>🖨️ Print All</button>
        <button type="button" className="btn-secondary pw-open-btn" onClick={() => exportProjectReportToFile(project, { onStatus: setNotice })}>⬇ Save to File</button>
        <HelpButton surfaceId="project-workspace-home" suiteId={lifecycleForProject(project).id} label="Print All / Save to File"/>
      </div>
      {notice && <p className="pw-project-notice">{notice}</p>}
    </div>
  );
}

export default function ProjectsHome() {
  const { projects,reviewProjects=[],assignedTollgates=[], createProject, deleteProject, deletingProjectId } = useProjects();
  const {user}=useAuth();
  const {confirm,toast}=useInteractions();
  const location = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const emptyForm = { name: '', goal: '', owner: '', champion: '', suiteId: 'operational-excellence' };
  const [form, setForm] = useState(emptyForm);
  const pendingReviews=pendingAssignedTollgates(reviewProjects,Object.fromEntries(reviewProjects.map(project=>[project.id,assignedTollgates.filter(review=>review.project_id===project.id)])),user);

  // Supports the Project Hub's "Start a new project" link, which navigates here with
  // state.openEntry rather than duplicating the entry-card's mount/lifecycle in ProjectDetail.js.
  useEffect(() => { if (location.state?.openEntry) setEntryOpen(true); }, [location.state]);

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
        <button className="btn-primary" onClick={() => (showForm ? setShowForm(false) : setEntryOpen(true))}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {entryOpen && (
        <NewProjectEntry
          onClose={() => setEntryOpen(false)}
          onAdvanced={() => { setEntryOpen(false); setShowForm(true); }}
        />
      )}

      {pendingReviews.length>0&&<section className="pw-review-queue" aria-labelledby="pending-tollgate-reviews"><header><div><span>ACTIONABLE REVIEWS</span><h2 id="pending-tollgate-reviews">Tollgates awaiting your review</h2></div><strong>{pendingReviews.length}</strong></header>{pendingReviews.map(review=><article key={review.id}><div><h3>{review.projectName} — {review.phase} Tollgate</h3><p>Submitted by {review.submittedBy}</p><small>{review.status} · Attempt {review.attempt}{review.submittedAt?` · ${new Date(review.submittedAt).toLocaleString()}`:''}</small></div><Link className="btn-primary" to={review.destination}>Review Tollgate →</Link></article>)}</section>}

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
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              resume={projectResumeCta(project)}
              progress={projectProgress(project)}
              phase={currentPhase(project)}
              deletingProjectId={deletingProjectId}
              onDelete={async targetProject => {
                if (await confirm({title:'Delete project and its contents?',message:`“${targetProject.name}” and its project-owned datasets, documents, analyses, report assets, artifacts, and placements will be permanently removed. Shared organization assets are not affected. This cannot be undone.`,confirmLabel:'Delete Project and Contents',destructive:true})) {
                  try{await deleteProject(targetProject.id);toast('Project and its contents deleted and verified.');}catch(error){toast(error.message||'Project deletion could not be verified. Retry the deletion.');}
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import React, {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {useProjects} from '../context/ProjectsContext';
import {useEntitlements} from '../context/EntitlementContext';
import {TEMPLATES} from '../pages/Templates';
import {NAVIGATION} from '../config/navigation';
import {navigationItems} from '../utils/navigationTools';
import {artifactContextDecision} from '../config/artifactContext';
import {createDocument} from '../utils/documentModel';
import {documentRepository} from '../repositories/documentRepository';
import {createGuidedFlowState} from '../config/guidedFlow';
import './NewProjectEntry.css';

const SUITE_LABELS = {'operational-excellence': 'Operational Excellence', 'project-management': 'Project Management'};
const methodologyForSuite = suiteId => (suiteId === 'project-management' ? 'pmp' : 'lean-six-sigma');

// Every /documents/<templateId> route belongs to one or both suites via NAVIGATION's groups —
// navigationItems(NAVIGATION) is the same flattening helper Templates.js already uses (as
// TEMPLATE_SUITE_IDS) to derive suite membership from that nested structure, so this reuses it
// rather than re-walking OE_GROUPS/PM_GROUPS a second way. Charter is excluded here — it's the
// mandatory first document of the guided Full Project path (Path 1), not a standalone pick.
const documentsBySuite = (() => {
  const bySuite = {};
  navigationItems(NAVIGATION).forEach(item => {
    if (typeof item.path !== 'string' || !item.suiteId) return;
    const match = item.path.match(/^\/documents\/([^/]+)$/);
    if (!match || match[1] === 'charter') return;
    const template = TEMPLATES.find(candidate => candidate.id === match[1]);
    if (!template) return;
    (bySuite[item.suiteId] ||= new Map()).set(template.id, template);
  });
  return Object.fromEntries(Object.entries(bySuite).map(([suiteId, map]) => [suiteId, [...map.values()]]));
})();

// The Asset Details "Guided Mode" indicator this mirrors visually lives elsewhere; here it marks
// every screen of the entry flow so the user always knows they're in the structured path and can
// see the way back to the traditional forms (via onAdvanced, or Back to the landing screen).
function GuidedBadge() {
  return <span className="npe-badge">Guided Mode</span>;
}

function PathCard({icon, title, description, onClick}) {
  return (
    <button type="button" className="npe-path-card" onClick={onClick}>
      <span className="npe-path-icon">{icon}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </button>
  );
}

export default function NewProjectEntry({onClose, onAdvanced}) {
  const navigate = useNavigate();
  const {user, profile} = useAuth();
  const {createProject} = useProjects();
  const {canAccess} = useEntitlements() || {};
  const hasOEAccess = Boolean(canAccess?.('operational-excellence'));
  const [step, setStep] = useState('landing');
  const [form, setForm] = useState({name: '', description: '', targetDate: '', suiteId: 'operational-excellence'});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const firstName = useMemo(() => {
    const full = (profile?.full_name || profile?.display_name || profile?.name || '').trim();
    return full.split(/\s+/)[0] || 'there';
  }, [profile]);

  const canAdvanceStep1 = form.name.trim().length > 0;

  const confirmFullProject = () => {
    const id = createProject({
      name: form.name.trim(),
      goal: form.description.trim(),
      suiteId: form.suiteId,
      methodology: methodologyForSuite(form.suiteId),
      targetDate: form.targetDate,
      creationPath: 'guided-project',
      guidedFlowState: createGuidedFlowState(),
    });
    navigate(`/projects/${id}`, {state: {guided: true}});
  };

  const chooseStandaloneDocument = async template => {
    if (creating) return;
    if (!user?.id || !profile?.default_organization_id) { setError('Authenticated user and organization context are required.'); return; }
    setCreating(true); setError('');
    try {
      const record = createDocument(template, '', null, {
        id: undefined,
        organizationId: profile.default_organization_id,
        createdBy: user.id,
        artifactContext: artifactContextDecision({mode: 'standalone'}),
        creationPath: 'standalone',
      });
      const row = await documentRepository.createStandalone({
        project_id: null,
        organization_id: profile.default_organization_id,
        created_by: user.id,
        status: 'draft',
        methodology: 'lean-six-sigma',
        lifecycle_phase: template.phase,
        dmaic_phase: template.phase,
        title: template.name,
        content: record,
      });
      navigate(`/documents/${template.id}?standalone=${encodeURIComponent(row.id)}`);
    } catch (createError) {
      setError(createError.message || 'This document could not be created.');
      setCreating(false);
    }
  };

  const chooseAnalysis = () => navigate('/analysis', {state: {creationPath: 'analysis'}});

  return (
    <div className="npe-overlay" role="dialog" aria-modal="true" aria-label="Start something new">
      <div className="npe-shell">
        <header className="npe-header">
          <GuidedBadge />
          <button type="button" className="npe-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        {step === 'landing' && (
          <div className="npe-landing">
            <h1>Hi {firstName} — what are we building today?</h1>
            <div className="npe-path-grid">
              <PathCard icon="📋" title="Full Project" description="Start a structured project with a complete lifecycle, documentation, and tracking." onClick={() => setStep('full-step1')} />
              <PathCard icon="📄" title="Standalone Document" description="Create a single document or report without a full project." onClick={() => setStep('standalone-picker')} />
              {hasOEAccess && <PathCard icon="📊" title="Analysis or Test" description="Run a statistical analysis, hypothesis test, or data exploration." onClick={chooseAnalysis} />}
            </div>
            <button type="button" className="npe-advanced-link" onClick={onAdvanced}>Switch to advanced setup</button>
          </div>
        )}

        {step === 'full-step1' && (
          <div className="npe-step">
            <span className="npe-step-label">Step 1 of 2 — Project details</span>
            <div className="form-group">
              <label>Project Name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Reduce Customer Complaint Rate" autoFocus />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input type="text" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="e.g. Reduce defects from 4.5% to under 2%" />
            </div>
            <div className="form-group">
              <label>Target Completion Date</label>
              <input type="date" value={form.targetDate} onChange={e => setForm(p => ({...p, targetDate: e.target.value}))} />
            </div>
            <div className="form-group">
              <label>Suite</label>
              <select value={form.suiteId} onChange={e => setForm(p => ({...p, suiteId: e.target.value}))}>
                <option value="operational-excellence">Operational Excellence</option>
                <option value="project-management">Project Management</option>
              </select>
            </div>
            <footer className="npe-step-footer">
              <button type="button" className="btn-secondary" onClick={() => setStep('landing')}>← Back</button>
              <button type="button" className="btn-primary" disabled={!canAdvanceStep1} onClick={() => setStep('full-step2')}>Next →</button>
            </footer>
          </div>
        )}

        {step === 'full-step2' && (
          <div className="npe-step">
            <span className="npe-step-label">Step 2 of 2 — Confirm</span>
            <dl className="npe-summary">
              <div><dt>Project Name</dt><dd>{form.name}</dd></div>
              <div><dt>Suite</dt><dd>{SUITE_LABELS[form.suiteId]}</dd></div>
              <div><dt>Target Completion</dt><dd>{form.targetDate || 'Not set'}</dd></div>
            </dl>
            <footer className="npe-step-footer">
              <button type="button" className="btn-secondary" onClick={() => setStep('full-step1')}>← Back</button>
              <button type="button" className="btn-primary" onClick={confirmFullProject}>Create Project</button>
            </footer>
          </div>
        )}

        {step === 'standalone-picker' && (
          <div className="npe-step">
            <span className="npe-step-label">Choose a document</span>
            {error && <div className="npe-error" role="alert">{error}</div>}
            {Object.entries(documentsBySuite).map(([suiteId, templates]) => (
              <div className="npe-doc-group" key={suiteId}>
                <h3>{SUITE_LABELS[suiteId] || suiteId}</h3>
                <div className="npe-doc-grid">
                  {templates.map(template => (
                    <button type="button" key={template.id} className="npe-doc-card" disabled={creating} onClick={() => chooseStandaloneDocument(template)}>
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <footer className="npe-step-footer">
              <button type="button" className="btn-secondary" onClick={() => setStep('landing')}>← Back</button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

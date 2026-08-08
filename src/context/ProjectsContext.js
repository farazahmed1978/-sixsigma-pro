import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {useAuth} from './AuthContext';

const ProjectsContext = createContext();
const STORAGE_KEY = 'sixsigmapro_projects';
export const EVIDENCE_SCHEMA_VERSION = 1;

export const PHASES = ['Define', 'Measure', 'Analyze', 'Improve', 'Control'];

function emptyPhases() {
  return PHASES.reduce((acc, p) => ({ ...acc, [p]: { notes: '', itemIds: [] } }), {});
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Guard against older/malformed records missing a phase key.
    return parsed.map(p => ({ status: 'Active', currentPhase: 'Define', targetDate: '',methodology:'hybrid', ...p, phases: { ...emptyPhases(), ...p.phases }, documents: p.documents || {}, evidenceLibrary: Array.isArray(p.evidenceLibrary) ? p.evidenceLibrary : [], artifacts: Array.isArray(p.artifacts) ? p.artifacts : [], binderConfig: { order: [], hiddenIds: [], links: {}, ...(p.binderConfig || {}) }, sharedFields: {projectName:p.name||'',sponsor:p.champion||'',owner:p.owner||'',targetDate:p.targetDate||'',status:p.status||'Active',...(p.sharedFields||{})}, activityLog: Array.isArray(p.activityLog) ? p.activityLog : [], team: Array.isArray(p.team) ? p.team : [], timeline: Array.isArray(p.timeline) ? p.timeline : [],tasks:Array.isArray(p.tasks)?p.tasks:[],risks:Array.isArray(p.risks)?p.risks:[],issues:Array.isArray(p.issues)?p.issues:[],decisions:Array.isArray(p.decisions)?p.decisions:[],approvals:Array.isArray(p.approvals)?p.approvals:[] }));
  } catch {
    return [];
  }
}

export function ProjectsProvider({ children }) {
  const {user,profile}=useAuth();
  const [projects, setProjects] = useState(loadProjects);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.warn('Projects could not be saved to localStorage:', e);
    }
  }, [projects]);

  const createProject = useCallback((data) => {
    const id = `proj-${Date.now()}`;
    const project = {
      id,
      name: (data.name || '').trim() || 'Untitled Project',
      goal: data.goal || '',
      owner: data.owner || '',
      champion: data.champion || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),organizationId:profile?.default_organization_id||'',createdBy:user?.id||'',methodology:data.methodology||'hybrid',
      phases: emptyPhases(),
      documents: {},
      evidenceLibrary: [],
      artifacts: [],
      binderConfig: { order: [], hiddenIds: [], links: {} },
      sharedFields: {projectName:(data.name||'').trim()||'Untitled Project',sponsor:data.champion||'',owner:data.owner||'',processOwner:data.processOwner||'',startDate:data.startDate||'',targetDate:data.targetDate||'',status:'Active',budget:data.budget||'',businessCaseSummary:data.businessCaseSummary||'',goalSummary:data.goal||'',scopeSummary:data.scopeSummary||''},
      status: 'Active',
      currentPhase: 'Define',
      targetDate: '',
      team: [],
      timeline: [],
      tasks:[],risks:[],issues:[],decisions:[],approvals:[],
      activityLog: [{ id: `activity-${Date.now()}`, action: 'Project created', assetType: 'project', at: new Date().toISOString() }],
    };
    setProjects(prev => [...prev, project]);
    return id;
  }, [profile,user]);

  const updateProject = useCallback((id, updates) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
      const shared = { ...(p.sharedFields || {}) };
      const mappings = { name:'projectName', champion:'sponsor', owner:'owner', processOwner:'processOwner', startDate:'startDate', targetDate:'targetDate', status:'status', budget:'budget', goal:'goalSummary', scopeSummary:'scopeSummary', businessCaseSummary:'businessCaseSummary' };
      Object.entries(mappings).forEach(([source,target]) => { if (Object.prototype.hasOwnProperty.call(updates,source)) shared[target]=updates[source]; });
      return { ...p, ...updates, sharedFields:{...shared,...(updates.sharedFields||{})}, updatedAt:new Date().toISOString() };
    }));
  }, []);

  const deleteProject = useCallback((id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  // An item lives in at most one phase per project — assigning it to a new
  // phase removes it from any other phase in that same project first.
  const assignItemToPhase = useCallback((projectId, phase, itemId) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const phases = {};
      PHASES.forEach(ph => {
        phases[ph] = { ...p.phases[ph], itemIds: p.phases[ph].itemIds.filter(i => i !== itemId) };
      });
      phases[phase] = { ...phases[phase], itemIds: [...phases[phase].itemIds, itemId] };
      return { ...p, phases };
    }));
  }, []);

  const removeItemFromProject = useCallback((projectId, itemId) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const phases = {};
      PHASES.forEach(ph => {
        phases[ph] = { ...p.phases[ph], itemIds: p.phases[ph].itemIds.filter(i => i !== itemId) };
      });
      return { ...p, phases };
    }));
  }, []);

  const updatePhaseNotes = useCallback((projectId, phase, notes) => {
    setProjects(prev => prev.map(p => (
      p.id === projectId
        ? { ...p, phases: { ...p.phases, [phase]: { ...p.phases[phase], notes } } }
        : p
    )));
  }, []);

  const getProject = useCallback((id) => projects.find(p => p.id === id), [projects]);

  const addEvidence = useCallback((projectId, evidence) => {
    const id = evidence.id || `evidence-${Date.now()}`;
    setProjects(prev => prev.map(project => project.id === projectId ? { ...project, evidenceLibrary: [...(project.evidenceLibrary || []), { schemaVersion: EVIDENCE_SCHEMA_VERSION, id, projectId,organizationId:project.organizationId||profile?.default_organization_id||'',createdBy:user?.id||'',status:'active',methodology:project.methodology||'hybrid',phase:evidence.phase||project.currentPhase||'Analyze', assetType: 'analysis', title: 'Untitled Evidence', sourceType: '', sourceId: '', datasetIds: [], analysisIds: [], reportIds: [], documentIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...evidence }] } : project));
    return id;
  }, [profile,user]);

  const updateEvidence = useCallback((projectId, evidenceId, updates) => setProjects(prev => prev.map(project => project.id === projectId ? { ...project, evidenceLibrary: (project.evidenceLibrary || []).map(item => item.id === evidenceId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item) } : project)), []);
  const removeEvidence = useCallback((projectId, evidenceId) => setProjects(prev => prev.map(project => project.id === projectId ? { ...project, evidenceLibrary: (project.evidenceLibrary || []).filter(item => item.id !== evidenceId) } : project)), []);
  const recordActivity = useCallback((projectId, activity) => setProjects(prev => prev.map(project => project.id === projectId ? { ...project, activityLog: [{ id: activity.id || `activity-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, at: activity.at || new Date().toISOString(), ...activity }, ...(project.activityLog || [])].slice(0, 100) } : project)), []);
  const addArtifact = useCallback((projectId, artifact) => {
    const id = artifact.id || `artifact-${Date.now()}`;
    setProjects(prev => prev.map(project => project.id === projectId ? { ...project, artifacts: [...(project.artifacts || []), { id, projectId,organizationId:project.organizationId||profile?.default_organization_id||'',createdBy:user?.id||'', schemaVersion: 1, title: 'Untitled Artifact', type: 'artifact',status:'active',methodology:project.methodology||'hybrid', phase: project.currentPhase || 'Define', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), linkedDocumentIds: [], linkedAnalysisIds: [], linkedReportIds: [], ...artifact }] } : project));
    return id;
  }, [profile,user]);
  const updateArtifact = useCallback((projectId, artifactId, updates) => setProjects(prev => prev.map(project => project.id === projectId ? { ...project, artifacts: (project.artifacts || []).map(item => item.id === artifactId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item) } : project)), []);
  const removeArtifact = useCallback((projectId, artifactId) => setProjects(prev => prev.map(project => project.id === projectId ? { ...project, artifacts: (project.artifacts || []).filter(item => item.id !== artifactId) } : project)), []);

  return (
    <ProjectsContext.Provider value={{
      projects,
      createProject,
      updateProject,
      deleteProject,
      assignItemToPhase,
      removeItemFromProject,
      updatePhaseNotes,
      getProject,
      addEvidence,
      updateEvidence,
      removeEvidence,
      recordActivity,
      addArtifact,
      updateArtifact,
      removeArtifact,
    }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export const useProjects = () => useContext(ProjectsContext);

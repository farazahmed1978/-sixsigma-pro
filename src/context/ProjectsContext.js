import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {useAuth} from './AuthContext';
import {projectRepository} from '../repositories/projectRepository';
import {HYDRATION,nextGeneration,isCurrentGeneration} from '../services/persistenceSafety';

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

export function normalizeProject(project) {
  return { status: 'Active', currentPhase: 'Define', targetDate: '', methodology: 'hybrid', ...project,
    phases: { ...emptyPhases(), ...(project.phases || {}) }, documents: project.documents || {},
    evidenceLibrary: Array.isArray(project.evidenceLibrary) ? project.evidenceLibrary : [], artifacts: Array.isArray(project.artifacts) ? project.artifacts : [],
    binderConfig: { order: [], hiddenIds: [], links: {}, ...(project.binderConfig || {}) },
    sharedFields: { projectName: project.name || '', sponsor: project.champion || '', owner: project.owner || '', targetDate: project.targetDate || '', status: project.status || 'Active', ...(project.sharedFields || {}) },
    activityLog: Array.isArray(project.activityLog) ? project.activityLog : [], team: Array.isArray(project.team) ? project.team : [], timeline: Array.isArray(project.timeline) ? project.timeline : [],
    tasks: Array.isArray(project.tasks) ? project.tasks : [], risks: Array.isArray(project.risks) ? project.risks : [], issues: Array.isArray(project.issues) ? project.issues : [], decisions: Array.isArray(project.decisions) ? project.decisions : [], approvals: Array.isArray(project.approvals) ? project.approvals : [] };
}
export const projectFromRow = row => normalizeProject({ ...(row.content || {}), id: row.id, name: row.name, organizationId: row.organization_id, createdBy: row.created_by, status: row.status, methodology: row.methodology, currentPhase: row.current_phase, targetDate: row.target_date || '', createdAt: row.created_at, updatedAt: row.updated_at });
export const projectToRow = project => ({ id: project.id, organization_id: project.organizationId, created_by: project.createdBy, name: project.name, status: String(project.status || 'active').toLowerCase(), methodology: project.methodology || 'hybrid', current_phase: project.currentPhase || 'Define', target_date: project.targetDate || null, content: project, updated_at: new Date().toISOString() });

export function ProjectsProvider({ children }) {
  const {user,profile,configured}=useAuth();
  const [projects, setProjects] = useState(() => configured ? [] : loadProjects());
  const [hydrationStatus,setHydrationStatus]=useState(configured?HYDRATION.HYDRATING:HYDRATION.READY);
  const [persistenceError,setPersistenceError]=useState('');
  const [deletingProjectId,setDeletingProjectId]=useState('');
  const hydrated = useRef(!configured);
  const generation=useRef(0);

  useEffect(() => {
    let active = true;
    if (!configured) { hydrated.current = true; return undefined; }
    const request=nextGeneration(generation.current);generation.current=request;setProjects([]);setHydrationStatus(HYDRATION.HYDRATING);setPersistenceError('');
    hydrated.current = false;
    if (!user || !profile?.default_organization_id) { setProjects([]); return () => { active = false; }; }
    projectRepository.listCloud(profile.default_organization_id).then(rows => { if (active&&isCurrentGeneration(request,generation.current)) { setProjects(rows.map(projectFromRow)); hydrated.current = true;setHydrationStatus(HYDRATION.READY); } }).catch(error => {if(active&&isCurrentGeneration(request,generation.current)){setHydrationStatus(HYDRATION.ERROR);setPersistenceError(error.message||'Projects could not be loaded from Aureqin.');}});
    return () => { active = false; };
  }, [configured, profile?.default_organization_id, user]);

  useEffect(() => {
    if (configured || !hydrated.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch (e) { console.warn('Projects could not be saved to localStorage:', e); }
  }, [configured, projects]);

  useEffect(() => {
    if (!configured || !hydrated.current || !user || !profile?.default_organization_id) return undefined;
    const timer = window.setTimeout(() => Promise.all(projects.map(project => projectRepository.save(projectToRow(project)))).catch(error => console.error('Projects could not be saved to Aureqin:', error)), 250);
    return () => window.clearTimeout(timer);
  }, [configured, profile?.default_organization_id, projects, user]);

  const createProject = useCallback((data) => {
    const id = crypto.randomUUID();
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
    const current=projects.find(project=>project.id===id);if(!current)return Promise.reject(new Error('The target project is no longer available.'));
      const shared = { ...(current.sharedFields || {}) };
      const mappings = { name:'projectName', champion:'sponsor', owner:'owner', processOwner:'processOwner', startDate:'startDate', targetDate:'targetDate', status:'status', budget:'budget', goal:'goalSummary', scopeSummary:'scopeSummary', businessCaseSummary:'businessCaseSummary' };
      Object.entries(mappings).forEach(([source,target]) => { if (Object.prototype.hasOwnProperty.call(updates,source)) shared[target]=updates[source]; });
      const next={ ...current, ...updates, sharedFields:{...shared,...(updates.sharedFields||{})}, updatedAt:new Date().toISOString() };
    setProjects(prev => prev.map(project => project.id===id?next:project));
    return configured&&user?projectRepository.save(projectToRow(next)):Promise.resolve(next);
  }, [configured,projects,user]);

  const deleteProject = useCallback(async (id) => {
    if(deletingProjectId)return false;setDeletingProjectId(id);setPersistenceError('');generation.current=nextGeneration(generation.current);
    try{if (configured && user) await projectRepository.remove(id);setProjects(prev => prev.filter(p => p.id !== id));window.dispatchEvent(new CustomEvent('aureqin:project-deleted', { detail: { projectId: id } }));setDeletingProjectId('');return true}catch(error){setDeletingProjectId('');setPersistenceError(error.message||'Project deletion could not be verified. Retry the deletion.');throw error;}
  }, [configured, deletingProjectId,user]);

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
      hydrationStatus,persistenceError,deletingProjectId,
    }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export const useProjects = () => useContext(ProjectsContext);

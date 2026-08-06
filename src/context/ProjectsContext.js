import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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
    return parsed.map(p => ({ ...p, phases: { ...emptyPhases(), ...p.phases }, documents: p.documents || {}, evidenceLibrary: Array.isArray(p.evidenceLibrary) ? p.evidenceLibrary : [] }));
  } catch {
    return [];
  }
}

export function ProjectsProvider({ children }) {
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
      phases: emptyPhases(),
      documents: {},
      evidenceLibrary: [],
    };
    setProjects(prev => [...prev, project]);
    return id;
  }, []);

  const updateProject = useCallback((id, updates) => {
    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
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
    setProjects(prev => prev.map(project => project.id === projectId ? { ...project, evidenceLibrary: [...(project.evidenceLibrary || []), { schemaVersion: EVIDENCE_SCHEMA_VERSION, id, projectId, assetType: 'analysis', title: 'Untitled Evidence', sourceType: '', sourceId: '', datasetIds: [], analysisIds: [], reportIds: [], documentIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...evidence }] } : project));
    return id;
  }, []);

  const updateEvidence = useCallback((projectId, evidenceId, updates) => setProjects(prev => prev.map(project => project.id === projectId ? { ...project, evidenceLibrary: (project.evidenceLibrary || []).map(item => item.id === evidenceId ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item) } : project)), []);
  const removeEvidence = useCallback((projectId, evidenceId) => setProjects(prev => prev.map(project => project.id === projectId ? { ...project, evidenceLibrary: (project.evidenceLibrary || []).filter(item => item.id !== evidenceId) } : project)), []);

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
    }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export const useProjects = () => useContext(ProjectsContext);

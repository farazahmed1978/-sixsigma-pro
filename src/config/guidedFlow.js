import {resolveProjectSuiteId} from '../foundation/lifecycle';
import {projectHubRoute} from '../utils/projectResume';

// Phase 5B — the mandatory document sequence each suite's guided "Full Project" path walks the
// user through after project creation. This is a deliberately curated 3-document subset, not the
// full DMAIC/PMP catalog src/utils/defineSequence.js's nextDmaicArtifact() already sequences —
// guided routing always resolves through this file, never through nextDmaicArtifact, so the two
// can diverge without conflict. Ids must match the real TEMPLATES ids (src/pages/Templates.js) —
// the charter's real id is 'charter', not 'project-charter', and Voice of Customer's is 'voc'.
//
// Phase 5C adds `explanation` — the contextual "why this document matters" copy GuidedWorkspace.js
// shows above each document's fields.
export const PM_MANDATORY_SEQUENCE = [
  {id: 'charter', label: 'Project Charter', description: 'Defines project mandate, scope, and executive authorization', explanation: "This is the foundation of your project. It authorizes the work, defines scope, and names who's accountable. Every downstream document traces back to what you write here. Your sponsor will sign off on this before planning begins."},
  {id: 'stakeholder-register', label: 'Stakeholder Register', description: 'Identifies everyone with a stake in the project', explanation: "Before you can plan anything, you need to know who has a stake in the outcome. This document identifies everyone who can influence or be affected by your project — and what they need from you. Miss someone here and you'll hear from them later."},
  {id: 'benefits-management-plan', label: 'Benefits Management Plan', description: 'Defines the value this project will deliver and how it will be measured', explanation: "Projects exist to deliver value. This document defines what value you're promising to deliver, how you'll measure it, and who's accountable for making sure it's actually realized. Without this, there's no way to know if the project succeeded."},
];

export const OE_MANDATORY_SEQUENCE = [
  {id: 'charter', label: 'Project Charter', description: 'Defines the problem, goal, scope, team, and business case', explanation: 'Every DMAIC project starts here. The charter aligns your team, your champion, and your stakeholders on the problem you\'re solving, the goal you\'re chasing, and the boundaries of your work. It must be approved before you collect a single data point.'},
  {id: 'sipoc', label: 'SIPOC', description: 'Maps the high-level process from Suppliers to Customers', explanation: 'Before you measure anything, map the process at a high level. SIPOC shows Suppliers, Inputs, the Process steps, Outputs, and Customers — the five elements that define what you\'re actually working on. This scopes your project and prevents scope creep.'},
  {id: 'voc', label: 'Voice of Customer', description: 'Captures what customers need and expect from this process', explanation: 'Your process exists to serve customers. The Voice of Customer captures what they actually need — not what you assume they need. This drives your Critical to Quality requirements and everything downstream in Analyze and Improve.'},
];

export const getMandatorySequence = suiteId => (suiteId === 'project-management' ? PM_MANDATORY_SEQUENCE : OE_MANDATORY_SEQUENCE);

// {total, completed, current, remaining, percentComplete, isComplete} — a pure readout the AI
// layer (and computeProjectHealth(), see src/foundation/projectHealth.js) can call directly with
// just a suiteId and a list of completed document ids, no component/UI dependency.
export const getGuidedProgress = (suiteId, completedDocumentIds = []) => {
  const sequence = getMandatorySequence(suiteId);
  const total = sequence.length;
  const completed = sequence.filter(doc => completedDocumentIds.includes(doc.id)).length;
  const current = sequence.find(doc => !completedDocumentIds.includes(doc.id)) || null;
  const remaining = total - completed;
  const percentComplete = total ? Math.round((completed / total) * 100) : 100;
  return {total, completed, current, remaining, percentComplete, isComplete: remaining === 0};
};

export const createGuidedFlowState = () => ({
  isGuided: true,
  mandatoryComplete: false,
  completedMandatoryDocs: [],
  currentMandatoryStep: 0,
  enteredAt: new Date().toISOString(),
});

// The single orchestration point ProjectCharter.js and DocumentWorkspace.js both call on
// completing a mandatory document — one source of truth for "what's next" so the two call sites
// never duplicate (or drift on) this branching logic. Pure: no side effects, no persistence —
// callers apply guidedFlowState via updateProject() themselves.
//
// Phase 5C: navigation is no longer per-document (GuidedWorkspace.js is a single persistent
// container that switches documents in place, required for the step/document transition
// animations to be real CSS transitions rather than a route remount) — so nextRoute always
// targets the project hub, never a charter/document-specific route. GuidedDocumentSelection.js
// (PM only — no OE document-selection list exists yet) is what the hub renders next once
// mandatoryComplete is true and project.selectedDocuments hasn't been set; an OE project instead
// drops straight back to the plain hub with no guided state, same as Phase 5B.
export const advanceGuidedFlow = (project, completedDocId) => {
  const suiteId = resolveProjectSuiteId(project);
  const sequence = getMandatorySequence(suiteId);
  const previous = project.guidedFlowState || createGuidedFlowState();
  const completedMandatoryDocs = previous.completedMandatoryDocs.includes(completedDocId)
    ? previous.completedMandatoryDocs
    : [...previous.completedMandatoryDocs, completedDocId];
  const nextDoc = sequence.find(doc => !completedMandatoryDocs.includes(doc.id)) || null;
  const mandatoryComplete = !nextDoc;
  const guidedFlowState = {...previous, completedMandatoryDocs, currentMandatoryStep: completedMandatoryDocs.length, mandatoryComplete};
  const nextRoute = mandatoryComplete && suiteId !== 'project-management'
    ? {pathname: projectHubRoute(project.id)}
    : {pathname: projectHubRoute(project.id), state: {guided: true}};
  return {guidedFlowState, nextDoc, nextRoute};
};

// Shared CTA-footer label logic for ProjectCharter.js's and DocumentWorkspace.js's guided
// branches — both need the exact same "what does the Continue button say" rule, so it lives here
// once rather than being duplicated in two files. `{nextDoc, nextRoute}` is exactly what
// advanceGuidedFlow() above returns.
export const guidedContinueLabel = ({nextDoc, nextRoute}) => {
  if (nextDoc) return `Continue to ${nextDoc.label} →`;
  return nextRoute.state?.guided ? 'Choose your planning documents →' : 'Finish guided setup →';
};

// Phase 5C, Part 2 — GuidedDocumentSelection.js's required/optional document catalog. PM only: the
// spec's lists (WBS, EVM Dashboard, procurement, etc.) are PM-specific concepts with no OE/DMAIC
// equivalent, and no OE list has been defined yet — advanceGuidedFlow() above routes an OE
// project straight to the plain hub, skipping this screen entirely. Ids are the real,
// already-existing PMP_TEMPLATES ids (src/config/pmpTemplates.js's generic(name, group) factory:
// id = slug(name)) — confirmed against that file, not guessed.
export const PM_REQUIRED_DOCUMENTS = [
  {id: 'risk-register', label: 'Risk Register'},
  {id: 'issue-log', label: 'Issue Log'},
  {id: 'action-item-log', label: 'Action Item Log'},
  {id: 'decision-log', label: 'Decision Log'},
];

export const PM_OPTIONAL_DOCUMENTS = [
  {id: 'wbs', label: 'WBS', description: 'Break the work into manageable packages with clear owners'},
  {id: 'schedule-baseline', label: 'Schedule Baseline', description: 'Set your planned timeline so you can track variance'},
  {id: 'cost-baseline', label: 'Cost Baseline', description: 'Define your budget so you can track spend against it'},
  {id: 'evm-dashboard', label: 'EVM Dashboard', description: 'Track cost and schedule performance with earned value — for projects with formal financial reporting'},
  {id: 'communications-management-plan', label: 'Communications Management Plan', description: 'For projects with complex stakeholder communication needs'},
  {id: 'risk-management-plan', label: 'Risk Management Plan', description: 'For high-risk projects that need a formal risk governance approach'},
  {id: 'procurement-management-plan', label: 'Procurement Management Plan', description: "Only needed if you're buying goods or services from vendors"},
  {id: 'stakeholder-engagement-plan', label: 'Stakeholder Engagement Plan', description: 'For projects where stakeholder buy-in is a key success factor'},
  {id: 'change-management-plan', label: 'Change Management Plan', description: 'For projects driving organizational or behavioral change'},
  {id: 'quality-management-plan', label: 'Quality Management Plan', description: 'For projects with formal quality standards or compliance requirements'},
  {id: 'raid-log', label: 'RAID Log', description: 'A combined tracker for Risks, Assumptions, Issues, and Dependencies'},
  {id: 'project-governance-framework', label: 'Project Governance Framework', description: 'For projects requiring formal governance structure and decision authority'},
  {id: 'resource-management-plan', label: 'Resource Management Plan', description: 'For projects with complex resource allocation across multiple teams'},
  {id: 'schedule-management-plan', label: 'Schedule Management Plan', description: 'Defines how schedule will be developed, monitored, and controlled'},
  {id: 'cost-management-plan', label: 'Cost Management Plan', description: 'Defines how costs will be estimated, tracked, and controlled'},
];

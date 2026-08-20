import {
  PM_MANDATORY_SEQUENCE,
  OE_MANDATORY_SEQUENCE,
  getMandatorySequence,
  getGuidedProgress,
  createGuidedFlowState,
  advanceGuidedFlow,
  guidedContinueLabel,
  PM_REQUIRED_DOCUMENTS,
  PM_OPTIONAL_DOCUMENTS,
} from './guidedFlow';

test('getMandatorySequence returns the PM sequence for project-management', () => {
  expect(getMandatorySequence('project-management')).toBe(PM_MANDATORY_SEQUENCE);
  expect(getMandatorySequence('project-management').map(doc => doc.id)).toEqual(['charter', 'stakeholder-register', 'benefits-management-plan']);
});

test('getMandatorySequence returns the OE sequence for operational-excellence and as the default fallback', () => {
  expect(getMandatorySequence('operational-excellence')).toBe(OE_MANDATORY_SEQUENCE);
  expect(getMandatorySequence('operational-excellence').map(doc => doc.id)).toEqual(['charter', 'sipoc', 'voc']);
  expect(getMandatorySequence(undefined)).toBe(OE_MANDATORY_SEQUENCE);
  expect(getMandatorySequence('something-else')).toBe(OE_MANDATORY_SEQUENCE);
});

test('getGuidedProgress at 0% completion', () => {
  expect(getGuidedProgress('operational-excellence', [])).toEqual({
    total: 3, completed: 0, current: OE_MANDATORY_SEQUENCE[0], remaining: 3, percentComplete: 0, isComplete: false,
  });
});

test('getGuidedProgress at partial completion', () => {
  expect(getGuidedProgress('operational-excellence', ['charter'])).toEqual({
    total: 3, completed: 1, current: OE_MANDATORY_SEQUENCE[1], remaining: 2, percentComplete: 33, isComplete: false,
  });
  expect(getGuidedProgress('project-management', ['charter', 'stakeholder-register'])).toEqual({
    total: 3, completed: 2, current: PM_MANDATORY_SEQUENCE[2], remaining: 1, percentComplete: 67, isComplete: false,
  });
});

test('getGuidedProgress at full completion', () => {
  expect(getGuidedProgress('operational-excellence', ['charter', 'sipoc', 'voc'])).toEqual({
    total: 3, completed: 3, current: null, remaining: 0, percentComplete: 100, isComplete: true,
  });
});

test('getGuidedProgress defaults completedDocumentIds to an empty array', () => {
  expect(getGuidedProgress('operational-excellence').completed).toBe(0);
});

test('createGuidedFlowState returns the expected initial shape', () => {
  const state = createGuidedFlowState();
  expect(state.isGuided).toBe(true);
  expect(state.mandatoryComplete).toBe(false);
  expect(state.completedMandatoryDocs).toEqual([]);
  expect(state.currentMandatoryStep).toBe(0);
  expect(typeof state.enteredAt).toBe('string');
});

test('every mandatory sequence entry (both suites) carries an explanation for the guided workspace', () => {
  [...PM_MANDATORY_SEQUENCE, ...OE_MANDATORY_SEQUENCE].forEach(doc => {
    expect(typeof doc.explanation).toBe('string');
    expect(doc.explanation.length).toBeGreaterThan(0);
  });
});

// Phase 5C: GuidedWorkspace.js is a single persistent container that switches documents in place
// (required for the step/document transition animations to be real CSS transitions, not a route
// remount) — so nextRoute always targets the project hub, never a charter/document-specific route.
test('advanceGuidedFlow appends the completed doc, resolves the next mandatory document, and always routes to the hub with guided state (OE)', () => {
  const project = {id: 'proj-1', suiteId: 'operational-excellence', guidedFlowState: createGuidedFlowState()};
  const {guidedFlowState, nextDoc, nextRoute} = advanceGuidedFlow(project, 'charter');
  expect(guidedFlowState.completedMandatoryDocs).toEqual(['charter']);
  expect(guidedFlowState.currentMandatoryStep).toBe(1);
  expect(guidedFlowState.mandatoryComplete).toBe(false);
  expect(nextDoc.id).toBe('sipoc');
  expect(nextRoute).toEqual({pathname: '/projects/proj-1', state: {guided: true}});
});

test('advanceGuidedFlow is idempotent — completing an already-completed doc does not duplicate it', () => {
  const project = {id: 'proj-1', suiteId: 'operational-excellence', guidedFlowState: {...createGuidedFlowState(), completedMandatoryDocs: ['charter']}};
  const {guidedFlowState} = advanceGuidedFlow(project, 'charter');
  expect(guidedFlowState.completedMandatoryDocs).toEqual(['charter']);
});

test('advanceGuidedFlow on the last mandatory OE document marks mandatoryComplete and routes to the plain hub (no OE document-selection screen exists)', () => {
  const project = {id: 'proj-1', suiteId: 'operational-excellence', guidedFlowState: {...createGuidedFlowState(), completedMandatoryDocs: ['charter', 'sipoc']}};
  const {guidedFlowState, nextDoc, nextRoute} = advanceGuidedFlow(project, 'voc');
  expect(guidedFlowState.completedMandatoryDocs).toEqual(['charter', 'sipoc', 'voc']);
  expect(guidedFlowState.mandatoryComplete).toBe(true);
  expect(nextDoc).toBeNull();
  expect(nextRoute).toEqual({pathname: '/projects/proj-1'});
});

test('advanceGuidedFlow on the last mandatory PM document routes to the hub with guided state, so ProjectDetail.js renders GuidedDocumentSelection next', () => {
  const project = {id: 'proj-2', suiteId: 'project-management', guidedFlowState: {...createGuidedFlowState(), completedMandatoryDocs: ['charter', 'stakeholder-register']}};
  const {guidedFlowState, nextDoc, nextRoute} = advanceGuidedFlow(project, 'benefits-management-plan');
  expect(guidedFlowState.mandatoryComplete).toBe(true);
  expect(nextDoc).toBeNull();
  expect(nextRoute).toEqual({pathname: '/projects/proj-2', state: {guided: true}});
});

test('advanceGuidedFlow initializes guidedFlowState when the project has none yet', () => {
  const project = {id: 'proj-3', suiteId: 'operational-excellence'};
  const {guidedFlowState} = advanceGuidedFlow(project, 'charter');
  expect(guidedFlowState.completedMandatoryDocs).toEqual(['charter']);
  expect(guidedFlowState.isGuided).toBe(true);
});

test('guidedContinueLabel names the next document when there is one', () => {
  expect(guidedContinueLabel({nextDoc: {label: 'SIPOC'}, nextRoute: {}})).toBe('Continue to SIPOC →');
});

test('guidedContinueLabel offers document selection when the next stop is guided (PM)', () => {
  expect(guidedContinueLabel({nextDoc: null, nextRoute: {state: {guided: true}}})).toBe('Choose your planning documents →');
});

test('guidedContinueLabel finishes guided setup when there is no next document and no guided state (OE)', () => {
  expect(guidedContinueLabel({nextDoc: null, nextRoute: {}})).toBe('Finish guided setup →');
});

test('PM_REQUIRED_DOCUMENTS has exactly the four spec\'d required documents', () => {
  expect(PM_REQUIRED_DOCUMENTS.map(doc => doc.id)).toEqual(['risk-register', 'issue-log', 'action-item-log', 'decision-log']);
});

test('PM_OPTIONAL_DOCUMENTS has 15 entries, each with a real id and a non-empty description', () => {
  expect(PM_OPTIONAL_DOCUMENTS).toHaveLength(15);
  PM_OPTIONAL_DOCUMENTS.forEach(doc => {
    expect(typeof doc.id).toBe('string');
    expect(doc.id.length).toBeGreaterThan(0);
    expect(typeof doc.description).toBe('string');
    expect(doc.description.length).toBeGreaterThan(0);
  });
});

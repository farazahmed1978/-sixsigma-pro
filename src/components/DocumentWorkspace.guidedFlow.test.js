import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import DocumentWorkspace from './DocumentWorkspace';
import {DEFINE_TEMPLATES} from '../config/defineTemplates';

jest.mock('jspdf', () => jest.fn());
jest.mock('html2canvas', () => jest.fn());
jest.mock('../context/ReportContext', () => ({useReport: () => ({addReportItem: jest.fn(), items: []})}));
jest.mock('../context/WorksheetContext', () => ({useWorksheet: () => ({datasets: []})}));
jest.mock('../context/AnalysisContext', () => ({useAnalysis: () => ({analysisResults: []})}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}|{JSON.stringify(location.state)}</div>;
}

const render = async (template, project, state, onGuidedState) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const updateProject = jest.fn(async () => ({}));
  const entry = state ? {pathname: '/start', state} : '/start';
  await act(async () => root.render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/start" element={<DocumentWorkspace template={template} project={project} updateProject={updateProject} onGuidedState={onGuidedState} />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  ));
  return {host, root, updateProject};
};

const sipocTemplate = DEFINE_TEMPLATES.find(t => t.id === 'sipoc');
const vocTemplate = DEFINE_TEMPLATES.find(t => t.id === 'voc');

const completedSipocProject = () => ({
  id: 'oe-1', name: 'OE Project', suiteId: 'operational-excellence', activityLog: [], sharedFields: {}, artifacts: [], evidenceLibrary: [],
  guidedFlowState: {isGuided: true, mandatoryComplete: false, completedMandatoryDocs: ['charter'], currentMandatoryStep: 1, enteredAt: '2026-08-19T00:00:00.000Z'},
  documents: {
    'document-sipoc': {
      id: 'document-sipoc', templateId: 'sipoc', projectId: 'oe-1',
      values: {
        processName: 'Order Fulfillment', processOwner: 'Jamie', startPoint: 'Order placed', endPoint: 'Order delivered',
        objective: 'Clarify the process boundary.', scope: 'All retail orders.',
        sipocRows: [{id: 'r1', supplier: 'S', input: 'I', process: 'P', output: 'O', customer: 'C'}],
      },
      references: {}, sectionState: {activeSectionId: 'sipoc-map'},
    },
  },
});

const completedVocProject = completedMandatoryDocs => ({
  id: 'oe-1', name: 'OE Project', suiteId: 'operational-excellence', activityLog: [], sharedFields: {}, artifacts: [], evidenceLibrary: [],
  guidedFlowState: {isGuided: true, mandatoryComplete: false, completedMandatoryDocs, currentMandatoryStep: completedMandatoryDocs.length, enteredAt: '2026-08-19T00:00:00.000Z'},
  documents: {
    'document-voc': {
      id: 'document-voc', templateId: 'voc', projectId: 'oe-1',
      values: {researchOwner: 'Jamie', collectionPeriod: 'Q1', customerSegments: 'Enterprise', sources: 'Interviews', vocRows: [{id: 'r1', customer: 'C', requirement: 'R', painPoint: 'P'}]},
      references: {}, sectionState: {activeSectionId: 'customer-voice'},
    },
  },
});

// QA pass (post-5C): GuidedWorkspace.js is now the single source of truth for the explanation
// panel, section-nav/Continue buttons, and the CTA footer (architecture note) — DocumentWorkspace's
// guided branch renders only the current section's fields and reports live state up via the
// onGuidedState callback prop, so these tests assert against that contract instead of markup that
// no longer lives here. SIPOC has two sections (project-information, sipoc-map); the fixture's
// sectionState.activeSectionId of 'sipoc-map' resolves to the second (last) section on mount.
test('a completed mandatory doc mid-sequence (SIPOC), guided, renders only the current section (no chrome, no CTA) and reports live state via onGuidedState', async () => {
  const onGuidedState = jest.fn();
  const {host} = await render(sipocTemplate, completedSipocProject(), {guided: true}, onGuidedState);
  expect(host.querySelector('.dw-executive')).toBeNull();
  expect(host.querySelector('.dw-nav')).toBeNull();
  const section = host.querySelector('.gw-section-only');
  expect(section).toBeTruthy();
  expect(section.textContent).toContain('SIPOC Map');
  expect(host.querySelector('.gw-cta-actions')).toBeNull();
  expect(host.querySelector('.gw-cta-hint')).toBeNull();
  const latest = () => onGuidedState.mock.calls[onGuidedState.mock.calls.length - 1][0];
  expect(latest().sectionIndex).toBe(1);
  expect(latest().totalSections).toBe(2);
  expect(latest().isLastSection).toBe(true);
  expect(latest().allRequiredFieldsFilled).toBe(true);
  await act(async () => { latest().goToPrevious(); });
  expect(host.querySelector('.gw-section-only').textContent).toContain('Project Information');
  expect(latest().sectionIndex).toBe(0);
  expect(latest().isLastSection).toBe(false);
});

test('completing the last section of the last mandatory document (VOC) reports isLastSection and allRequiredFieldsFilled so GuidedWorkspace can decide when to finish the guided flow', async () => {
  const onGuidedState = jest.fn();
  const {host} = await render(vocTemplate, completedVocProject(['charter', 'sipoc']), {guided: true}, onGuidedState);
  const latest = () => onGuidedState.mock.calls[onGuidedState.mock.calls.length - 1][0];
  expect(host.querySelector('.gw-section-only').textContent).toContain('Customer Requirements');
  expect(latest().totalSections).toBe(2);
  expect(latest().isLastSection).toBe(true);
  expect(latest().allRequiredFieldsFilled).toBe(true);
  // goToNext (save() then advance) exposes save/goToNext handles GuidedWorkspace drives directly —
  // confirm they're callable and clamp at the last section rather than breaking (Issue 4 regression).
  await act(async () => { await latest().goToNext(); });
  expect(latest().sectionIndex).toBe(1);
});

test('without guided router state, the standard chrome (WorkspaceShell, score header, sidebar) renders (regression)', async () => {
  const {host, root} = await render(sipocTemplate, completedSipocProject());
  expect(host.querySelector('.gw-section-only')).toBeNull();
  expect(host.querySelector('.dw-executive')).toBeTruthy();
  await act(async () => root.unmount());
});

test('guided but incomplete, onGuidedState reports allRequiredFieldsFilled: false so GuidedWorkspace withholds the Continue button', async () => {
  const onGuidedState = jest.fn();
  const incomplete = {...completedSipocProject(), documents: {'document-sipoc': {id: 'document-sipoc', templateId: 'sipoc', projectId: 'oe-1', values: {}, references: {}}}};
  const {host, root} = await render(sipocTemplate, incomplete, {guided: true}, onGuidedState);
  expect(host.querySelector('.gw-cta-actions')).toBeNull();
  expect(host.querySelector('.gw-cta-hint')).toBeNull();
  const latest = () => onGuidedState.mock.calls[onGuidedState.mock.calls.length - 1][0];
  expect(latest().allRequiredFieldsFilled).toBe(false);
  await act(async () => root.unmount());
});

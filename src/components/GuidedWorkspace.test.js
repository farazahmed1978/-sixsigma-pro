import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import GuidedWorkspace from './GuidedWorkspace';

jest.mock('jspdf', () => jest.fn());
jest.mock('html2canvas', () => jest.fn());
jest.mock('../context/ReportContext', () => ({useReport: () => ({addReportItem: jest.fn(), items: []})}));
jest.mock('../context/WorksheetContext', () => ({useWorksheet: () => ({datasets: []})}));
jest.mock('../context/AnalysisContext', () => ({useAnalysis: () => ({analysisResults: []})}));
const mockUpdateProject = jest.fn(() => Promise.resolve({}));
let mockProject;
jest.mock('../context/ProjectsContext', () => ({useProjects: () => ({getProject: () => mockProject, updateProject: (...args) => mockUpdateProject(...args)})}));

beforeEach(() => { mockUpdateProject.mockReset().mockImplementation(() => Promise.resolve({})); });

const renderRoutes = project => (
  <MemoryRouter initialEntries={[{pathname: `/projects/${project.id}`, state: {guided: true}}]}>
    <Routes>
      <Route path="/projects/:id" element={<GuidedWorkspace project={project} />} />
    </Routes>
  </MemoryRouter>
);

const render = async project => {
  mockProject = project;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(renderRoutes(project)));
  return {host, root};
};

const oeProject = (completedMandatoryDocs = []) => ({
  id: 'oe-1', name: 'OE Project', methodology: 'lean-six-sigma', charter: {}, documents: {}, sharedFields: {}, activityLog: [], artifacts: [], evidenceLibrary: [],
  guidedFlowState: {isGuided: true, mandatoryComplete: false, completedMandatoryDocs, currentMandatoryStep: completedMandatoryDocs.length, enteredAt: '2026-08-19T00:00:00.000Z'},
});

const pmProject = (completedMandatoryDocs = []) => ({
  id: 'pm-1', name: 'PM Project', methodology: 'pmp', charter: {}, documents: {}, sharedFields: {}, activityLog: [], artifacts: [], evidenceLibrary: [],
  guidedFlowState: {isGuided: true, mandatoryComplete: false, completedMandatoryDocs, currentMandatoryStep: completedMandatoryDocs.length, enteredAt: '2026-08-19T00:00:00.000Z'},
});

test('renders the Charter (chrome-stripped) when nothing is complete yet, with exactly one progress tracker', async () => {
  const {host, root} = await render(oeProject([]));
  expect(host.querySelectorAll('.guided-progress-tracker')).toHaveLength(1);
  expect(host.querySelector('.gw-doc').textContent).toContain('Project Charter');
  await act(async () => root.unmount());
  host.remove();
});

test('renders SIPOC (via DocumentWorkspace) once the OE charter is complete', async () => {
  const {host, root} = await render(oeProject(['charter']));
  expect(host.querySelector('.gw-doc').textContent).toContain('SIPOC');
  expect(host.querySelectorAll('.guided-progress-tracker')).toHaveLength(1);
  await act(async () => root.unmount());
  host.remove();
});

test('renders Stakeholder Register once the PM charter is complete', async () => {
  const {host, root} = await render(pmProject(['charter']));
  expect(host.querySelector('.gw-doc').textContent).toContain('Stakeholder Register');
  await act(async () => root.unmount());
  host.remove();
});

const clickButton = async (host, text) => {
  const button = [...host.querySelectorAll('.gw-cta-actions button')].find(b => b.textContent === text);
  await act(async () => { button.click(); await Promise.resolve(); });
};

const fullCharterFixture = {
  projectSummary: 'Summary', targetDate: '2026-01-01', businessCase: 'Case', problemStatement: 'Problem', goalStatement: 'Goal',
  scopeIn: 'In', scopeOut: 'Out', team: [{id: 't1', name: 'A', role: 'Lead'}], stakeholders: [{id: 's1', name: 'B'}],
  timeline: [{id: 'm1', date: '2026-02-01'}], financialImpact: 'Impact', risks: [{id: 'r1', risk: 'Risk', mitigation: 'Mitigate'}],
  assumptions: 'Assume', constraints: 'Constrain', approvals: [{id: 'a1', name: 'C', status: 'Approved'}],
};

// Issue 3 (Continue must only appear on the last section, and only once every required field across
// the whole document is filled) + Issue 4 (navigation broke at section 11 of 12) regression coverage.
// GuidedWorkspace owns all button rendering (architecture note), so this is the right layer to test
// the full 12-section Charter click-through rather than ProjectCharter.js in isolation.
test('Continue never appears before the last Charter section, appears on the last section once every required field is filled, and clicking "Next section" through all 12 sections never breaks (Issue 4 regression)', async () => {
  const project = oeProject([]);
  project.charter = fullCharterFixture;
  const {host, root} = await render(project);
  for (let step = 0; step < 11; step++) {
    expect([...host.querySelectorAll('.gw-cta-actions button')].some(button => button.textContent.includes('Continue to'))).toBe(false);
    expect(host.querySelector('.gw-cta-hint')).toBeNull();
    await clickButton(host, 'Next section →');
  }
  const continueButton = [...host.querySelectorAll('.gw-cta-actions button')].find(button => button.textContent.includes('Continue to'));
  expect(continueButton).toBeTruthy();
  expect(continueButton.disabled).toBeFalsy();
  expect(host.querySelector('.gw-cta-hint')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('on the last Charter section with required fields still missing, a disabled hint shows instead of the Continue button', async () => {
  const {host, root} = await render(oeProject([]));
  for (let step = 0; step < 11; step++) await clickButton(host, 'Next section →');
  expect(host.querySelector('.gw-cta-hint')?.textContent).toBe('Complete required fields to continue');
  expect([...host.querySelectorAll('.gw-cta-actions button')].some(button => button.textContent.includes('Continue to'))).toBe(false);
  await act(async () => root.unmount());
  host.remove();
});

test('clicking the last-section Continue button persists guidedFlowState without navigating (GuidedWorkspace.js owns navigation, not ProjectCharter.js)', async () => {
  const project = oeProject([]);
  project.charter = fullCharterFixture;
  const {host, root} = await render(project);
  for (let step = 0; step < 11; step++) await clickButton(host, 'Next section →');
  const continueButton = [...host.querySelectorAll('.gw-cta-actions button')].find(button => button.textContent.includes('Continue to'));
  await act(async () => { continueButton.click(); await Promise.resolve(); });
  const guidedFlowCall = mockUpdateProject.mock.calls.find(call => call[1] && call[1].guidedFlowState);
  expect(guidedFlowCall).toBeTruthy();
  expect(guidedFlowCall[1].guidedFlowState.completedMandatoryDocs).toEqual(['charter']);
  await act(async () => root.unmount());
  host.remove();
});

test('document transition: switching the current document cycles gw-content through exiting -> entering -> idle', async () => {
  jest.useFakeTimers();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  mockProject = oeProject([]);
  await act(async () => root.render(renderRoutes(mockProject)));
  expect(host.querySelector('.gw-content').dataset.phase).toBe('idle');

  // Simulate charter completion advancing guidedFlowState — GuidedWorkspace re-renders with a
  // project whose currentDoc has moved on, which is what should trigger the transition.
  const advanced = oeProject(['charter']);
  mockProject = advanced;
  await act(async () => { root.render(renderRoutes(advanced)); });
  expect(host.querySelector('.gw-content').dataset.phase).toBe('exiting');
  expect(host.querySelector('.gw-doc').textContent).toContain('Project Charter'); // still showing the old doc during exit

  await act(async () => { jest.advanceTimersByTime(250); });
  expect(host.querySelector('.gw-content').dataset.phase).toBe('entering');
  expect(host.querySelector('.gw-doc').textContent).toContain('SIPOC'); // now showing the new doc

  await act(async () => { jest.advanceTimersByTime(300); });
  expect(host.querySelector('.gw-content').dataset.phase).toBe('idle');

  await act(async () => root.unmount());
  host.remove();
  jest.useRealTimers();
});

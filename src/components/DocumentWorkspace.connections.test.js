import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import DocumentWorkspace from './DocumentWorkspace';
import {PMP_TEMPLATES} from '../config/pmpTemplates';

jest.mock('jspdf', () => jest.fn().mockImplementation(() => ({addImage: jest.fn(), addPage: jest.fn(), save: jest.fn()})));
jest.mock('html2canvas', () => jest.fn().mockResolvedValue({height: 100, width: 100, toDataURL: () => 'data:image/jpeg;base64,'}));
jest.mock('../context/ReportContext', () => ({useReport: () => ({addReportItem: jest.fn(), items: []})}));
jest.mock('../context/WorksheetContext', () => ({useWorksheet: () => ({datasets: []})}));
jest.mock('../context/AnalysisContext', () => ({useAnalysis: () => ({analysisResults: []})}));

const render = async (template, project) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const updateProject = jest.fn(async () => ({}));
  await act(async () => root.render(<MemoryRouter><DocumentWorkspace template={template} project={project} updateProject={updateProject} /></MemoryRouter>));
  return {host, root, updateProject};
};

const pmProject = documents => ({id: 'pm-1', name: 'PM Project', suiteId: 'project-management', methodology: 'pmp', documents, activityLog: [], sharedFields: {}, artifacts: [], evidenceLibrary: []});

test('opening Risk Report with a populated Risk Register auto-fills topRiskRows and shows a pre-populated banner', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'risk-report');
  const project = pmProject({
    'document-risk-register': {updatedAt: '2026-01-01T00:00:00.000Z', values: {riskRows: [{id: 'r1', riskId: 'R1', risk: 'Vendor delay', probability: 3, impact: 4, exposure: 12, owner: 'Procurement', response: '', status: 'Open'}]}},
  });
  const {host, root} = await render(template, project);
  // 'top-risks' is the second section (index 1) — navigate there, since Field only renders fields
  // for the currently active section.
  await act(async () => { host.querySelectorAll('.dw-nav button')[1].click(); });
  const banner = host.querySelector('.dw-connection-banner');
  expect(banner).toBeTruthy();
  expect(banner.textContent).toContain('Risk Register');
  const riskIdCell = [...host.querySelectorAll('input[data-dw-cell]')].find(input => input.value === 'R1');
  expect(riskIdCell).toBeTruthy();
  await act(async () => root.unmount());
  host.remove();
});

test('opening EVM Dashboard with a populated Cost Baseline auto-fills BAC and shows a "From" badge that disappears on edit', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'evm-dashboard');
  const project = pmProject({
    'document-cost-baseline': {updatedAt: '2026-01-01T00:00:00.000Z', values: {costByPhaseRows: [{id: 'c1', plannedCost: 1000, contingency: 200, total: 1200}, {id: 'c2', plannedCost: 800, contingency: 0, total: 800}]}},
  });
  const {host, root} = await render(template, project);
  const bacInput = host.querySelector('input[value="2000"]');
  expect(bacInput).toBeTruthy();
  const badge = host.querySelector('.dw-connection-badge');
  expect(badge).toBeTruthy();
  expect(badge.textContent).toContain('Cost Baseline');

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    setter.call(bacInput, '9999');
    bacInput.dispatchEvent(new Event('input', {bubbles: true}));
  });
  expect(host.querySelector('.dw-connection-badge')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('never overwrites a value the user already entered on the target document', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'evm-dashboard');
  const project = pmProject({
    'document-cost-baseline': {updatedAt: '2026-01-01T00:00:00.000Z', values: {costByPhaseRows: [{id: 'c1', plannedCost: 1000, contingency: 200, total: 1200}]}},
    'document-evm-dashboard': {updatedAt: '2026-01-01T00:00:00.000Z', values: {bac: '5000'}},
  });
  const {host, root} = await render(template, project);
  expect(host.querySelector('input[value="5000"]')).toBeTruthy();
  expect(host.querySelector('.dw-connection-badge')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('shows a non-blocking stale-source notice with a Re-sync action when the source document changed after population', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'evm-dashboard');
  const project = pmProject({
    'document-cost-baseline': {updatedAt: '2026-03-01T00:00:00.000Z', values: {costByPhaseRows: [{id: 'c1', plannedCost: 3000, contingency: 0, total: 3000}]}},
    'document-evm-dashboard': {
      updatedAt: '2026-01-01T00:00:00.000Z',
      values: {bac: 2000},
      connectionProvenance: {bac: {kind: 'aggregate', connectionId: 'cost-baseline.costByPhaseRows.total->evm-dashboard.bac', sourceDocId: 'cost-baseline', sourceDocName: 'Cost Baseline', targetField: 'bac', sourceUpdatedAt: '2026-01-01T00:00:00.000Z', populatedValue: 2000}},
    },
  });
  const {host, root} = await render(template, project);
  const notice = host.querySelector('.dw-connection-stale-notice');
  expect(notice).toBeTruthy();
  expect(notice.textContent).toContain('Cost Baseline');
  await act(async () => {
    notice.querySelector('button').click();
  });
  expect(host.querySelector('input[value="3000"]')).toBeTruthy();
  expect(host.querySelector('.dw-connection-stale-notice')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('a Change Request approved with recommendation "Approve" appears as a row in Change Log', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'change-log');
  const project = pmProject({
    'document-change-request': {updatedAt: '2026-01-01T00:00:00.000Z', values: {changeRequestId: 'CR-014', changeTitle: 'Add approval tier', requestor: 'Finance', dateSubmitted: '2026-05-01', recommendation: 'Approve'}},
  });
  const {host, root} = await render(template, project);
  // 'register' (the changeRegisterRows table) is the second section (index 1).
  await act(async () => { host.querySelectorAll('.dw-nav button')[1].click(); });
  const changeIdCell = [...host.querySelectorAll('input[data-dw-cell]')].find(input => input.value === 'CR-014');
  expect(changeIdCell).toBeTruthy();
  const statusRow = [...host.querySelectorAll('select[data-dw-cell]')].find(select => select.value === 'Approved');
  expect(statusRow).toBeTruthy();
  await act(async () => root.unmount());
  host.remove();
});

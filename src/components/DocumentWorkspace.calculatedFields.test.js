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

test('a calculated table column (Risk Register exposure) renders as read-only text, not an editable input', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'risk-register');
  const project = pmProject({
    'document-risk-register': {
      values: {riskRows: [{id: 'row-1', riskId: 'R1', risk: 'Vendor delay', probability: 3, impact: 4, exposure: 12, owner: 'Procurement', response: '', status: 'Open'}]},
    },
  });
  const {host, root} = await render(template, project);
  const calculatedCell = host.querySelector('.dw-cell-calculated');
  expect(calculatedCell).toBeTruthy();
  expect(calculatedCell.textContent).toBe('12');
  // No input/select rendered for the calculated column specifically — the row still has ordinary
  // editable cells (riskId, risk, probability, impact, owner, response, status), so the assertion
  // is that the calculated cell itself contains no form control, not that the row has zero inputs.
  expect(calculatedCell.querySelector('input,select')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('editing probability/impact does not let a stray value stick in the calculated exposure cell', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'risk-register');
  const project = pmProject({
    'document-risk-register': {
      values: {riskRows: [{id: 'row-1', riskId: 'R1', risk: 'Vendor delay', probability: 3, impact: 4, exposure: 12, owner: '', response: '', status: 'Open'}]},
    },
  });
  const {host, root} = await render(template, project);
  const probabilityInput = host.querySelector('input[data-dw-cell="0:2"]');
  expect(probabilityInput).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    setter.call(probabilityInput, '5');
    probabilityInput.dispatchEvent(new Event('input', {bubbles: true}));
  });
  expect(host.querySelector('.dw-cell-calculated').textContent).toBe('20');
  await act(async () => root.unmount());
  host.remove();
});

test('a calculated top-level field (EVM Dashboard CPI) renders as read-only text, not an editable input', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'evm-dashboard');
  const project = pmProject({
    'document-evm-dashboard': {
      values: {pv: '100', ev: '90', ac: '80', bac: '500', CPI: '1.13', SPI: '0.90', CV: '10.00', SV: '-10.00', EAC: '444.44', ETC: '364.44', VAC: '55.56'},
      // Start on the 'forecast' section (index 1), where the calculated CPI/SPI/... fields live —
      // 'evm-inputs' (index 0, pv/ev/ac/bac) is the resume default and doesn't render them.
      sectionState: {activeSectionId: 'forecast'},
    },
  });
  const {host, root} = await render(template, project);
  const readonlyFields = [...host.querySelectorAll('.dw-field-readonly')];
  expect(readonlyFields.length).toBeGreaterThanOrEqual(7);
  const cpiField = readonlyFields.find(node => node.textContent === '1.13');
  expect(cpiField).toBeTruthy();
  // pv/ev/ac/bac remain plain editable inputs in the same document.
  expect(host.querySelectorAll('.dw-executive, .dw-section-grid input[type="text"]').length).toBeGreaterThan(0);
  await act(async () => root.unmount());
  host.remove();
});

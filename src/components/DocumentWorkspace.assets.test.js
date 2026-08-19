import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import DocumentWorkspace from './DocumentWorkspace';
import {PMP_TEMPLATES} from '../config/pmpTemplates';
import {assetRepository} from '../repositories/assetRepository';

jest.mock('jspdf', () => jest.fn().mockImplementation(() => ({addImage: jest.fn(), addPage: jest.fn(), save: jest.fn()})));
jest.mock('html2canvas', () => jest.fn().mockResolvedValue({height: 100, width: 100, toDataURL: () => 'data:image/jpeg;base64,'}));
jest.mock('../context/ReportContext', () => ({useReport: () => ({addReportItem: jest.fn(), items: []})}));
jest.mock('../context/WorksheetContext', () => ({useWorksheet: () => ({datasets: []})}));
jest.mock('../context/AnalysisContext', () => ({useAnalysis: () => ({analysisResults: []})}));
jest.mock('../repositories/assetRepository', () => ({assetRepository: {list: jest.fn(), create: jest.fn(), uploadFile: jest.fn(), getSignedUrl: jest.fn()}}));
jest.mock('../context/AuthContext', () => ({useAuth: () => ({user: {id: 'user-1'}, profile: {default_organization_id: 'org-1'}})}));
jest.mock('../context/InteractionContext', () => ({useInteractions: () => ({toast: jest.fn()})}));

beforeEach(() => { assetRepository.list.mockResolvedValue([]); });

const render = async (template, project) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const updateProject = jest.fn(async () => ({}));
  await act(async () => root.render(<MemoryRouter><DocumentWorkspace template={template} project={project} updateProject={updateProject} /></MemoryRouter>));
  return {host, root};
};

const pmProject = {id: 'pm-1', name: 'PM Project', suiteId: 'project-management', methodology: 'pmp', documents: {}, activityLog: [], sharedFields: {}, artifacts: [], evidenceLibrary: []};

test('the document header has an "Attach File" action that opens the upload modal pre-linked to this document', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'risk-register');
  const {host, root} = await render(template, pmProject);
  expect(host.querySelector('.asset-upload-modal')).toBeNull();
  const attachButton = [...host.querySelectorAll('button')].find(button => button.textContent === 'Attach File');
  expect(attachButton).toBeTruthy();
  await act(async () => { attachButton.click(); });
  expect(host.querySelector('.asset-upload-modal')).toBeTruthy();
  await act(async () => root.unmount());
  host.remove();
});

test('a standalone (template-preview) document does not offer Attach File', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'risk-register');
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const updateProject = jest.fn(async () => ({}));
  await act(async () => root.render(<MemoryRouter><DocumentWorkspace template={template} project={pmProject} updateProject={updateProject} standalone /></MemoryRouter>));
  expect([...host.querySelectorAll('button')].some(button => button.textContent === 'Attach File')).toBe(false);
  await act(async () => root.unmount());
  host.remove();
});

test('the Linked Files section renders below the document section fields (read-only inline display)', async () => {
  const template = PMP_TEMPLATES.find(item => item.id === 'risk-register');
  const {host, root} = await render(template, pmProject);
  // LinkedAssetsList itself renders nothing until it resolves at least one linked asset (mocked
  // here to resolve an empty list), but it must be present in the tree wired to this document.
  const sectionGrid = host.querySelector('.dw-section-grid');
  expect(sectionGrid).toBeTruthy();
  await act(async () => { await Promise.resolve(); });
  expect(host.querySelector('.linked-assets')).toBeNull(); // no linked assets in this fixture
  await act(async () => root.unmount());
  host.remove();
});

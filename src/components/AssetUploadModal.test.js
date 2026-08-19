import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import AssetUploadModal from './AssetUploadModal';

jest.mock('../context/AuthContext', () => ({useAuth: () => ({user: {id: 'user-1'}, profile: {default_organization_id: 'org-1'}})}));
jest.mock('../context/InteractionContext', () => ({useInteractions: () => ({toast: jest.fn()})}));
jest.mock('../repositories/assetRepository', () => ({assetRepository: {uploadFile: jest.fn(), create: jest.fn()}}));

import {assetRepository} from '../repositories/assetRepository';

const project = {id: 'p1', suiteId: 'project-management', name: 'PM Project'};

const render = async props => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const onClose = jest.fn();
  const onUploaded = jest.fn();
  await act(async () => root.render(<AssetUploadModal project={project} onClose={onClose} onUploaded={onUploaded} {...props} />));
  return {host, root, onClose, onUploaded};
};

const makeFile = (name, size, type) => {
  const file = new File(['x'.repeat(Math.min(size, 10))], name, {type});
  Object.defineProperty(file, 'size', {value: size});
  return file;
};

// Plain `input.value = x` does not reliably notify React's controlled-input tracking; the native
// property setter must be invoked directly (bypassing React's own override) for the subsequent
// 'input'/'change' event to be recognized as a real value change.
const setInputValue = (input, value) => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles: true}));
  input.dispatchEvent(new Event('change', {bubbles: true}));
};

const selectFile = async (host, file) => {
  const input = host.querySelector('input[type="file"]');
  const dataTransfer = {files: [file]};
  Object.defineProperty(input, 'files', {value: [file], configurable: true});
  await act(async () => { input.dispatchEvent(new Event('change', {bubbles: true})); });
  return dataTransfer;
};

test('step 1 requires a file or URL before advancing', async () => {
  const {host, root} = await render();
  const next = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next'));
  expect(next.disabled).toBe(true);
  await act(async () => root.unmount());
  host.remove();
});

test('selecting a file auto-detects type and pre-fills the name, then advances to categorization', async () => {
  const {host, root} = await render();
  const pdf = makeFile('Vendor Contract.pdf', 2048, 'application/pdf');
  await selectFile(host, pdf);
  expect(host.textContent).toContain('Vendor Contract.pdf');
  const next = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next'));
  await act(async () => { next.click(); });
  expect(host.querySelector('h2').textContent).toContain('Step 2 of 3');
  const nameInput = [...host.querySelectorAll('input')].find(input => input.closest('label')?.textContent.startsWith('Asset name'));
  expect(nameInput.value).toBe('Vendor Contract');
  const typeSelect = host.querySelector('select');
  expect(typeSelect.value).toBe('document');
  await act(async () => root.unmount());
  host.remove();
});

test('a file over 25MB is rejected with an error and does not advance', async () => {
  const {host, root} = await render();
  const huge = makeFile('huge.mp4', 26 * 1024 * 1024, 'video/mp4');
  await selectFile(host, huge);
  expect(host.textContent).toContain('larger than the 25MB limit');
  const next = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next'));
  expect(next.disabled).toBe(true);
  await act(async () => root.unmount());
  host.remove();
});

test('URL mode skips file selection and defaults the type to url', async () => {
  const {host, root} = await render();
  const urlToggle = [...host.querySelectorAll('button')].find(button => button.textContent === 'Link a URL');
  await act(async () => { urlToggle.click(); });
  const urlInput = host.querySelector('input[type="url"]');
  await act(async () => { setInputValue(urlInput, 'https://example.com/spec.html'); });
  const next = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next'));
  expect(next.disabled).toBe(false);
  await act(async () => { next.click(); });
  const typeSelect = host.querySelector('select');
  expect(typeSelect.value).toBe('url');
  await act(async () => root.unmount());
  host.remove();
});

test('pre-fills stage and a default link from props (context passed in, not read elsewhere)', async () => {
  const {host, root} = await render({defaultStage: 'Planning', defaultLink: {artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay risk'}});
  const pdf = makeFile('Notes.pdf', 500, 'application/pdf');
  await selectFile(host, pdf);
  const next1 = [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next'));
  await act(async () => { next1.click(); });
  const stageSelect = [...host.querySelectorAll('select')][1];
  expect(stageSelect.value).toBe('Planning');
  expect(host.textContent).toContain('Vendor delay risk');
  await act(async () => root.unmount());
  host.remove();
});

test('step 2 requires a name before advancing to confirmation', async () => {
  const {host, root} = await render();
  const urlToggle = [...host.querySelectorAll('button')].find(button => button.textContent === 'Link a URL');
  await act(async () => { urlToggle.click(); });
  const urlInput = host.querySelector('input[type="url"]');
  await act(async () => { setInputValue(urlInput, 'https://example.com'); });
  await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next')).click(); });
  const nameInput = [...host.querySelectorAll('input')].find(input => input.closest('label')?.textContent.startsWith('Asset name'));
  await act(async () => { setInputValue(nameInput, ''); });
  await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next')).click(); });
  expect(host.querySelector('h2').textContent).toContain('Step 2 of 3');
  expect(host.textContent).toContain('Give this asset a name');
  await act(async () => root.unmount());
  host.remove();
});

test('confirming a file upload calls uploadFile then create with the assembled payload, and reports success', async () => {
  assetRepository.uploadFile.mockResolvedValue({url: 'https://signed.example/x', storagePath: 'p1/x.pdf'});
  assetRepository.create.mockResolvedValue({id: 'asset-1'});
  const {host, root, onClose, onUploaded} = await render({defaultLink: {artifactType: 'document', artifactId: 'doc-1', artifactLabel: 'Risk Register'}});
  const pdf = makeFile('Vendor Contract.pdf', 2048, 'application/pdf');
  await selectFile(host, pdf);
  await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next')).click(); });
  const tagsInput = [...host.querySelectorAll('input')].find(input => input.closest('label')?.textContent.startsWith('Tags'));
  await act(async () => { setInputValue(tagsInput, 'contract, vendor'); });
  await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next')).click(); });
  expect(host.querySelector('h2').textContent).toContain('Step 3 of 3');
  const uploadButton = [...host.querySelectorAll('button')].find(button => button.textContent === 'Upload');
  await act(async () => { await uploadButton.click(); });
  expect(assetRepository.uploadFile).toHaveBeenCalledWith('p1', pdf);
  expect(assetRepository.create).toHaveBeenCalledWith('p1', expect.objectContaining({
    name: 'Vendor Contract', type: 'document', tags: ['contract', 'vendor'], url: 'https://signed.example/x', storagePath: 'p1/x.pdf',
    links: [expect.objectContaining({artifactType: 'document', artifactId: 'doc-1', artifactLabel: 'Risk Register'})],
  }));
  expect(onUploaded).toHaveBeenCalledWith({id: 'asset-1'});
  expect(onClose).toHaveBeenCalled();
  await act(async () => root.unmount());
  host.remove();
});

test('a failed upload shows the error and does not close the modal', async () => {
  assetRepository.uploadFile.mockRejectedValue(new Error('asset-too-large: files must be 25MB or smaller'));
  const {host, root, onClose} = await render();
  const pdf = makeFile('Vendor Contract.pdf', 2048, 'application/pdf');
  await selectFile(host, pdf);
  await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next')).click(); });
  await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next')).click(); });
  const uploadButton = [...host.querySelectorAll('button')].find(button => button.textContent === 'Upload');
  await act(async () => { await uploadButton.click(); });
  expect(host.textContent).toContain('asset-too-large');
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  host.remove();
});

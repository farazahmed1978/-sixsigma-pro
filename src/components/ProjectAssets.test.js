import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import ProjectAssets from './ProjectAssets';

jest.mock('../context/InteractionContext', () => ({useInteractions: () => ({confirm: jest.fn().mockResolvedValue(true), toast: jest.fn()})}));
jest.mock('../repositories/assetRepository', () => ({assetRepository: {list: jest.fn(), update: jest.fn(), remove: jest.fn(), removeLink: jest.fn(), deleteFile: jest.fn(), getSignedUrl: jest.fn()}}));

import {assetRepository} from '../repositories/assetRepository';

const project = {id: 'p1', suiteId: 'project-management', name: 'PM Project'};

const asset = overrides => ({
  id: 'asset-1', projectId: 'p1', suiteId: 'project-management', name: 'Vendor Contract.pdf', description: '',
  type: 'document', mimeType: 'application/pdf', size: 2 * 1024 * 1024, url: 'https://example/asset-1', tags: ['contract'],
  stage: 'Planning', uploadedBy: 'user-1', uploadedAt: '2026-08-01T00:00:00.000Z', links: [], metadata: {},
  ...overrides,
});

const setInputValue = (input, value) => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles: true}));
};

const render = async (assets = [], linkableArtifacts = []) => {
  assetRepository.list.mockResolvedValue(assets);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<ProjectAssets project={project} linkableArtifacts={linkableArtifacts} />));
  return {host, root};
};

test('empty state shows the exact copy and an upload call to action when there are no assets', async () => {
  const {host, root} = await render([]);
  expect(host.textContent).toContain('No files or assets yet');
  expect(host.textContent).toContain('Attach supporting documents, images, and references to keep everything in one place.');
  expect(host.querySelector('.project-assets-empty')).toBeTruthy();
  await act(async () => root.unmount());
  host.remove();
});

test('shows asset count and total storage used, formatted', async () => {
  const {host, root} = await render([asset({id: 'a1', size: 1024 * 1024}), asset({id: 'a2', size: 1024 * 1024})]);
  expect(host.textContent).toContain('2 assets');
  expect(host.textContent).toContain('2 MB used');
  await act(async () => root.unmount());
  host.remove();
});

test('type filter narrows the grid to matching assets only', async () => {
  const {host, root} = await render([asset({id: 'a1', name: 'Doc.pdf', type: 'document'}), asset({id: 'a2', name: 'Photo.png', type: 'image'})]);
  expect(host.querySelectorAll('.project-asset-card')).toHaveLength(2);
  const typeSelect = host.querySelector('select[aria-label="Filter by type"]');
  await act(async () => {
    typeSelect.value = 'image';
    typeSelect.dispatchEvent(new Event('change', {bubbles: true}));
  });
  const cards = [...host.querySelectorAll('.project-asset-card')];
  expect(cards).toHaveLength(1);
  expect(cards[0].textContent).toContain('Photo.png');
  await act(async () => root.unmount());
  host.remove();
});

test('stage filter narrows the grid to matching assets only', async () => {
  const {host, root} = await render([asset({id: 'a1', name: 'PlanningDoc.pdf', stage: 'Planning'}), asset({id: 'a2', name: 'ExecDoc.pdf', stage: 'Execution'})]);
  const stageSelect = host.querySelector('select[aria-label="Filter by stage"]');
  await act(async () => {
    stageSelect.value = 'Execution';
    stageSelect.dispatchEvent(new Event('change', {bubbles: true}));
  });
  const cards = [...host.querySelectorAll('.project-asset-card')];
  expect(cards).toHaveLength(1);
  expect(cards[0].textContent).toContain('ExecDoc.pdf');
  await act(async () => root.unmount());
  host.remove();
});

test('linked artifact filter offers only artifacts that actually have linked assets, and narrows correctly', async () => {
  const {host, root} = await render([
    asset({id: 'a1', name: 'Linked.pdf', links: [{id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'}]}),
    asset({id: 'a2', name: 'Unlinked.pdf', links: []}),
  ]);
  const artifactSelect = host.querySelector('select[aria-label="Filter by linked artifact"]');
  expect(artifactSelect.textContent).toContain('Vendor delay');
  await act(async () => {
    artifactSelect.value = 'risk:risk-1';
    artifactSelect.dispatchEvent(new Event('change', {bubbles: true}));
  });
  const cards = [...host.querySelectorAll('.project-asset-card')];
  expect(cards).toHaveLength(1);
  expect(cards[0].textContent).toContain('Linked.pdf');
  await act(async () => root.unmount());
  host.remove();
});

test('search matches by name or tag', async () => {
  const {host, root} = await render([asset({id: 'a1', name: 'Vendor Contract.pdf', tags: ['contract']}), asset({id: 'a2', name: 'Other.pdf', tags: ['reference']})]);
  const search = host.querySelector('input[aria-label="Search assets"]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(search, 'contract');
    search.dispatchEvent(new Event('input', {bubbles: true}));
  });
  const cards = [...host.querySelectorAll('.project-asset-card')];
  expect(cards).toHaveLength(1);
  expect(cards[0].textContent).toContain('Vendor Contract.pdf');
  await act(async () => root.unmount());
  host.remove();
});

test('a "no matches" message shows when filters exclude every asset, distinct from the true empty state', async () => {
  const {host, root} = await render([asset({id: 'a1', type: 'document'})]);
  const typeSelect = host.querySelector('select[aria-label="Filter by type"]');
  await act(async () => {
    typeSelect.value = 'video';
    typeSelect.dispatchEvent(new Event('change', {bubbles: true}));
  });
  expect(host.textContent).toContain('No assets match your filters');
  expect(host.querySelector('.project-assets-empty')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('grid/list toggle switches rendering mode', async () => {
  const {host, root} = await render([asset({id: 'a1'})]);
  expect(host.querySelector('.project-assets-grid')).toBeTruthy();
  const listButton = host.querySelector('button[aria-label="List view"]');
  await act(async () => { listButton.click(); });
  expect(host.querySelector('.project-assets-table')).toBeTruthy();
  expect(host.querySelector('.project-assets-grid')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('clicking an asset opens the detail panel pre-filled with its metadata', async () => {
  const {host, root} = await render([asset({id: 'a1', name: 'Vendor Contract.pdf', description: 'Signed MSA', tags: ['contract', 'vendor']})]);
  const card = host.querySelector('.project-asset-card');
  await act(async () => { card.click(); });
  const panel = host.querySelector('.asset-detail-panel');
  expect(panel).toBeTruthy();
  const nameInput = panel.querySelector('input');
  expect(nameInput.value).toBe('Vendor Contract.pdf');
  await act(async () => root.unmount());
  host.remove();
});

test('adding a linked artifact in the detail panel and clicking Save Changes persists the full links array and updates the card link count', async () => {
  const existingLink = {id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'};
  const newLink = {artifactType: 'document', artifactId: 'doc-1', artifactLabel: 'Risk Register'};
  assetRepository.update.mockResolvedValue(asset({id: 'a1', links: [existingLink, {...newLink, id: 'l2', linkedAt: '2026-08-19T00:00:00.000Z'}]}));
  const {host, root} = await render([asset({id: 'a1', links: [existingLink]})], [newLink]);
  await act(async () => { host.querySelector('.project-asset-card').click(); });
  const panel = host.querySelector('.asset-detail-panel');
  const addButton = [...panel.querySelectorAll('.asset-detail-link-results button')].find(button => button.textContent.includes('Risk Register'));
  await act(async () => { addButton.click(); });
  expect(panel.textContent).toContain('Risk Register');
  const saveButton = [...panel.querySelectorAll('footer button')].find(button => button.textContent.startsWith('Save'));
  await act(async () => { await saveButton.click(); });
  expect(assetRepository.update).toHaveBeenCalledWith('a1', expect.objectContaining({
    links: [existingLink, expect.objectContaining(newLink)],
  }));
  expect(assetRepository.removeLink).not.toHaveBeenCalled();
  const card = host.querySelector('.project-asset-card');
  expect(card.textContent).toContain('2 links');
  await act(async () => root.unmount());
  host.remove();
});

test('removing a linked artifact in the detail panel only persists after Save Changes is clicked', async () => {
  const existingLink = {id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'};
  assetRepository.update.mockResolvedValue(asset({id: 'a1', links: []}));
  const {host, root} = await render([asset({id: 'a1', links: [existingLink]})]);
  await act(async () => { host.querySelector('.project-asset-card').click(); });
  const panel = host.querySelector('.asset-detail-panel');
  const unlinkButton = panel.querySelector('button[aria-label="Unlink Vendor delay"]');
  await act(async () => { unlinkButton.click(); });
  expect(assetRepository.update).not.toHaveBeenCalled();
  const saveButton = [...panel.querySelectorAll('footer button')].find(button => button.textContent.startsWith('Save'));
  await act(async () => { await saveButton.click(); });
  expect(assetRepository.update).toHaveBeenCalledWith('a1', expect.objectContaining({links: []}));
  await act(async () => root.unmount());
  host.remove();
});

test('the Tags field is a controlled dropdown of suite suggestions plus removable chips, not free text', async () => {
  const {host, root} = await render([asset({id: 'a1', tags: ['contract']})]);
  await act(async () => { host.querySelector('.project-asset-card').click(); });
  const panel = host.querySelector('.asset-detail-panel');
  expect(panel.querySelector('.tag-select-chips').textContent).toContain('contract');
  const predefinedSelect = panel.querySelector('select[aria-label="Add predefined tag"]');
  const options = [...predefinedSelect.querySelectorAll('option')].map(option => option.value).filter(Boolean);
  expect(options).toEqual(expect.arrayContaining(['vendor', 'meeting minutes', 'sign-off']));
  expect(options).not.toContain('contract');
  await act(async () => root.unmount());
  host.remove();
});

test('adding a custom tag and saving persists it alongside the predefined ones', async () => {
  assetRepository.update.mockResolvedValue(asset({id: 'a1', tags: ['contract', 'urgent']}));
  const {host, root} = await render([asset({id: 'a1', tags: ['contract']})]);
  await act(async () => { host.querySelector('.project-asset-card').click(); });
  const panel = host.querySelector('.asset-detail-panel');
  const customTagInput = panel.querySelector('input[aria-label="Add custom tag"]');
  await act(async () => { setInputValue(customTagInput, 'urgent'); });
  await act(async () => { customTagInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); });
  const saveButton = [...panel.querySelectorAll('footer button')].find(button => button.textContent.startsWith('Save'));
  await act(async () => { await saveButton.click(); });
  expect(assetRepository.update).toHaveBeenCalledWith('a1', expect.objectContaining({tags: ['contract', 'urgent']}));
  await act(async () => root.unmount());
  host.remove();
});

test('deleting an asset removes it from the grid after confirmation', async () => {
  assetRepository.remove.mockResolvedValue(undefined);
  const {host, root} = await render([asset({id: 'a1', name: 'Vendor Contract.pdf'})]);
  await act(async () => { host.querySelector('.project-asset-card').click(); });
  const deleteButton = [...host.querySelectorAll('.asset-detail-panel button')].find(button => button.textContent === 'Delete');
  await act(async () => { await deleteButton.click(); });
  expect(assetRepository.remove).toHaveBeenCalledWith('a1');
  expect(host.querySelectorAll('.project-asset-card')).toHaveLength(0);
  await act(async () => root.unmount());
  host.remove();
});

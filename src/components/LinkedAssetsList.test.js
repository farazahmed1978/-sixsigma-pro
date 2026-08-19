import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import LinkedAssetsList from './LinkedAssetsList';

jest.mock('../repositories/assetRepository', () => ({assetRepository: {list: jest.fn(), getSignedUrl: jest.fn()}}));
import {assetRepository} from '../repositories/assetRepository';

const project = {id: 'p1'};

const asset = overrides => ({
  id: 'asset-1', projectId: 'p1', name: 'Vendor Contract.pdf', type: 'document', mimeType: 'application/pdf',
  size: 1024, url: 'https://example/asset-1', storagePath: null, tags: [], stage: 'Planning', links: [],
  ...overrides,
});

const render = async props => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<LinkedAssetsList project={project} artifactType="risk" artifactId="risk-1" {...props} />));
  return {host, root};
};

test('renders nothing while loading and nothing when no assets are linked to this artifact', async () => {
  assetRepository.list.mockResolvedValue([asset({links: [{id: 'l1', artifactType: 'action', artifactId: 'action-1', artifactLabel: 'Other'}]})]);
  const {host, root} = await render();
  expect(host.querySelector('.linked-assets')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('shows only assets linked to the given artifactType/artifactId, not other links on the same asset list', async () => {
  assetRepository.list.mockResolvedValue([
    asset({id: 'a1', name: 'Vendor Contract.pdf', links: [{id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'}]}),
    asset({id: 'a2', name: 'Unrelated.pdf', links: [{id: 'l2', artifactType: 'action', artifactId: 'action-1', artifactLabel: 'Other'}]}),
  ]);
  const {host, root} = await render();
  expect(host.querySelector('.linked-assets')).toBeTruthy();
  expect(host.textContent).toContain('Vendor Contract.pdf');
  expect(host.textContent).not.toContain('Unrelated.pdf');
  await act(async () => root.unmount());
  host.remove();
});

test('is read-only — no edit/remove-link controls, only an open/download action', async () => {
  assetRepository.list.mockResolvedValue([asset({links: [{id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'}]})]);
  const {host, root} = await render();
  const buttons = [...host.querySelectorAll('.linked-assets button')];
  expect(buttons).toHaveLength(1);
  expect(buttons[0].textContent).toBe('Download');
  await act(async () => root.unmount());
  host.remove();
});

test('clicking Download resolves a signed url for a stored file and opens it', async () => {
  assetRepository.list.mockResolvedValue([asset({storagePath: 'p1/x.pdf', links: [{id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'}]})]);
  assetRepository.getSignedUrl.mockResolvedValue('https://signed.example/x.pdf');
  const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
  const {host, root} = await render();
  const button = host.querySelector('.linked-assets button');
  await act(async () => { await button.click(); });
  expect(assetRepository.getSignedUrl).toHaveBeenCalledWith('p1/x.pdf');
  expect(openSpy).toHaveBeenCalledWith('https://signed.example/x.pdf', '_blank', 'noopener,noreferrer');
  openSpy.mockRestore();
  await act(async () => root.unmount());
  host.remove();
});

test('a URL-type asset opens directly (no signed url lookup) and its button reads "Open"', async () => {
  assetRepository.list.mockResolvedValue([asset({id: 'a1', type: 'url', url: 'https://example.com/spec.html', storagePath: null, links: [{id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'}]})]);
  const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
  const {host, root} = await render();
  const button = host.querySelector('.linked-assets button');
  expect(button.textContent).toBe('Open');
  await act(async () => { await button.click(); });
  expect(assetRepository.getSignedUrl).not.toHaveBeenCalled();
  expect(openSpy).toHaveBeenCalledWith('https://example.com/spec.html', '_blank', 'noopener,noreferrer');
  openSpy.mockRestore();
  await act(async () => root.unmount());
  host.remove();
});

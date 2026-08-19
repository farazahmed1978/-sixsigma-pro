jest.mock('./cloudRepository', () => ({cloudRepository: {list: jest.fn(), get: jest.fn(), remove: jest.fn()}}));
jest.mock('../lib/supabase', () => ({supabase: {auth: {getUser: jest.fn()}, from: jest.fn(), storage: {from: jest.fn()}}}));

import {cloudRepository} from './cloudRepository';
import {supabase} from '../lib/supabase';
import {assetRepository} from './assetRepository';
import {MAX_ASSET_FILE_SIZE_BYTES} from '../config/assetConfig';

const mockAuthGetUser = supabase.auth.getUser;
const mockFrom = supabase.from;
const mockStorageFrom = supabase.storage.from;

const scope = {organization_id: '11111111-1111-1111-1111-111111111111', project_id: '22222222-2222-2222-2222-222222222222', created_by: '33333333-3333-3333-3333-333333333333'};

const buildChain = () => {
  const chain = {};
  ['select', 'eq', 'insert', 'update'].forEach(method => { chain[method] = jest.fn(() => chain); });
  chain.maybeSingle = jest.fn();
  chain.single = jest.fn();
  return chain;
};

const row = overrides => ({
  id: 'asset-1', project_id: scope.project_id, organization_id: scope.organization_id, created_by: scope.created_by,
  suite: 'project-management', name: 'Vendor Contract.pdf', description: '', type: 'document', mime_type: 'application/pdf',
  size: 12345, url: 'https://storage.example/asset-1', storage_path: `${scope.project_id}/asset-1.pdf`, tags: ['contract'],
  stage: 'Planning', uploaded_by: scope.created_by, uploaded_at: '2026-08-01T00:00:00.000Z', links: [], metadata: {},
  version: 1, created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

let projectsChain, opChain;

beforeEach(() => {
  jest.clearAllMocks();
  projectsChain = buildChain();
  opChain = buildChain();
  mockFrom.mockImplementation(table => (table === 'projects' ? projectsChain : opChain));
  mockAuthGetUser.mockResolvedValue({data: {user: {id: scope.created_by}}});
  projectsChain.maybeSingle.mockResolvedValue({data: {id: scope.project_id, organization_id: scope.organization_id}, error: null});
});

describe('list', () => {
  test('scopes reads to the given project and normalizes every row to the camelCase asset shape', async () => {
    cloudRepository.list.mockResolvedValue([row()]);
    const result = await assetRepository.list(scope.project_id);
    expect(cloudRepository.list).toHaveBeenCalledWith('assets', {project_id: scope.project_id});
    expect(result).toEqual([expect.objectContaining({id: 'asset-1', projectId: scope.project_id, mimeType: 'application/pdf', uploadedAt: '2026-08-01T00:00:00.000Z'})]);
  });

  test('passes through extra filters (e.g. stage) alongside the project scope', async () => {
    cloudRepository.list.mockResolvedValue([]);
    await assetRepository.list(scope.project_id, {stage: 'Planning'});
    expect(cloudRepository.list).toHaveBeenCalledWith('assets', {project_id: scope.project_id, stage: 'Planning'});
  });

  test('never returns another project\'s assets — scoping is by project_id, not suite or org alone', async () => {
    cloudRepository.list.mockResolvedValue([]);
    await assetRepository.list('some-other-project');
    expect(cloudRepository.list).toHaveBeenCalledWith('assets', {project_id: 'some-other-project'});
  });
});

describe('get', () => {
  test('delegates by id and normalizes the row', async () => {
    cloudRepository.get.mockResolvedValue(row());
    const result = await assetRepository.get('asset-1');
    expect(cloudRepository.get).toHaveBeenCalledWith('assets', 'asset-1');
    expect(result.projectId).toBe(scope.project_id);
  });
});

describe('create', () => {
  const assetData = {organizationId: scope.organization_id, createdBy: scope.created_by, suiteId: 'project-management', name: 'Vendor Contract.pdf', type: 'document', mimeType: 'application/pdf', size: 12345, url: 'https://storage.example/asset-1', stage: 'Planning', tags: ['contract']};

  test('performs a true insert scoped to the given project, verifying ownership first', async () => {
    opChain.single.mockResolvedValue({data: row(), error: null});
    const result = await assetRepository.create(scope.project_id, assetData);
    expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({project_id: scope.project_id, organization_id: scope.organization_id, created_by: scope.created_by, name: 'Vendor Contract.pdf', mime_type: 'application/pdf'}));
    expect(result.id).toBe('asset-1');
  });

  test('defaults links/tags/metadata and stamps uploadedAt/uploadedBy when not supplied', async () => {
    opChain.single.mockResolvedValue({data: row(), error: null});
    const {tags, ...withoutTags} = assetData;
    await assetRepository.create(scope.project_id, withoutTags);
    expect(opChain.insert).toHaveBeenCalledWith(expect.objectContaining({links: [], tags: [], metadata: {}, uploaded_by: scope.created_by}));
    expect(opChain.insert.mock.calls[0][0].uploaded_at).toEqual(expect.any(String));
  });

  test('rejects a project the caller cannot access instead of writing', async () => {
    projectsChain.maybeSingle.mockResolvedValue({data: null, error: null});
    await expect(assetRepository.create(scope.project_id, assetData)).rejects.toThrow('The target project does not exist or is not accessible.');
    expect(opChain.insert).not.toHaveBeenCalled();
  });

  test('propagates persistence failures instead of swallowing them', async () => {
    opChain.single.mockResolvedValue({data: null, error: Object.assign(new Error('row-level security policy'), {code: '42501'})});
    await expect(assetRepository.create(scope.project_id, assetData)).rejects.toThrow('row-level security policy');
  });
});

describe('update', () => {
  test('requires an existing id', async () => {
    await expect(assetRepository.update(undefined, {name: 'Renamed'})).rejects.toThrow('asset-update-requires-id');
    expect(opChain.update).not.toHaveBeenCalled();
  });

  test('increments version and gates the write on the caller-known version', async () => {
    cloudRepository.get.mockResolvedValue(row({version: 1}));
    opChain.single.mockResolvedValue({data: row({name: 'Renamed.pdf', version: 2}), error: null});
    const result = await assetRepository.update('asset-1', {name: 'Renamed.pdf'});
    expect(opChain.update).toHaveBeenCalledWith(expect.objectContaining({name: 'Renamed.pdf', version: 2}));
    expect(opChain.eq).toHaveBeenCalledWith('id', 'asset-1');
    expect(opChain.eq).toHaveBeenCalledWith('version', 1);
    expect(result.version).toBe(2);
  });

  test('rejects a stale write with a conflict error instead of silently losing a concurrent edit', async () => {
    cloudRepository.get.mockResolvedValue(row({version: 1}));
    opChain.single.mockResolvedValue({data: null, error: {code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned'}});
    await expect(assetRepository.update('asset-1', {name: 'Renamed.pdf'})).rejects.toThrow('asset-update-conflict');
  });

  test('only sends the fields actually being changed, not the whole row', async () => {
    cloudRepository.get.mockResolvedValue(row({version: 1}));
    opChain.single.mockResolvedValue({data: row({description: 'Updated', version: 2}), error: null});
    await assetRepository.update('asset-1', {description: 'Updated'});
    const updatePayload = opChain.update.mock.calls[0][0];
    expect(updatePayload).toEqual({description: 'Updated', version: 2});
  });
});

describe('remove', () => {
  test('delegates directly by id', async () => {
    cloudRepository.remove.mockResolvedValue(undefined);
    await assetRepository.remove('asset-1');
    expect(cloudRepository.remove).toHaveBeenCalledWith('assets', 'asset-1');
  });
});

describe('addLink / removeLink', () => {
  test('addLink appends a link with a generated id and linkedAt timestamp, preserving existing links', async () => {
    // addLink reads the asset once for its own logic and update() reads it again internally to
    // gate the optimistic-concurrency check — mockResolvedValue (not Once) covers both calls.
    cloudRepository.get.mockResolvedValue(row({links: [{id: 'link-existing', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay', linkedAt: '2026-07-01T00:00:00.000Z'}], version: 1}));
    const newLink = {artifactType: 'document', artifactId: 'doc-1', artifactLabel: 'Risk Register'};
    opChain.single.mockResolvedValue({data: row({links: [{id: 'link-existing'}, {id: 'link-new', ...newLink}], version: 2}), error: null});
    await assetRepository.addLink('asset-1', newLink);
    const sentLinks = opChain.update.mock.calls[0][0].links;
    expect(sentLinks).toHaveLength(2);
    expect(sentLinks[0].id).toBe('link-existing');
    expect(sentLinks[1]).toMatchObject(newLink);
    expect(sentLinks[1].id).toEqual(expect.any(String));
    expect(sentLinks[1].linkedAt).toEqual(expect.any(String));
  });

  test('removeLink filters out only the matching link id', async () => {
    cloudRepository.get.mockResolvedValue(row({links: [{id: 'link-a', artifactType: 'risk', artifactId: 'risk-1'}, {id: 'link-b', artifactType: 'action', artifactId: 'action-1'}], version: 1}));
    opChain.single.mockResolvedValue({data: row({links: [{id: 'link-b', artifactType: 'action', artifactId: 'action-1'}], version: 2}), error: null});
    await assetRepository.removeLink('asset-1', 'link-a');
    const sentLinks = opChain.update.mock.calls[0][0].links;
    expect(sentLinks).toHaveLength(1);
    expect(sentLinks[0].id).toBe('link-b');
  });
});

describe('file upload (Supabase Storage)', () => {
  const storageChain = () => ({upload: jest.fn(), createSignedUrl: jest.fn(), remove: jest.fn()});

  test('uploads under the project-scoped path and returns a signed url', async () => {
    const bucket = storageChain();
    bucket.upload.mockResolvedValue({data: {path: 'x'}, error: null});
    bucket.createSignedUrl.mockResolvedValue({data: {signedUrl: 'https://signed.example/x'}, error: null});
    mockStorageFrom.mockReturnValue(bucket);
    const file = {name: 'Vendor Contract.pdf', size: 1024, type: 'application/pdf'};
    const result = await assetRepository.uploadFile(scope.project_id, file);
    expect(mockStorageFrom).toHaveBeenCalledWith('project-assets');
    expect(bucket.upload.mock.calls[0][0]).toContain(scope.project_id);
    expect(bucket.upload.mock.calls[0][0]).toContain('Vendor-Contract.pdf');
    expect(result.url).toBe('https://signed.example/x');
    expect(result.storagePath).toContain(scope.project_id);
  });

  test('rejects a file larger than 25MB before ever touching storage', async () => {
    const bucket = storageChain();
    mockStorageFrom.mockReturnValue(bucket);
    const file = {name: 'huge.mp4', size: MAX_ASSET_FILE_SIZE_BYTES + 1, type: 'video/mp4'};
    await expect(assetRepository.uploadFile(scope.project_id, file)).rejects.toThrow('asset-too-large');
    expect(bucket.upload).not.toHaveBeenCalled();
  });

  test('deleteFile removes the object at the stored path', async () => {
    const bucket = storageChain();
    bucket.remove.mockResolvedValue({data: {}, error: null});
    mockStorageFrom.mockReturnValue(bucket);
    await assetRepository.deleteFile('path/to/file.pdf');
    expect(bucket.remove).toHaveBeenCalledWith(['path/to/file.pdf']);
  });

  test('deleteFile is a no-op for a URL asset with no storage path', async () => {
    const bucket = storageChain();
    mockStorageFrom.mockReturnValue(bucket);
    await assetRepository.deleteFile(null);
    expect(bucket.remove).not.toHaveBeenCalled();
  });
});

import {cloudRepository} from './cloudRepository';
import {supabase} from '../lib/supabase';
import {validateProjectOwnership} from '../services/persistenceSafety';
import {MAX_ASSET_FILE_SIZE_BYTES, ASSET_STORAGE_BUCKET} from '../config/assetConfig';

// Phase 4 — the project file and asset repository, following the exact operational pattern
// pmRepository.js established for tasks/risks/issues/decisions/approvals: cloudRepository for
// list/get/remove, the same organization-ownership assertion before every write, the same
// version-based optimistic concurrency on update (a stale write fails loudly with
// 'asset-update-conflict' rather than silently clobbering a concurrent edit), and the same
// cloud-not-configured guard for storage operations. See
// supabase/migrations/202608180001_project_assets.sql for the table this reads and writes.
//
// Unlike pmRepository's tables (which store type-specific fields inside a generic `content` jsonb
// blob), assets have a fixed, known shape every caller queries by, so this repository normalizes
// every row to/from that camelCase shape at the boundary — nothing outside this file needs to know
// the database uses snake_case columns.
const TABLE = 'assets';
const requireCloud = () => { if (!supabase) throw new Error('cloud-not-configured'); return supabase; };

const toRow = asset => ({
  ...(asset.id !== undefined ? {id: asset.id} : {}),
  ...(asset.projectId !== undefined ? {project_id: asset.projectId} : {}),
  ...(asset.organizationId !== undefined ? {organization_id: asset.organizationId} : {}),
  ...(asset.createdBy !== undefined ? {created_by: asset.createdBy} : {}),
  ...(asset.suiteId !== undefined ? {suite: asset.suiteId} : {}),
  ...(asset.name !== undefined ? {name: asset.name} : {}),
  ...(asset.description !== undefined ? {description: asset.description} : {}),
  ...(asset.type !== undefined ? {type: asset.type} : {}),
  ...(asset.mimeType !== undefined ? {mime_type: asset.mimeType} : {}),
  ...(asset.size !== undefined ? {size: asset.size} : {}),
  ...(asset.url !== undefined ? {url: asset.url} : {}),
  ...(asset.storagePath !== undefined ? {storage_path: asset.storagePath} : {}),
  ...(asset.tags !== undefined ? {tags: asset.tags} : {}),
  ...(asset.stage !== undefined ? {stage: asset.stage} : {}),
  ...(asset.uploadedBy !== undefined ? {uploaded_by: asset.uploadedBy} : {}),
  ...(asset.uploadedAt !== undefined ? {uploaded_at: asset.uploadedAt} : {}),
  ...(asset.links !== undefined ? {links: asset.links} : {}),
  ...(asset.metadata !== undefined ? {metadata: asset.metadata} : {}),
  ...(asset.version !== undefined ? {version: asset.version} : {}),
});

const fromRow = row => !row ? null : ({
  id: row.id,
  projectId: row.project_id,
  organizationId: row.organization_id,
  createdBy: row.created_by,
  suiteId: row.suite,
  name: row.name,
  description: row.description || '',
  type: row.type,
  mimeType: row.mime_type || '',
  size: row.size || 0,
  url: row.url,
  storagePath: row.storage_path || null,
  tags: row.tags || [],
  stage: row.stage || '',
  uploadedBy: row.uploaded_by,
  uploadedAt: row.uploaded_at,
  links: row.links || [],
  metadata: row.metadata || {},
  version: row.version || 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const assertOwnership = async (client, row) => {
  const {data: {user}} = await client.auth.getUser();
  const {data: project, error} = await client.from('projects').select('id,organization_id').eq('id', row.project_id).maybeSingle();
  if (error) throw error;
  validateProjectOwnership({userId: user?.id, organizationId: row.organization_id, projectId: row.project_id, createdBy: row.created_by, project});
};

const newLinkId = () => `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const assetRepository = {
  async list(projectId, filters = {}) {
    const rows = await cloudRepository.list(TABLE, {project_id: projectId, ...filters});
    return rows.map(fromRow);
  },
  async get(id) {
    return fromRow(await cloudRepository.get(TABLE, id));
  },
  // assetData must include organizationId and createdBy (the calling component's own project/user
  // context — see AssetUploadModal.js), matching how ProjectApprovals.js and the other PM tabs
  // supply the same fields to pmRepository rather than having the repository infer them.
  async create(projectId, assetData) {
    const client = requireCloud();
    const row = toRow({
      ...assetData,
      projectId,
      uploadedBy: assetData.uploadedBy || assetData.createdBy,
      uploadedAt: assetData.uploadedAt || new Date().toISOString(),
      links: assetData.links || [],
      tags: assetData.tags || [],
      metadata: assetData.metadata || {},
    });
    await assertOwnership(client, row);
    const {data, error} = await client.from(TABLE).insert(row).select().single();
    if (error) throw error;
    return fromRow(data);
  },
  async update(id, changes) {
    if (!id) throw new Error('asset-update-requires-id: updates must target an existing asset');
    const client = requireCloud();
    const existingRow = await cloudRepository.get(TABLE, id);
    const changedRow = toRow(changes);
    await assertOwnership(client, {...existingRow, ...changedRow});
    const nextVersion = (Number(existingRow.version) || 1) + 1;
    let query = client.from(TABLE).update({...changedRow, version: nextVersion}).eq('id', id);
    if (existingRow.version != null) query = query.eq('version', existingRow.version);
    const {data, error} = await query.select().single();
    if (error) {
      if (error.code === 'PGRST116') throw new Error('asset-update-conflict: the asset was modified or removed since it was last read');
      throw error;
    }
    return fromRow(data);
  },
  remove: id => cloudRepository.remove(TABLE, id),
  async addLink(assetId, link) {
    const asset = await assetRepository.get(assetId);
    const newLink = {id: newLinkId(), linkedAt: new Date().toISOString(), ...link};
    return assetRepository.update(assetId, {links: [...(asset.links || []), newLink]});
  },
  async removeLink(assetId, linkId) {
    const asset = await assetRepository.get(assetId);
    return assetRepository.update(assetId, {links: (asset.links || []).filter(item => item.id !== linkId)});
  },
  // File bytes never touch localStorage or a jsonb column — they go straight to the private
  // 'project-assets' Supabase Storage bucket, keyed by project so the storage policies in
  // 202608180001_project_assets.sql can scope access the same way the table's RLS policies do.
  async uploadFile(projectId, file) {
    if (file.size > MAX_ASSET_FILE_SIZE_BYTES) throw new Error(`asset-too-large: files must be 25MB or smaller (this file is ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    const client = requireCloud();
    const storagePath = `${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
    const {error} = await client.storage.from(ASSET_STORAGE_BUCKET).upload(storagePath, file, {cacheControl: '3600', upsert: false});
    if (error) throw error;
    const url = await assetRepository.getSignedUrl(storagePath);
    return {url, storagePath};
  },
  // The bucket is private, so a stored `url` is a signed URL with an expiry, not a permanent
  // reference — this refreshes one on demand (called before a download/preview action) rather than
  // relying on whatever was signed at upload time still being valid.
  async getSignedUrl(storagePath, expiresInSeconds = 60 * 60 * 24 * 7) {
    const client = requireCloud();
    const {data, error} = await client.storage.from(ASSET_STORAGE_BUCKET).createSignedUrl(storagePath, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },
  async deleteFile(storagePath) {
    if (!storagePath) return;
    const client = requireCloud();
    const {error} = await client.storage.from(ASSET_STORAGE_BUCKET).remove([storagePath]);
    if (error) throw error;
  },
};

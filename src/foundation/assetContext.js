import {ASSET_TYPES} from '../config/assetConfig';

// Phase 4 — a pure, side-effect-free aggregation of a project's asset records into a structured
// summary. Like foundation/projectHealth.js's computeProjectHealth(), this takes plain data in
// (the array assetRepository.list(projectId) already resolved) and returns plain data out — no
// Supabase call, no React, no UI dependency — so the AI daily-brief layer can call it directly with
// whatever asset list it already has, and a user-facing component gets the exact same aggregation.
const isLinked = asset => Array.isArray(asset.links) && asset.links.length > 0;

export const getProjectAssetContext = (projectId, assets = []) => {
  const scoped = assets.filter(asset => !projectId || asset.projectId === projectId);

  const byType = ASSET_TYPES.reduce((totals, type) => ({...totals, [type]: 0}), {});
  scoped.forEach(asset => { if (byType[asset.type] !== undefined) byType[asset.type] += 1; });

  const byStage = {};
  scoped.forEach(asset => {
    const stage = asset.stage || 'Unassigned';
    byStage[stage] = (byStage[stage] || 0) + 1;
  });

  const artifactBuckets = new Map();
  scoped.forEach(asset => {
    (asset.links || []).forEach(link => {
      const key = `${link.artifactType}:${link.artifactId}`;
      const bucket = artifactBuckets.get(key) || {artifactType: link.artifactType, artifactId: link.artifactId, artifactLabel: link.artifactLabel, assetCount: 0, assetIds: []};
      bucket.assetCount += 1;
      bucket.assetIds.push(asset.id);
      artifactBuckets.set(key, bucket);
    });
  });

  const recentlyUploaded = [...scoped]
    .filter(asset => asset.uploadedAt)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(0, 10)
    .map(asset => ({id: asset.id, name: asset.name, type: asset.type, stage: asset.stage || '', uploadedAt: asset.uploadedAt, uploadedBy: asset.uploadedBy}));

  const totalStorageBytes = scoped.reduce((total, asset) => total + (Number(asset.size) || 0), 0);

  return {
    projectId,
    computedAt: new Date().toISOString(),
    totalCount: scoped.length,
    totalStorageBytes,
    linkedCount: scoped.filter(isLinked).length,
    unlinkedCount: scoped.filter(asset => !isLinked(asset)).length,
    byType,
    byStage,
    byLinkedArtifact: [...artifactBuckets.values()].sort((a, b) => b.assetCount - a.assetCount),
    recentlyUploaded,
  };
};

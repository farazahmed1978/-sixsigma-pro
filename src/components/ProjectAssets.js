import React, {useEffect, useMemo, useState} from 'react';
import {useInteractions} from '../context/InteractionContext';
import {assetRepository} from '../repositories/assetRepository';
import {getProjectAssetContext} from '../foundation/assetContext';
import {lifecycleForProject, lifecycleStageLabels} from '../foundation/lifecycle';
import {ASSET_TYPES, ASSET_TYPE_LABELS, ASSET_TYPE_ICONS, formatAssetSize} from '../config/assetConfig';
import AssetUploadModal from './AssetUploadModal';
import './ProjectAssets.css';

const ARTIFACT_TYPE_LABELS = {document: 'Document', risk: 'Risk', action: 'Action', issue: 'Issue', decision: 'Decision', approval: 'Approval', report: 'Report', analysis: 'Analysis'};
const formatDate = value => (value ? new Date(value).toLocaleDateString() : '—');

// The Files and Assets tab on the Project Hub — a repository view over every asset
// assetRepository.list(project.id) returns for this project. Filtering, search, and the artifact
// filter's own option list are all derived from that one fetched array (plus
// getProjectAssetContext(), reused here for the linked-artifact filter options and the storage
// total, rather than recomputing the same aggregation a second way).
export default function ProjectAssets({project, linkableArtifacts = []}) {
  const {confirm, toast} = useInteractions();
  const lifecycle = lifecycleForProject(project);
  const stages = lifecycleStageLabels(lifecycle);

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStage, setFilterStage] = useState('All');
  const [filterArtifact, setFilterArtifact] = useState('All');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editValues, setEditValues] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true); setError('');
    return assetRepository.list(project.id)
      .then(rows => setAssets(rows))
      .catch(nextError => setError(nextError.message || 'Project assets could not be loaded.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const context = useMemo(() => getProjectAssetContext(project.id, assets), [project.id, assets]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter(asset => {
      if (filterType !== 'All' && asset.type !== filterType) return false;
      if (filterStage !== 'All' && (asset.stage || 'Unassigned') !== filterStage) return false;
      if (filterArtifact !== 'All' && !(asset.links || []).some(link => `${link.artifactType}:${link.artifactId}` === filterArtifact)) return false;
      if (query && !asset.name.toLowerCase().includes(query) && !(asset.tags || []).some(tag => tag.toLowerCase().includes(query))) return false;
      return true;
    });
  }, [assets, filterType, filterStage, filterArtifact, search]);

  const openAssetFile = async asset => {
    const url = asset.storagePath ? await assetRepository.getSignedUrl(asset.storagePath) : asset.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const selectAsset = asset => { setSelected(asset); setEditValues({name: asset.name, description: asset.description, stage: asset.stage || '', tagsText: (asset.tags || []).join(', ')}); };
  const closeDetail = () => { setSelected(null); setEditValues(null); };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await assetRepository.update(selected.id, {name: editValues.name.trim(), description: editValues.description.trim(), stage: editValues.stage, tags: editValues.tagsText.split(',').map(item => item.trim()).filter(Boolean)});
      setAssets(current => current.map(item => (item.id === updated.id ? updated : item)));
      setSelected(updated);
      toast('Asset updated.');
    } catch (saveError) {
      setError(saveError.message || 'The asset could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async linkId => {
    if (!selected) return;
    const updated = await assetRepository.removeLink(selected.id, linkId);
    setAssets(current => current.map(item => (item.id === updated.id ? updated : item)));
    setSelected(updated);
  };

  const deleteAsset = async asset => {
    if (!await confirm({title: 'Delete asset?', message: `"${asset.name}" will be permanently removed from this project.`, confirmLabel: 'Delete Asset', destructive: true})) return;
    await assetRepository.remove(asset.id);
    if (asset.storagePath) await assetRepository.deleteFile(asset.storagePath).catch(() => {});
    setAssets(current => current.filter(item => item.id !== asset.id));
    if (selected?.id === asset.id) closeDetail();
    toast('Asset deleted.');
  };

  return (
    <section className="project-assets" aria-labelledby="project-assets-title">
      <header>
        <div>
          <span>FILES AND ASSETS</span>
          <h2 id="project-assets-title">Files and Assets</h2>
          <p>{assets.length} asset{assets.length === 1 ? '' : 's'} · {formatAssetSize(context.totalStorageBytes)} used</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setUploadOpen(true)}>+ Upload</button>
      </header>

      {error && <div className="project-assets-error" role="alert"><span>{error}</span><button type="button" onClick={load}>Retry</button></div>}

      <div className="project-assets-controls">
        <select value={filterType} onChange={event => setFilterType(event.target.value)} aria-label="Filter by type">
          <option value="All">All types</option>
          {ASSET_TYPES.map(type => <option key={type} value={type}>{ASSET_TYPE_LABELS[type]}</option>)}
        </select>
        <select value={filterStage} onChange={event => setFilterStage(event.target.value)} aria-label="Filter by stage">
          <option value="All">All stages</option>
          {stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
        </select>
        <select value={filterArtifact} onChange={event => setFilterArtifact(event.target.value)} aria-label="Filter by linked artifact">
          <option value="All">All linked artifacts</option>
          {context.byLinkedArtifact.map(item => <option key={`${item.artifactType}:${item.artifactId}`} value={`${item.artifactType}:${item.artifactId}`}>{ARTIFACT_TYPE_LABELS[item.artifactType] || item.artifactType}: {item.artifactLabel}</option>)}
        </select>
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or tag" aria-label="Search assets" />
        <div className="project-assets-view-toggle">
          <button type="button" className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-label="Grid view">Grid</button>
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view">List</button>
        </div>
      </div>

      {!loading && assets.length === 0 ? (
        <div className="project-assets-empty">
          <div>◇</div>
          <h3>No files or assets yet</h3>
          <p>Attach supporting documents, images, and references to keep everything in one place.</p>
          <button type="button" className="btn-primary" onClick={() => setUploadOpen(true)}>+ Upload</button>
        </div>
      ) : !loading && filtered.length === 0 ? (
        <p className="project-assets-no-matches">No assets match your filters.</p>
      ) : view === 'grid' ? (
        <div className="project-assets-grid">
          {filtered.map(asset => (
            <button type="button" key={asset.id} className="project-asset-card" onClick={() => selectAsset(asset)}>
              <span className="project-asset-icon">{ASSET_TYPE_ICONS[asset.type] || '📎'}</span>
              <strong>{asset.name}</strong>
              <span className="project-asset-badges"><i>{ASSET_TYPE_LABELS[asset.type]}</i>{asset.stage && <i>{asset.stage}</i>}</span>
              <small>{formatDate(asset.uploadedAt)} · {(asset.links || []).length} link{(asset.links || []).length === 1 ? '' : 's'}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="project-assets-table">
          <table>
            <thead><tr><th /><th>Name</th><th>Type</th><th>Size</th><th>Stage</th><th>Uploaded</th><th>Links</th><th /></tr></thead>
            <tbody>
              {filtered.map(asset => (
                <tr key={asset.id}>
                  <td>{ASSET_TYPE_ICONS[asset.type] || '📎'}</td>
                  <td><button type="button" className="project-asset-link-button" onClick={() => selectAsset(asset)}>{asset.name}</button></td>
                  <td>{ASSET_TYPE_LABELS[asset.type]}</td>
                  <td>{asset.type === 'url' ? '—' : formatAssetSize(asset.size)}</td>
                  <td>{asset.stage || '—'}</td>
                  <td>{formatDate(asset.uploadedAt)}</td>
                  <td>{(asset.links || []).length}</td>
                  <td><button type="button" onClick={() => openAssetFile(asset)}>{asset.type === 'url' ? 'Open' : 'Download'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {uploadOpen && (
        <AssetUploadModal
          project={project}
          linkableArtifacts={linkableArtifacts}
          onClose={() => setUploadOpen(false)}
          onUploaded={asset => { setAssets(current => [asset, ...current]); setUploadOpen(false); }}
        />
      )}

      {selected && editValues && (
        <div className="asset-detail-panel" role="dialog" aria-modal="true" aria-label={`${selected.name} details`}>
          <button type="button" className="asset-detail-backdrop" onClick={closeDetail} aria-label="Close asset details" />
          <aside>
            <header><h3>{ASSET_TYPE_ICONS[selected.type] || '📎'} Asset Details</h3><button type="button" onClick={closeDetail} aria-label="Close">×</button></header>
            {['image', 'document'].includes(selected.type) && selected.url && (
              selected.type === 'image' ? <img className="asset-detail-preview" src={selected.url} alt={selected.name} /> : <p className="asset-detail-preview-hint">Preview available via Download.</p>
            )}
            <label>Name<input value={editValues.name} onChange={event => setEditValues(current => ({...current, name: event.target.value}))} /></label>
            <label>Description<textarea rows="3" value={editValues.description} onChange={event => setEditValues(current => ({...current, description: event.target.value}))} /></label>
            <label>Stage<select value={editValues.stage} onChange={event => setEditValues(current => ({...current, stage: event.target.value}))}><option value="">Not stage-specific</option>{stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}</select></label>
            <label>Tags<input value={editValues.tagsText} onChange={event => setEditValues(current => ({...current, tagsText: event.target.value}))} /></label>
            <div className="asset-detail-links">
              <span>Linked artifacts</span>
              {(selected.links || []).length ? (
                <ul>{(selected.links || []).map(link => <li key={link.id}>{ARTIFACT_TYPE_LABELS[link.artifactType] || link.artifactType}: {link.artifactLabel}<button type="button" onClick={() => removeLink(link.id)} aria-label={`Unlink ${link.artifactLabel}`}>×</button></li>)}</ul>
              ) : <p className="project-assets-no-matches">Not linked to anything yet.</p>}
            </div>
            <footer>
              <button type="button" className="btn-secondary" onClick={() => openAssetFile(selected)}>{selected.type === 'url' ? 'Open' : 'Download'}</button>
              <button type="button" className="btn-primary" disabled={saving} onClick={saveEdit}>{saving ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" className="danger" onClick={() => deleteAsset(selected)}>Delete</button>
            </footer>
          </aside>
        </div>
      )}
    </section>
  );
}

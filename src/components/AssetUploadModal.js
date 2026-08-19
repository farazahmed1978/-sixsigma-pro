import React, {useMemo, useRef, useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {useInteractions} from '../context/InteractionContext';
import {assetRepository, isValidProjectId} from '../repositories/assetRepository';
import {lifecycleForProject, lifecycleStageLabels} from '../foundation/lifecycle';
import {ASSET_TYPES, ASSET_TYPE_LABELS, assetTagSuggestionsForSuite, detectAssetType, formatAssetSize, MAX_ASSET_FILE_SIZE_BYTES} from '../config/assetConfig';
import './AssetUploadModal.css';

const ARTIFACT_TYPE_LABELS = {document: 'Document', risk: 'Risk', action: 'Action', issue: 'Issue', decision: 'Decision', approval: 'Approval', report: 'Report', analysis: 'Analysis'};
const nameWithoutExtension = fileName => String(fileName || '').replace(/\.[^./]+$/, '');
const sameArtifact = (a, b) => a.artifactType === b.artifactType && a.artifactId === b.artifactId;

// The single reusable upload/import modal every "Attach File" / "Add Asset" trigger on the
// platform opens (Files and Assets tab, Document Workspace, Evidence Library, and a paperclip icon
// on each Risk/Action/Issue/Decision/Approval record) — per the architecture requirement, context
// is passed in as props (project, an optional pre-filled link, an optional pre-selected stage, and
// an optional list of artifacts the link-search step can offer), not read from anywhere else. All
// persistence goes through assetRepository.js; this component holds only its own form state.
export default function AssetUploadModal({project, defaultLink, defaultStage = '', defaultTags = '', linkableArtifacts = [], onClose, onUploaded}) {
  const {user, profile} = useAuth();
  const {toast} = useInteractions();
  const lifecycle = lifecycleForProject(project);
  const stages = lifecycleStageLabels(lifecycle);
  const tagSuggestions = assetTagSuggestionsForSuite(lifecycle.id);

  const fileInputRef = useRef(null);
  // Synchronous re-entrancy guard for upload(): the "Upload" button's disabled={uploading} only
  // takes effect once React commits the setUploading(true) update, which leaves a gap where a second
  // click dispatched in the same tick (e.g. a fast double-click) would start a second upload before
  // that commit happens. This ref closes that gap immediately, with no render round-trip.
  const uploadInFlightRef = useRef(false);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('file');
  const [file, setFile] = useState(null);
  const [urlValue, setUrlValue] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('other');
  const [stage, setStage] = useState(defaultStage);
  const [tagsText, setTagsText] = useState(defaultTags);
  const [links, setLinks] = useState(defaultLink ? [defaultLink] : []);
  const [linkQuery, setLinkQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const tags = useMemo(() => tagsText.split(',').map(item => item.trim()).filter(Boolean), [tagsText]);
  const canAdvanceFromStep1 = mode === 'file' ? Boolean(file) : Boolean(urlValue.trim());
  const matchingArtifacts = useMemo(() => {
    const query = linkQuery.trim().toLowerCase();
    return linkableArtifacts.filter(item => !query || item.artifactLabel.toLowerCase().includes(query)).slice(0, 20);
  }, [linkableArtifacts, linkQuery]);

  const chooseFile = selected => {
    if (!selected) return;
    setError('');
    if (selected.size > MAX_ASSET_FILE_SIZE_BYTES) { setError(`"${selected.name}" is larger than the 25MB limit.`); return; }
    setFile(selected);
    setName(current => current || nameWithoutExtension(selected.name));
    setType(detectAssetType({mimeType: selected.type, fileName: selected.name}));
  };
  const chooseUrl = value => {
    setUrlValue(value);
    setType('url');
    setName(current => current || value.trim());
  };
  const toggleLink = candidate => setLinks(current => current.some(item => sameArtifact(item, candidate)) ? current.filter(item => !sameArtifact(item, candidate)) : [...current, candidate]);

  const goToStep2 = () => { if (canAdvanceFromStep1) setStep(2); };
  const goToStep3 = () => { if (!name.trim()) { setError('Give this asset a name before continuing.'); return; } setError(''); setStep(3); };

  const upload = async () => {
    if (uploadInFlightRef.current) return;
    // Fail fast on a bad project.id before ever touching Storage — catching this here, not just
    // inside assetRepository, means a bad id can't leave an orphaned uploaded file behind when the
    // asset record insert would have failed anyway.
    if (!isValidProjectId(project?.id)) {
      setError(`This project is missing a valid id (got ${JSON.stringify(project?.id)}). Reload the project and try again.`);
      return;
    }
    uploadInFlightRef.current = true;
    setUploading(true); setError('');
    try {
      let fileRef = {url: urlValue.trim(), storagePath: null, size: 0, mimeType: ''};
      if (mode === 'file') {
        const {url, storagePath} = await assetRepository.uploadFile(project.id, file);
        fileRef = {url, storagePath, size: file.size, mimeType: file.type || ''};
      }
      const created = await assetRepository.create(project.id, {
        organizationId: project.organizationId || profile?.default_organization_id,
        createdBy: user?.id,
        suiteId: lifecycle.id,
        name: name.trim(),
        description: description.trim(),
        type,
        mimeType: fileRef.mimeType,
        size: fileRef.size,
        url: fileRef.url,
        storagePath: fileRef.storagePath,
        tags,
        stage,
        links: links.map(link => ({...link, linkedAt: new Date().toISOString()})),
      });
      toast('Asset uploaded.');
      onUploaded?.(created);
      onClose?.();
    } catch (uploadError) {
      setError(uploadError.message || 'The asset could not be saved.');
    } finally {
      uploadInFlightRef.current = false;
      setUploading(false);
    }
  };

  const stepLabel = step === 1 ? 'Select a file or link' : step === 2 ? 'Categorize' : 'Confirm';

  return (
    <div className="asset-upload-modal" role="dialog" aria-modal="true" aria-labelledby="asset-upload-title">
      <button type="button" className="asset-upload-backdrop" onClick={() => !uploading && onClose?.()} aria-label="Close upload dialog" />
      <section>
        <header>
          <div><span>ADD ASSET</span><h2 id="asset-upload-title">Step {step} of 3 — {stepLabel}</h2></div>
          <button type="button" aria-label="Close upload dialog" onClick={() => !uploading && onClose?.()} disabled={uploading}>×</button>
        </header>
        {error && <div className="asset-upload-error" role="alert">{error}</div>}

        {step === 1 && (
          <div className="asset-upload-step">
            {/* Mounted unconditionally (not just while mode === 'file') so the "Upload a file" toggle
                can open the native picker via fileInputRef on the same click that switches modes —
                a ref into a conditionally-rendered input wouldn't exist yet on that first click. */}
            <input ref={fileInputRef} type="file" hidden onChange={event => chooseFile(event.target.files?.[0])} />
            <div className="asset-upload-mode-toggle">
              <button type="button" className={mode === 'file' ? 'active' : ''} onClick={() => { setMode('file'); fileInputRef.current?.click(); }}>Upload a file</button>
              <button type="button" className={mode === 'url' ? 'active' : ''} onClick={() => setMode('url')}>Link a URL</button>
            </div>
            {mode === 'file' ? (
              <div className="asset-upload-dropzone" role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click(); }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); }}>
                {file ? <p>{file.name} · {formatAssetSize(file.size)} · {ASSET_TYPE_LABELS[type]}</p> : <p>Drag and drop a file here, or click to browse. PDF, Word, Excel, PowerPoint, images, CSV, video, and more.</p>}
              </div>
            ) : (
              <label className="asset-upload-url-field">External URL<input type="url" value={urlValue} placeholder="https://" onChange={event => chooseUrl(event.target.value)} /></label>
            )}
            <footer><button type="button" className="btn-primary" disabled={!canAdvanceFromStep1} onClick={goToStep2}>Next →</button></footer>
          </div>
        )}

        {step === 2 && (
          <div className="asset-upload-step">
            <label>Asset name<input value={name} onChange={event => setName(event.target.value)} /></label>
            <label>Description (optional)<textarea rows="2" value={description} onChange={event => setDescription(event.target.value)} /></label>
            <label>Type<select value={type} onChange={event => setType(event.target.value)}>{ASSET_TYPES.map(item => <option key={item} value={item}>{ASSET_TYPE_LABELS[item]}</option>)}</select></label>
            <label>Stage<select value={stage} onChange={event => setStage(event.target.value)}><option value="">Not stage-specific</option>{stages.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
            <label>Tags (comma-separated)<input value={tagsText} onChange={event => setTagsText(event.target.value)} placeholder="e.g. contract, vendor" /></label>
            {tagSuggestions.length > 0 && (
              <div className="asset-upload-tag-suggestions">
                {tagSuggestions.map(suggestion => <button type="button" key={suggestion} onClick={() => setTagsText(current => current ? `${current}, ${suggestion}` : suggestion)}>+ {suggestion}</button>)}
              </div>
            )}
            <div className="asset-upload-links">
              <span>Link to artifact (optional — you can do this later)</span>
              {links.length > 0 && (
                <ul className="asset-upload-linked-chips">
                  {links.map(link => <li key={`${link.artifactType}:${link.artifactId}`}>{ARTIFACT_TYPE_LABELS[link.artifactType] || link.artifactType}: {link.artifactLabel}<button type="button" onClick={() => toggleLink(link)} aria-label={`Remove link to ${link.artifactLabel}`}>×</button></li>)}
                </ul>
              )}
              {linkableArtifacts.length > 0 && (
                <>
                  <input type="search" value={linkQuery} onChange={event => setLinkQuery(event.target.value)} placeholder="Search documents, risks, actions, issues, decisions, approvals…" />
                  <ul className="asset-upload-link-results">
                    {matchingArtifacts.map(item => (
                      <li key={`${item.artifactType}:${item.artifactId}`}>
                        <button type="button" onClick={() => toggleLink(item)}>{links.some(link => sameArtifact(link, item)) ? '✓ ' : '+ '}{ARTIFACT_TYPE_LABELS[item.artifactType] || item.artifactType}: {item.artifactLabel}</button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <footer><button type="button" className="btn-secondary" onClick={() => setStep(1)}>← Back</button><button type="button" className="btn-primary" onClick={goToStep3}>Next →</button></footer>
          </div>
        )}

        {step === 3 && (
          <div className="asset-upload-step">
            <dl className="asset-upload-summary">
              <div><dt>Name</dt><dd>{name}</dd></div>
              <div><dt>Type</dt><dd>{ASSET_TYPE_LABELS[type]}</dd></div>
              <div><dt>{mode === 'file' ? 'Size' : 'URL'}</dt><dd>{mode === 'file' ? formatAssetSize(file?.size) : urlValue}</dd></div>
              <div><dt>Stage</dt><dd>{stage || 'Not stage-specific'}</dd></div>
              <div><dt>Tags</dt><dd>{tags.length ? tags.join(', ') : 'None'}</dd></div>
              <div><dt>Linked to</dt><dd>{links.length ? links.map(link => link.artifactLabel).join(', ') : 'Nothing yet'}</dd></div>
            </dl>
            {uploading && <div className="asset-upload-progress" role="status">Uploading…</div>}
            <footer><button type="button" className="btn-secondary" disabled={uploading} onClick={() => setStep(2)}>← Back</button><button type="button" className="btn-primary" disabled={uploading} onClick={upload}>{uploading ? 'Uploading…' : (mode === 'file' ? 'Upload' : 'Save')}</button></footer>
          </div>
        )}
      </section>
    </div>
  );
}

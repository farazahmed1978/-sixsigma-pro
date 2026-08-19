import React, {useState} from 'react';
import './TagSelect.css';

// Shared tag control for AssetUploadModal.js (Step 2) and ProjectAssets.js's Asset Details panel —
// per the architecture requirement that tags come from a controlled, queryable vocabulary
// (assetConfig.js's suite-aware ASSET_TAG_SUGGESTIONS), not free text, since free text can't be
// filtered, searched, or reasoned about by the AI layer. The predefined list is the source of
// truth; "Add custom tag" is the explicit exception path, not the default entry point.
export default function TagSelect({value = [], onChange, suggestions = []}) {
  const [draft, setDraft] = useState('');
  const available = suggestions.filter(tag => !value.includes(tag));

  const addTag = tag => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };
  const removeTag = tag => onChange(value.filter(item => item !== tag));

  const handlePredefinedSelect = event => {
    const tag = event.target.value;
    if (tag) addTag(tag);
    event.target.value = '';
  };
  const handleDraftKeyDown = event => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    addTag(draft);
    setDraft('');
  };

  return (
    <div className="tag-select">
      {value.length > 0 && (
        <ul className="tag-select-chips">
          {value.map(tag => (
            <li key={tag}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="tag-select-controls">
        <select aria-label="Add predefined tag" value="" onChange={handlePredefinedSelect}>
          <option value="">+ Add tag…</option>
          {available.map(tag => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <input
          type="text"
          aria-label="Add custom tag"
          placeholder="Add custom tag…"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={handleDraftKeyDown}
        />
      </div>
    </div>
  );
}

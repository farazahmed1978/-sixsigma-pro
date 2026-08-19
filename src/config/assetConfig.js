// Phase 4 — central, AI-readable configuration for the project file and asset repository. Plain
// data only (types, thresholds, MIME-detection rules, suite-aware tag suggestions), no component
// logic — src/components/AssetUploadModal.js and src/pages/Files-and-assets surfaces read from
// here rather than hardcoding any of it, per the architecture note that tag suggestions (and every
// other asset-classification rule) must live in central config, not components.
export const ASSET_TYPES = ['document', 'image', 'spreadsheet', 'presentation', 'data', 'url', 'video', 'other'];

export const ASSET_TYPE_LABELS = {
  document: 'Document',
  image: 'Image',
  spreadsheet: 'Spreadsheet',
  presentation: 'Presentation',
  data: 'Data File',
  url: 'External URL',
  video: 'Video',
  other: 'Other',
};

export const ASSET_TYPE_ICONS = {
  document: '📄',
  image: '🖼',
  spreadsheet: '📊',
  presentation: '📽',
  data: '🗂',
  url: '🔗',
  video: '🎞',
  other: '📎',
};

// The artifact kinds an asset can be linked to (config/artifactContext.js's connection registry
// covers document-to-document connections; this is the separate, asset-to-anything link list Phase
// 4 introduces).
export const ASSET_LINKABLE_ARTIFACT_TYPES = ['document', 'risk', 'action', 'issue', 'decision', 'approval', 'report', 'analysis'];

export const MAX_ASSET_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const ASSET_STORAGE_BUCKET = 'project-assets';

// Suite-aware tag suggestions — the controlled, queryable vocabulary the Tags field's dropdown
// (src/components/TagSelect.js, used by AssetUploadModal.js and ProjectAssets.js) is populated
// from. This predefined list is the source of truth: free-text tags can't be filtered, searched, or
// reasoned about by the AI layer, so a custom typed tag is the explicit exception, not the default.
export const ASSET_TAG_SUGGESTIONS = {
  'project-management': ['approval', 'vendor', 'meeting minutes', 'sign-off', 'inspection', 'contract', 'reference'],
  'operational-excellence': ['data', 'evidence', 'analysis output', 'process map', 'control chart', 'baseline', 'measurement'],
};
export const assetTagSuggestionsForSuite = suiteId => ASSET_TAG_SUGGESTIONS[suiteId] || [];

// MIME-type-first detection (the browser File API's File.type), matching the architecture
// requirement that type detection use MIME type, not just the filename extension. Extension is
// only consulted as a fallback for the (fairly common) case where the OS/browser reports an empty
// MIME type for a file it doesn't recognize.
const MIME_TYPE_RULES = [
  [/^image\//, 'image'],
  [/^video\//, 'video'],
  [/^application\/pdf$/, 'document'],
  [/^application\/msword$/, 'document'],
  [/wordprocessingml/, 'document'],
  [/^application\/vnd\.ms-excel$/, 'spreadsheet'],
  [/spreadsheetml/, 'spreadsheet'],
  [/^application\/vnd\.ms-powerpoint$/, 'presentation'],
  [/presentationml/, 'presentation'],
  [/^text\/csv$/, 'data'],
  [/^application\/json$/, 'data'],
];
const EXTENSION_RULES = {
  pdf: 'document', doc: 'document', docx: 'document', rtf: 'document', txt: 'document',
  xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'data',
  ppt: 'presentation', pptx: 'presentation',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image',
  mp4: 'video', mov: 'video', avi: 'video', webm: 'video',
  json: 'data',
};
const extensionOf = filename => (String(filename || '').split('.').pop() || '').toLowerCase();

export const detectAssetType = ({mimeType = '', fileName = ''} = {}) => {
  const rule = MIME_TYPE_RULES.find(([pattern]) => pattern.test(mimeType));
  if (rule) return rule[1];
  return EXTENSION_RULES[extensionOf(fileName)] || 'other';
};

export const formatAssetSize = bytes => {
  const n = Number(bytes) || 0;
  if (n === 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${Math.round((n / (1024 * 1024)) * 10) / 10} MB`;
};

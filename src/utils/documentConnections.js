import {DOCUMENT_CONNECTIONS, connectionsForTarget} from '../config/artifactContext';
import {documentIdFor} from './documentModel';
import {PMP_TEMPLATES} from '../config/pmpTemplates';
import {DEFINE_TEMPLATES} from '../config/defineTemplates';

// Phase 3, Part 2 — the pure engine that reads DOCUMENT_CONNECTIONS (config/artifactContext.js)
// and a project's existing documents, and computes what to pre-populate on a target document that
// is currently being opened. Every function here is a plain function of its arguments — no React,
// no component state — so DocumentWorkspace (or the AI layer, or a test) can call it directly.
const ALL_TEMPLATES = [...PMP_TEMPLATES, ...DEFINE_TEMPLATES];
export const connectionSourceDocumentName = docId => ALL_TEMPLATES.find(item => item.id === docId)?.name || docId;

const isBlank = value => value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
const numeric = value => { if (value === undefined || value === null || value === '') return null; const stripped = String(value).replace(/[^0-9.-]/g, ''); if (!stripped || stripped === '-' || stripped === '.') return null; const n = Number(stripped); return Number.isFinite(n) ? n : null; };
const mappedKey = mapping => typeof mapping === 'string' ? mapping : mapping.to;
const resolveMappedValue = (mapping, sourceValue, sourceValues) => (typeof mapping === 'string' || !mapping.transform) ? sourceValue : mapping.transform(sourceValue, sourceValues);
const sourceRecord = (project, docId) => project?.documents?.[documentIdFor(docId)] || null;

const applyTableConnection = (connection, project, values, provenance) => {
  const source = sourceRecord(project, connection.sourceDocId);
  const sourceRows = source?.values?.[connection.sourceField];
  if (!Array.isArray(sourceRows) || !sourceRows.length) return {values, provenance};
  const targetRows = Array.isArray(values[connection.targetField]) ? [...values[connection.targetField]] : [];
  let nextProvenance = provenance;
  let touched = false;
  sourceRows.forEach((sourceRow, rowIndex) => {
    const existingRow = targetRows[rowIndex];
    // Built from an empty object (not pre-seeded with a generated id) because several PM tables
    // (e.g. RAID Log) have their own data column literally keyed 'id' ("ID" — a human-entered risk
    // or issue identifier). Seeding a row-management id under that same key first would make the
    // blank-check below think that column was already filled and skip the real mapped value.
    // Falling back to a generated id only after the fieldMap has had a chance to fill it keeps both
    // uses of 'id' correct: a mapped value wins when there is one, a generated placeholder covers
    // every other table.
    const nextRow = existingRow ? {...existingRow} : {};
    let rowTouched = false;
    Object.entries(connection.fieldMap).forEach(([sourceKey, mapping]) => {
      const targetKey = mappedKey(mapping);
      if (!targetKey || !isBlank(nextRow[targetKey])) return; // never overwrite a populated cell
      const raw = sourceRow[sourceKey];
      if (isBlank(raw)) return;
      const nextValue = resolveMappedValue(mapping, raw, sourceRow);
      nextRow[targetKey] = nextValue;
      rowTouched = true;
      const provenanceKey = `${connection.targetField}:${rowIndex}:${targetKey}`;
      nextProvenance = {...nextProvenance, [provenanceKey]: {
        kind: 'table', connectionId: connection.id, sourceDocId: connection.sourceDocId, sourceDocName: connectionSourceDocumentName(connection.sourceDocId),
        sourceField: connection.sourceField, sourceKey, rowIndex, targetField: connection.targetField, targetKey,
        sourceUpdatedAt: source.updatedAt || null, populatedValue: nextValue,
      }};
    });
    if (rowTouched) {
      if (!nextRow.id) nextRow.id = `${connection.targetField}-conn-${rowIndex}`;
      targetRows[rowIndex] = nextRow;
      touched = true;
    }
  });
  if (!touched) return {values, provenance};
  return {values: {...values, [connection.targetField]: targetRows.filter(Boolean)}, provenance: nextProvenance};
};

const applyAggregateConnection = (connection, project, values, provenance) => {
  if (!isBlank(values[connection.targetField])) return {values, provenance};
  const source = sourceRecord(project, connection.sourceDocId);
  const rows = source?.values?.[connection.sourceField];
  if (!Array.isArray(rows) || !rows.length) return {values, provenance};
  const numbers = rows.map(row => numeric(row[connection.sourceColumn])).filter(n => n !== null);
  if (!numbers.length) return {values, provenance};
  const sum = Math.round(numbers.reduce((total, n) => total + n, 0) * 100) / 100;
  return {
    values: {...values, [connection.targetField]: sum},
    provenance: {...provenance, [connection.targetField]: {
      kind: 'aggregate', connectionId: connection.id, sourceDocId: connection.sourceDocId, sourceDocName: connectionSourceDocumentName(connection.sourceDocId),
      targetField: connection.targetField, sourceUpdatedAt: source.updatedAt || null, populatedValue: sum,
    }},
  };
};

const applyNarrativeConnection = (connection, project, values, provenance) => {
  if (!isBlank(values[connection.targetField])) return {values, provenance};
  const source = sourceRecord(project, connection.sourceDocId);
  if (!source) return {values, provenance};
  const text = connection.narrate(source.values || {});
  if (isBlank(text)) return {values, provenance};
  return {
    values: {...values, [connection.targetField]: text},
    provenance: {...provenance, [connection.targetField]: {
      kind: 'narrative', connectionId: connection.id, sourceDocId: connection.sourceDocId, sourceDocName: connectionSourceDocumentName(connection.sourceDocId),
      targetField: connection.targetField, sourceUpdatedAt: source.updatedAt || null, populatedValue: text,
    }},
  };
};

const applyConditionalRowConnection = (connection, project, values, provenance) => {
  const source = sourceRecord(project, connection.sourceDocId);
  const sourceValues = source?.values;
  if (!source || !connection.condition(sourceValues || {})) return {values, provenance};
  const row = {};
  Object.entries(connection.fieldMap).forEach(([sourceKey, mapping]) => {
    const raw = sourceValues[sourceKey];
    if (isBlank(raw)) return;
    row[mappedKey(mapping)] = resolveMappedValue(mapping, raw, sourceValues);
  });
  const matchValue = row[connection.matchKey];
  if (isBlank(matchValue)) return {values, provenance};
  const targetRows = Array.isArray(values[connection.targetField]) ? values[connection.targetField] : [];
  if (targetRows.some(existing => existing[connection.matchKey] === matchValue)) return {values, provenance}; // already synced, don't duplicate
  const newRow = {id: `${connection.targetField}-conn-${matchValue}`, ...row};
  const provenanceKey = `${connection.targetField}:${matchValue}`;
  return {
    values: {...values, [connection.targetField]: [...targetRows, newRow]},
    provenance: {...provenance, [provenanceKey]: {
      kind: 'conditional-scalar-row', connectionId: connection.id, sourceDocId: connection.sourceDocId, sourceDocName: connectionSourceDocumentName(connection.sourceDocId),
      targetField: connection.targetField, matchKey: connection.matchKey, matchValue, sourceUpdatedAt: source.updatedAt || null, populatedValue: newRow,
    }},
  };
};

const APPLIERS = {table: applyTableConnection, aggregate: applyAggregateConnection, narrative: applyNarrativeConnection, 'conditional-scalar-row': applyConditionalRowConnection};

// Only fields/cells that are currently blank get auto-populated — a field the user has already
// filled in (whether by typing or by an earlier connection) is never overwritten here. Provenance
// entries from a previous call are preserved as-is even for fields that are no longer blank, so
// stale-source detection keeps working after the field has been populated (or edited).
export const applyDocumentConnections = ({project, targetDocId, targetValues = {}, existingProvenance = {}}) => {
  let values = {...targetValues};
  let provenance = {...existingProvenance};
  connectionsForTarget(targetDocId).forEach(connection => {
    const applier = APPLIERS[connection.kind];
    if (!applier) return;
    const result = applier(connection, project, values, provenance);
    values = result.values;
    provenance = result.provenance;
  });
  return {values, provenance};
};

// A provenance entry is stale when its source document has been updated since the value was
// populated — the target keeps whatever it has (never auto-overwritten), but the caller can use
// this to show a "source changed, re-sync?" notice.
export const detectStaleConnections = ({project, provenance = {}}) =>
  Object.entries(provenance)
    .map(([provenanceKey, entry]) => {
      const source = sourceRecord(project, entry.sourceDocId);
      const currentSourceUpdatedAt = source?.updatedAt || null;
      if (!source || !entry.sourceUpdatedAt || !currentSourceUpdatedAt) return null;
      if (new Date(currentSourceUpdatedAt) <= new Date(entry.sourceUpdatedAt)) return null;
      return {provenanceKey, ...entry, currentSourceUpdatedAt};
    })
    .filter(Boolean);

// Whether a populated field's current value still matches what the connection wrote (used to
// decide whether the "From [Source Document]" badge should still show — it disappears the moment
// the user edits the value away from what was auto-populated).
export const isConnectionValueUnedited = (currentValue, provenanceEntry) => {
  if (!provenanceEntry) return false;
  try { return JSON.stringify(currentValue) === JSON.stringify(provenanceEntry.populatedValue); }
  catch { return currentValue === provenanceEntry.populatedValue; }
};

// Explicit, user-triggered re-pull of one provenance entry's value from the (now-changed) source —
// unlike applyDocumentConnections, this overwrites regardless of the field's current value, since
// the user asked for it via the "re-sync" action on a stale-source notice.
export const resyncProvenanceEntry = ({project, targetValues, provenanceKey, provenance}) => {
  const entry = provenance?.[provenanceKey];
  const connection = entry && DOCUMENT_CONNECTIONS.find(item => item.id === entry.connectionId);
  const source = entry && sourceRecord(project, entry.sourceDocId);
  if (!entry || !connection || !source) return {values: targetValues, provenance};
  const unchanged = {values: targetValues, provenance};

  if (entry.kind === 'table') {
    const sourceRow = source.values?.[entry.sourceField]?.[entry.rowIndex];
    if (!sourceRow) return unchanged;
    const raw = sourceRow[entry.sourceKey];
    if (isBlank(raw)) return unchanged;
    const nextValue = resolveMappedValue(connection.fieldMap[entry.sourceKey], raw, sourceRow);
    const rows = [...(targetValues[entry.targetField] || [])];
    if (!rows[entry.rowIndex]) return unchanged;
    rows[entry.rowIndex] = {...rows[entry.rowIndex], [entry.targetKey]: nextValue};
    return {
      values: {...targetValues, [entry.targetField]: rows},
      provenance: {...provenance, [provenanceKey]: {...entry, sourceUpdatedAt: source.updatedAt || null, populatedValue: nextValue}},
    };
  }
  if (entry.kind === 'aggregate') {
    const rows = source.values?.[connection.sourceField] || [];
    const numbers = rows.map(row => numeric(row[connection.sourceColumn])).filter(n => n !== null);
    if (!numbers.length) return unchanged;
    const sum = Math.round(numbers.reduce((total, n) => total + n, 0) * 100) / 100;
    return {
      values: {...targetValues, [entry.targetField]: sum},
      provenance: {...provenance, [provenanceKey]: {...entry, sourceUpdatedAt: source.updatedAt || null, populatedValue: sum}},
    };
  }
  if (entry.kind === 'narrative') {
    const text = connection.narrate(source.values || {});
    if (isBlank(text)) return unchanged;
    return {
      values: {...targetValues, [entry.targetField]: text},
      provenance: {...provenance, [provenanceKey]: {...entry, sourceUpdatedAt: source.updatedAt || null, populatedValue: text}},
    };
  }
  if (entry.kind === 'conditional-scalar-row') {
    const sourceValues = source.values || {};
    if (!connection.condition(sourceValues)) return unchanged;
    const row = {};
    Object.entries(connection.fieldMap).forEach(([sourceKey, mapping]) => {
      const raw = sourceValues[sourceKey];
      if (isBlank(raw)) return;
      row[mappedKey(mapping)] = resolveMappedValue(mapping, raw, sourceValues);
    });
    const rows = (targetValues[entry.targetField] || []).map(existing => existing[connection.matchKey] === entry.matchValue ? {...existing, ...row} : existing);
    return {
      values: {...targetValues, [entry.targetField]: rows},
      provenance: {...provenance, [provenanceKey]: {...entry, sourceUpdatedAt: source.updatedAt || null, populatedValue: row}},
    };
  }
  return unchanged;
};

export const DOCUMENT_SCHEMA_VERSION = 1;
export const documentIdFor = templateId => `document-${templateId}`;
export function createDocument(template, projectId, existing) {
  const now = new Date().toISOString();
  const base = { schemaVersion: DOCUMENT_SCHEMA_VERSION, id: documentIdFor(template.id), templateId: template.id, projectId, title: template.name, status: 'draft', sectionState: {}, createdAt: now, updatedAt: now };
  return { ...base, ...existing, values: { ...(existing?.values || {}) }, references: { datasetIds: [], analysisIds: [], reportIds: [], documentIds: [], ...(existing?.references || {}) } };
}
export const textValue = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
export function documentScores(template, values) {
  const fields = template.sections.flatMap(section => section.fields.filter(field => field.type !== 'sig'));
  const required = fields.filter(field => field.required !== false);
  const isPopulated = field => Array.isArray(values[field.id]) ? values[field.id].length > 0 : Boolean(textValue(values[field.id]));
  const populated = required.filter(isPopulated).length;
  const completion = required.length ? Math.round(populated / required.length * 100) : 100;
  const substantive = required.filter(field => {
    const value = values[field.id];
    if (Array.isArray(value)) return value.length > 0 && value.every(row => Object.entries(row).filter(([key]) => !['id','collapsed'].includes(key)).every(([,cell]) => Boolean(textValue(cell))));
    return field.type === 'textarea' ? textValue(value).length >= 30 : Boolean(textValue(value));
  }).length;
  return { completion, quality: required.length ? Math.round(substantive / required.length * 100) : 100, populated, total: required.length };
}

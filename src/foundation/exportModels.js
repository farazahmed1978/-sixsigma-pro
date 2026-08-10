export const EXPORT_MODEL_VERSION = 1;
export const EXPORT_FORMATS = Object.freeze(['svg', 'png', 'pdf', 'html', 'csv', 'xlsx', 'docx', 'pptx']);

const base = (kind, input) => ({
  schemaVersion: EXPORT_MODEL_VERSION,
  kind,
  id: input.id || `${kind}-${Date.now()}`,
  title: input.title || '',
  projectId: input.projectId || '',
  sourceType: input.sourceType || '',
  sourceId: input.sourceId || '',
  metadata: input.metadata || {},
});

export const createChartModel = (input = {}) => ({ ...base('chart', input), chartType: input.chartType || 'line', series: input.series || [], axes: input.axes || {}, annotations: input.annotations || [], style: input.style || {} });
export const createTableModel = (input = {}) => ({ ...base('table', input), columns: input.columns || [], rows: input.rows || [], footnotes: input.footnotes || [] });
export const createReportModel = (input = {}) => ({ ...base('report', input), sections: input.sections || [], header: input.header || {}, footer: input.footer || {}, provenance: input.provenance || [] });

export class ExportRendererRegistry {
  constructor() { this.renderers = new Map(); }
  register(kind, format, renderer) {
    if (!EXPORT_FORMATS.includes(format) || typeof renderer !== 'function') throw new Error('A supported format and renderer function are required.');
    this.renderers.set(`${kind}:${format}`, renderer);
    return this;
  }
  supports(kind, format) { return this.renderers.has(`${kind}:${format}`); }
  render(model, format, options = {}) {
    const renderer = this.renderers.get(`${model.kind}:${format}`);
    if (!renderer) throw new Error(`No ${format} renderer registered for ${model.kind}.`);
    return renderer(model, options);
  }
}

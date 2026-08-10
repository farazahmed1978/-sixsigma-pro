import { createFinding } from '../foundation/provenance';

export const DISPLAY_PRECISION = Object.freeze({ index: 3, estimate: 4, percent: 1, pValue: 4 });

export function createControlChartUiDefaults() {
  return { advancedOpen: false, useHistorical: false, historical: { center: '', sigma: '' }, stages: [] };
}

export function chartTabClass(active) { return active ? 'chart-type-tab active' : 'chart-type-tab'; }

export function prepareImrMeasurement({ selectedColumn = '', columnExists = false, rawValues = [] } = {}) {
  if (!selectedColumn) return { values: [], points: [], totalRows: 0, validCount: 0, omittedCount: 0, isValid: false, message: 'Select a numeric measurement containing at least 2 valid observations.' };
  if (!columnExists) return { values: [], points: [], totalRows: 0, validCount: 0, omittedCount: 0, isValid: false, message: `“${selectedColumn}” is not available in the current dataset. Select a current numeric measurement.` };
  const source = Array.isArray(rawValues) ? rawValues : [];
  const points = source.map((rawValue, sourceIndex) => ({ rawValue, sourceIndex, value: rawValue === '' || rawValue === null || rawValue === undefined ? NaN : Number(rawValue) })).filter(point => Number.isFinite(point.value));
  const summary = { values: points.map(point => point.value), points, totalRows: source.length, validCount: points.length, omittedCount: source.length - points.length };
  if (points.length < 2) return { ...summary, isValid: false, message: `${selectedColumn} contains fewer than 2 valid numeric observations.` };
  return { ...summary, isValid: true, message: '' };
}

const SIGNAL_RULES = Object.freeze({
  WE1: { label: 'Beyond 3σ', description: 'Individual observations unusually far from the process center.', priority: 1 },
  LIMIT: { label: 'Beyond control limit', description: 'An observation is outside its applicable control limits.', priority: 1 },
  WE4: { label: '8 points on one side', description: 'Possible sustained process shift.', priority: 2 },
  WE2: { label: '2 of 3 beyond 2σ', description: 'Short-term evidence of a shift away from center.', priority: 3 },
  WE3: { label: '4 of 5 beyond 1σ', description: 'Sustained movement away from the process center.', priority: 4 },
  N5: { label: '6-point trend', description: 'Sustained upward or downward movement.', priority: 5 },
  N6: { label: '14 alternating', description: 'Possible systematic oscillation.', priority: 6 },
});

export function observationLabel(indices = []) {
  const observations = [...new Set(indices)].sort((a, b) => a - b).map(index => index + 1);
  if (!observations.length) return 'No observations';
  if (observations.length === 1) return `Observation ${observations[0]}`;
  const contiguous = observations.every((value, index) => index === 0 || value === observations[index - 1] + 1);
  return contiguous ? `Observations ${observations[0]}–${observations[observations.length - 1]}` : `Observations ${observations.join(', ')}`;
}

export function buildSpcSignalPresentation(violations = [], prioritizedLimit = 5) {
  const occurrences = Array.isArray(violations) ? violations.map((signal, occurrenceIndex) => ({ ...signal, occurrenceIndex, rule: SIGNAL_RULES[signal.ruleId] || { label: signal.ruleId || 'Signal', description: signal.explanation || 'Review this signal.', priority: 99 }, observationLabel: observationLabel(signal.pointIndices) })) : [];
  const affected = new Set(occurrences.flatMap(signal => signal.pointIndices || []));
  const byRule = new Map();
  occurrences.forEach(signal => { const current = byRule.get(signal.ruleId) || { ruleId: signal.ruleId, label: signal.rule.label, description: signal.rule.description, priority: signal.rule.priority, occurrenceCount: 0, affectedObservations: new Set() }; current.occurrenceCount += 1; (signal.pointIndices || []).forEach(index => current.affectedObservations.add(index)); byRule.set(signal.ruleId, current); });
  const ruleSummary = [...byRule.values()].map(item => ({
    ...item,
    affectedObservationCount: item.affectedObservations.size,
    affectedObservations: [...item.affectedObservations].sort((a, b) => a - b),
  })).sort((a, b) => a.priority - b.priority || a.ruleId.localeCompare(b.ruleId));
  const severityRank = { critical: 0, error: 0, warning: 1, information: 2 };
  const prioritized = [...occurrences].sort((a, b) => a.rule.priority - b.rule.priority || (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) || Math.min(...(a.pointIndices || [Infinity])) - Math.min(...(b.pointIndices || [Infinity])) || a.occurrenceIndex - b.occurrenceIndex).slice(0, prioritizedLimit);
  return { affectedObservationCount: affected.size, affectedObservations: [...affected].sort((a, b) => a - b), distinctRuleCount: byRule.size, totalOccurrenceCount: occurrences.length, ruleSummary, prioritized, fullEvidence: occurrences };
}

export function formatMetric(value, digits = DISPLAY_PRECISION.estimate) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

export function chartRecommendationDetails(input) {
  const { dataType = 'continuous', subgroupSize = 1, varyingDenominator = false, countKind = 'defective' } = input;
  if (dataType === 'continuous' && subgroupSize <= 1) return { chart: 'imr', label: 'I-MR', reason: 'Individual continuous observations are collected one at a time.' };
  if (dataType === 'continuous' && subgroupSize <= 10) return { chart: 'xbar-r', label: 'Xbar-R', reason: `Rational subgroups contain ${subgroupSize} observations; ranges are effective for subgroups of 2–10.` };
  if (dataType === 'continuous') return { chart: 'xbar-s', label: 'Xbar-S', reason: `Rational subgroups contain ${subgroupSize} observations; standard deviations are preferred for larger subgroups.` };
  if (countKind === 'defective') return varyingDenominator
    ? { chart: 'p', label: 'p', reason: 'The result is a defective proportion and sample size varies.' }
    : { chart: 'np', label: 'np', reason: 'The result is a defective count with constant sample size.' };
  return varyingDenominator
    ? { chart: 'u', label: 'u', reason: 'The result is defects per unit and opportunity varies.' }
    : { chart: 'c', label: 'c', reason: 'The result is a defect count with constant opportunity.' };
}

export function validateStages(stages, pointCount) {
  const normalized = stages.map((stage, index) => ({
    id: stage.id || `stage-${index + 1}`,
    name: String(stage.name || '').trim(),
    start: Number(stage.start),
    end: Number(stage.end),
  }));
  normalized.forEach(stage => {
    if (!stage.name) throw new Error('Every stage needs a meaningful name.');
    if (!Number.isInteger(stage.start) || !Number.isInteger(stage.end) || stage.start < 1 || stage.end > pointCount || stage.start > stage.end) throw new Error(`Stage “${stage.name}” must use valid 1-based start/end positions.`);
  });
  const ordered = [...normalized].sort((a, b) => a.start - b.start);
  for (let index = 1; index < ordered.length; index += 1) if (ordered[index].start <= ordered[index - 1].end) throw new Error('Stages cannot overlap.');
  return normalized.map(stage => ({ ...stage, start: stage.start - 1, end: stage.end - 1 }));
}

export function buildEvidenceIdentity(dataset, variable, analysisId) {
  return { analysisId, datasetId: dataset?.id || '', datasetVersionId: dataset?.versionId || '', variable };
}

export function evidenceMatches(evidence, dataset, variable) {
  return Boolean(evidence && dataset && evidence.datasetId === dataset.id && evidence.datasetVersionId === dataset.versionId && evidence.variable === variable);
}

export function createPractitionerFinding({ analysisId, dataset, variable, type, severity, statement, evidence }) {
  return createFinding({
    id: `${analysisId}-finding-${Date.now()}`,
    analysisId,
    sourceId: analysisId,
    projectId: dataset?.projectId || '',
    organizationId: dataset?.organizationId || '',
    findingType: type,
    severity,
    statement,
    resultPath: evidence?.resultPath || '',
    metadata: { datasetId: dataset?.id || '', datasetVersionId: dataset?.versionId || '', variable, evidence: evidence || {}, createdAt: new Date().toISOString() },
  });
}

export function structuredReportPayload({ method, methodVersion, configuration, metrics, tables = {}, plots = {}, signals = [], interpretation, warnings = [], evidence = {} }) {
  return { schemaVersion: 1, method, methodVersion, configuration, metrics, tables, plots, signals, interpretation, warnings, evidence };
}

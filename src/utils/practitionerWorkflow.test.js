import { buildSpcSignalPresentation, chartRecommendationDetails, chartTabClass, createControlChartUiDefaults, evidenceMatches, formatMetric, observationLabel, prepareImrMeasurement, structuredReportPayload, validateStages } from './practitionerWorkflow';
import { MSA_VALIDATION_STATUS } from './msaEngine';

test('recommends practitioner charts deterministically', () => {
  expect(chartRecommendationDetails({ dataType: 'continuous', subgroupSize: 1 }).chart).toBe('imr');
  expect(chartRecommendationDetails({ dataType: 'continuous', subgroupSize: 5 }).chart).toBe('xbar-r');
  expect(chartRecommendationDetails({ dataType: 'continuous', subgroupSize: 12 }).chart).toBe('xbar-s');
  expect(chartRecommendationDetails({ dataType: 'attribute', varyingDenominator: true, countKind: 'defective' }).chart).toBe('p');
});

test('validates stages and converts positions for the engine', () => {
  expect(validateStages([{ name: 'Before', start: 1, end: 5 }, { name: 'After', start: 6, end: 10 }], 10)).toMatchObject([{ start: 0, end: 4 }, { start: 5, end: 9 }]);
  expect(() => validateStages([{ name: 'A', start: 1, end: 6 }, { name: 'B', start: 6, end: 9 }], 10)).toThrow(/overlap/i);
});

test('requires strict dataset version and variable identity', () => {
  const dataset = { id: 'd1', versionId: 'v2' };
  expect(evidenceMatches({ datasetId: 'd1', datasetVersionId: 'v2', variable: 'Y' }, dataset, 'Y')).toBe(true);
  expect(evidenceMatches({ datasetId: 'd1', datasetVersionId: 'v1', variable: 'Y' }, dataset, 'Y')).toBe(false);
});

test('formats display values without changing source precision', () => {
  const value = 1.23456789;
  expect(formatMetric(value, 3)).toBe('1.235');
  expect(value).toBe(1.23456789);
});

test('control chart advanced options are inactive and empty by default', () => {
  expect(createControlChartUiDefaults()).toEqual({ advancedOpen: false, useHistorical: false, historical: { center: '', sigma: '' }, stages: [] });
});

test('selected chart uses the subtle tab state', () => {
  expect(chartTabClass(true)).toBe('chart-type-tab active');
  expect(chartTabClass(false)).toBe('chart-type-tab');
});

describe('I-MR measurement handoff', () => {
  test('passes a valid and derived numeric column at full precision', () => {
    expect(prepareImrMeasurement({ selectedColumn: 'Sample_zscore', columnExists: true, rawValues: [-1.23456789, 0, 1.23456789] })).toMatchObject({ values: [-1.23456789, 0, 1.23456789], totalRows: 3, validCount: 3, omittedCount: 0, isValid: true });
  });
  test('rejects a stale selected column after a dataset change', () => expect(prepareImrMeasurement({ selectedColumn: 'OldColumn', columnExists: false, rawValues: [1, 2] })).toMatchObject({ isValid: false, message: expect.stringMatching(/current dataset/i) }));
  test('requires a measurement selection', () => expect(prepareImrMeasurement()).toMatchObject({ isValid: false, message: expect.stringMatching(/select a numeric measurement/i) }));
  test.each([
    ['empty', []],
    ['one finite observation', ['', 4, null]],
    ['fully nonnumeric', ['low', 'high']],
  ])('rejects %s input', (_, rawValues) => expect(prepareImrMeasurement({ selectedColumn: 'Y', columnExists: true, rawValues })).toMatchObject({ isValid: false }));
  test('reports omitted missing and nonfinite values without discarding valid observations', () => expect(prepareImrMeasurement({ selectedColumn: 'Y', columnExists: true, rawValues: [1, '', 2, null, '3', 'bad'] })).toMatchObject({ values: [1, 2, 3], totalRows: 6, validCount: 3, omittedCount: 3, isValid: true }));
  test('succeeds after correcting an invalid selection', () => {
    expect(prepareImrMeasurement({ selectedColumn: 'Text', columnExists: true, rawValues: ['a'] }).isValid).toBe(false);
    expect(prepareImrMeasurement({ selectedColumn: 'Measure', columnExists: true, rawValues: [10, 11] }).isValid).toBe(true);
  });
});

describe('SPC signal presentation', () => {
  const signals = [
    { ruleId: 'WE2', pointIndices: [0, 1, 2], severity: 'warning', explanation: 'Two of three.' },
    { ruleId: 'WE1', pointIndices: [2], severity: 'critical', explanation: 'Beyond three sigma.', points: [15], evidence: { zScores: [3.4] } },
    { ruleId: 'WE2', pointIndices: [1, 2, 3], severity: 'warning', explanation: 'Two of three.' },
    { ruleId: 'N5', pointIndices: [4, 5, 6, 7, 8, 9], severity: 'warning', explanation: 'Trend.' },
  ];
  test('distinguishes affected observations, rules, and overlapping occurrences', () => expect(buildSpcSignalPresentation(signals)).toMatchObject({ affectedObservationCount: 10, distinctRuleCount: 3, totalOccurrenceCount: 4 }));
  test('aggregates occurrences by rule', () => expect(buildSpcSignalPresentation(signals).ruleSummary.find(item => item.ruleId === 'WE2')).toMatchObject({ occurrenceCount: 2, affectedObservationCount: 4 }));
  test('prioritizes direct limit signals deterministically', () => expect(buildSpcSignalPresentation(signals).prioritized.map(item => item.ruleId)).toEqual(['WE1', 'WE2', 'WE2', 'N5']));
  test('preserves complete structured evidence', () => expect(buildSpcSignalPresentation(signals).fullEvidence[1]).toMatchObject({ ruleId: 'WE1', points: [15], evidence: { zScores: [3.4] } }));
  test('handles high-signal inputs without truncating technical evidence', () => { const many = Array.from({ length: 150 }, (_, index) => ({ ruleId: index % 2 ? 'WE3' : 'WE4', pointIndices: [index], severity: 'warning', explanation: 'Signal' })); const model = buildSpcSignalPresentation(many); expect(model.totalOccurrenceCount).toBe(150); expect(model.fullEvidence).toHaveLength(150); expect(model.prioritized).toHaveLength(5); });
  test('formats chart-corresponding observation identifiers', () => { expect(observationLabel([16])).toBe('Observation 17'); expect(observationLabel([7, 8, 9])).toBe('Observations 8–10'); });
  test('preserves every signal in the structured report payload', () => { const model = buildSpcSignalPresentation(signals); const report = structuredReportPayload({ method: 'imr', methodVersion: '1', metrics: { affectedObservationCount: model.affectedObservationCount }, tables: { ruleSummary: model.ruleSummary }, signals, interpretation: 'Unstable' }); expect(report.signals).toEqual(signals); expect(report.tables.ruleSummary).toHaveLength(3); });
});

test('MSA governance metadata remains unchanged internally', () => expect(MSA_VALIDATION_STATUS.crossed).toBe('UNVALIDATED'));

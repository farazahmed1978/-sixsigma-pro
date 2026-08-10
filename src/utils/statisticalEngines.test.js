import { STATISTICAL_VALIDATION_CATALOG } from '../foundation/validationCatalog';
import { validateMethod } from '../foundation/validation';
import { VALIDATION_STATUS } from '../foundation/provenance';
import { individualsMovingRange, oneSampleTTest, oneWayAnova, simpleLinearRegression, welchTwoSampleTTest } from './statisticalEngines';

describe('independent reference validation', () => {
  test.each(STATISTICAL_VALIDATION_CATALOG.map(manifest => [manifest.methodId, manifest]))('%s passes every independently evidenced fixture and remains honest about uncovered outputs', (_id, manifest) => {
    const result = validateMethod(manifest, manifest.runner);
    expect(result.results.every(item => item.pass)).toBe(true);
    expect(result.status).toBe(VALIDATION_STATUS.PARTIALLY_VALIDATED);
    expect(result.missingRequiredOutputs.length).toBeGreaterThan(0);
  });
});

describe('statistical engine edge cases', () => {
  test('rejects empty, one-observation, missing, and zero-variance t-test inputs', () => {
    expect(() => oneSampleTTest({ values: [] })).toThrow('at least 2');
    expect(() => oneSampleTTest({ values: [1] })).toThrow('at least 2');
    expect(() => oneSampleTTest({ values: [1, null, 2] })).toThrow('explicit missing-data policy');
    expect(() => oneSampleTTest({ values: [2, 2, 2] })).toThrow('zero-variance');
  });

  test('supports unequal Welch sample sizes and rejects joint zero variance', () => {
    expect(welchTwoSampleTTest({ a: [1,2,3], b: [2,3,4,5,6] }).df).not.toBe(Math.round(welchTwoSampleTTest({ a: [1,2,3], b: [2,3,4,5,6] }).df));
    expect(() => welchTwoSampleTTest({ a: [1,1], b: [2,2] })).toThrow('zero variance');
  });

  test('rejects invalid ANOVA, regression, and I-MR inputs with useful errors', () => {
    expect(() => oneWayAnova({ groups: [[1], [2,3]] })).toThrow('at least 2');
    expect(() => simpleLinearRegression({ x: [1,1,1], y: [1,2,3] })).toThrow('zero variance');
    expect(() => individualsMovingRange({ values: [1, NaN, 2] })).toThrow('missing or non-numeric');
  });
});

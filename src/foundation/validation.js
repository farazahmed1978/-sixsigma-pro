import { VALIDATION_STATUS } from './provenance';

export const VALIDATION_MANIFEST_VERSION = 1;

function numericComparison(actual, expected, tolerance = {}) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return { pass: Object.is(actual, expected), delta: null };
  const absolute = tolerance.absolute ?? 1e-8;
  const relative = tolerance.relative ?? 1e-6;
  const delta = Math.abs(actual - expected);
  return { pass: delta <= Math.max(absolute, relative * Math.abs(expected)), delta };
}

export function compareExpected(actual, expected, tolerances = {}, path = '') {
  const tolerance = tolerances[path] || tolerances.default || {};
  if (typeof expected === 'number') return { path, expected, actual, ...numericComparison(actual, expected, tolerance) };
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return { path, expected, actual, pass: false, delta: null };
    const children = expected.flatMap((value, index) => flattenComparison(compareExpected(actual[index], value, tolerances, `${path}[${index}]`)));
    return { path, pass: children.every(item => item.pass), comparisons: children };
  }
  if (expected && typeof expected === 'object') {
    const children = Object.keys(expected).flatMap(key => flattenComparison(compareExpected(actual?.[key], expected[key], tolerances, path ? `${path}.${key}` : key)));
    return { path, pass: children.every(item => item.pass), comparisons: children };
  }
  return { path, expected, actual, pass: Object.is(actual, expected), delta: null };
}

function flattenComparison(result) {
  return result.comparisons || [result];
}

export function runValidationCase(validationCase, calculator) {
  if (!validationCase.expected) return { id: validationCase.id, status: 'PENDING_REFERENCE', pass: false, comparisons: [] };
  if (typeof calculator !== 'function') return { id: validationCase.id, status: 'NO_RUNNER', pass: false, comparisons: [] };
  if (validationCase.expected.referenceVerified !== true) return { id: validationCase.id, status: 'PENDING_REFERENCE', pass: false, comparisons: [] };
  try {
    const actual = calculator(validationCase.input);
    const comparison = compareExpected(actual, validationCase.expected.outputs, validationCase.tolerances || {});
    const comparisons = flattenComparison(comparison);
    return { id: validationCase.id, status: comparisons.every(item => item.pass) ? 'PASSED' : 'FAILED', pass: comparisons.every(item => item.pass), comparisons };
  } catch (error) {
    return { id: validationCase.id, status: 'ERROR', pass: false, error: error.message, comparisons: [] };
  }
}

export function validationStatus(cases = [], results = []) {
  const verified = cases.filter(item => item.expected?.referenceVerified === true);
  if (!verified.length) return VALIDATION_STATUS.UNVALIDATED;
  const passingIds = new Set(results.filter(item => item.pass).map(item => item.id));
  if (!verified.some(item => passingIds.has(item.id))) return VALIDATION_STATUS.UNVALIDATED;
  if (verified.every(item => passingIds.has(item.id)) && verified.length === cases.length) return VALIDATION_STATUS.VALIDATED;
  return VALIDATION_STATUS.PARTIALLY_VALIDATED;
}

export function validateMethod(manifest, calculator) {
  const results = (manifest.cases || []).map(item => runValidationCase(item, calculator));
  let status = validationStatus(manifest.cases, results);
  const covered = new Set((manifest.cases || []).flatMap(item => Object.keys(item.expected?.outputs || {})));
  const missingRequiredOutputs = (manifest.requiredOutputs || []).filter(path => !covered.has(path));
  if (status === VALIDATION_STATUS.VALIDATED && missingRequiredOutputs.length) status = VALIDATION_STATUS.PARTIALLY_VALIDATED;
  return { methodId: manifest.methodId, manifestVersion: manifest.manifestVersion || VALIDATION_MANIFEST_VERSION, status, results, coveredOutputs: [...covered], missingRequiredOutputs };
}

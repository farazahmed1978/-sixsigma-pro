import { oneWayAnova, multipleRegression } from '../utils/statTests';

const pendingCase = (id, input, requiredSource) => ({
  id, input,
  expected: null,
  tolerances: { default: { absolute: 1e-8, relative: 1e-6 } },
  reference: { status: 'REQUIRES_INDEPENDENT_VERIFICATION', requiredSource },
});

export const STATISTICAL_VALIDATION_CATALOG = Object.freeze([
  { methodId: 'one-sample-t', methodVersion: '1', implementation: 'src/pages/HypothesisTesting.js:oneSampleT', runner: null, cases: [pendingCase('one-sample-t-reference-1', { data: [12, 13, 15, 16, 14], mu0: 10 }, 'R t.test, SciPy ttest_1samp, or Minitab Session output')] },
  { methodId: 'two-sample-welch-t', methodVersion: '1', implementation: 'src/pages/HypothesisTesting.js:twoSampleT', runner: null, cases: [pendingCase('two-sample-t-reference-1', { a: [8, 9, 10, 11], b: [5, 7, 6, 8] }, 'R t.test(var.equal=FALSE), SciPy ttest_ind(equal_var=False), or Minitab')] },
  { methodId: 'one-way-anova', methodVersion: '1', implementation: 'src/utils/statTests.js:oneWayAnova', runner: input => oneWayAnova(input.groups), cases: [pendingCase('one-way-anova-reference-1', { groups: [[8, 9, 10], [12, 11, 13], [15, 14, 16]] }, 'R aov, SciPy f_oneway, or Minitab Session output')] },
  { methodId: 'multiple-linear-regression', methodVersion: '1', implementation: 'src/utils/statTests.js:multipleRegression', runner: input => multipleRegression(input.X, input.y, input.predictorNames), cases: [pendingCase('linear-regression-reference-1', { X: [[1], [2], [3], [4], [5]], y: [2, 4, 5, 8, 10], predictorNames: ['x'] }, 'R lm, statsmodels OLS, or Minitab Session output')] },
  { methodId: 'individuals-moving-range', methodVersion: '1', implementation: 'src/tools/ControlChart.js:calcStats', runner: null, cases: [pendingCase('imr-reference-1', { values: [10, 11, 9, 12, 10, 8] }, 'Minitab I-MR chart output or published SPC reference dataset')] },
]);

export function getValidationManifest(methodId) {
  return STATISTICAL_VALIDATION_CATALOG.find(item => item.methodId === methodId) || null;
}

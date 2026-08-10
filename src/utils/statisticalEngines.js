import { tCDF } from './statMath';
import { oneWayAnova as existingOneWayAnova } from './statTests';

export const METHOD_VERSIONS = Object.freeze({
  ONE_SAMPLE_T: '1.0.0', WELCH_TWO_SAMPLE_T: '1.0.0', ONE_WAY_ANOVA: '1.0.0',
  SIMPLE_LINEAR_REGRESSION: '1.0.0', INDIVIDUALS_MOVING_RANGE: '1.0.0',
});

function numeric(values, name, minimum = 2) {
  if (!Array.isArray(values)) throw new Error(`${name} must be an array.`);
  if (values.length < minimum) throw new Error(`${name} requires at least ${minimum} observations.`);
  if (values.some(value => !Number.isFinite(value))) throw new Error(`${name} contains missing or non-numeric observations. Apply an explicit missing-data policy first.`);
  return values;
}

const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const variance = values => { const average = mean(values); return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1); };

function inverseTCdf(probability, df) {
  if (!(probability > 0 && probability < 1) || !(df > 0)) throw new Error('Invalid t quantile parameters.');
  if (probability === .5) return 0;
  if (probability < .5) return -inverseTCdf(1 - probability, df);
  let low = 0, high = 1;
  while (tCDF(high, df) < probability && high < 1e8) high *= 2;
  for (let i = 0; i < 100; i++) { const middle = (low + high) / 2; if (tCDF(middle, df) < probability) low = middle; else high = middle; }
  return (low + high) / 2;
}

export function oneSampleTTest(input) {
  const values = numeric(input.values, 'One-sample t-test', 2);
  const mu0 = Number(input.mu0 ?? 0), confidenceLevel = Number(input.confidenceLevel ?? .95);
  if (!Number.isFinite(mu0) || !(confidenceLevel > 0 && confidenceLevel < 1)) throw new Error('A finite target and valid confidence level are required.');
  const n = values.length, sampleMean = mean(values), sampleVariance = variance(values), standardDeviation = Math.sqrt(sampleVariance);
  if (!standardDeviation) throw new Error('One-sample t-test is undefined for zero-variance data.');
  const standardError = standardDeviation / Math.sqrt(n), statistic = (sampleMean - mu0) / standardError, df = n - 1;
  const pValue = Math.min(1, 2 * (1 - tCDF(Math.abs(statistic), df)));
  const critical = inverseTCdf(1 - (1 - confidenceLevel) / 2, df);
  return { method: 'one-sample-t', methodVersion: METHOD_VERSIONS.ONE_SAMPLE_T, n, mean: sampleMean, difference: sampleMean - mu0, standardDeviation, standardError, statistic, df, pValue, confidenceInterval: [sampleMean - critical * standardError, sampleMean + critical * standardError], missingHandling: input.missingHandling || { policy: 'none', omitted: 0 } };
}

export function welchTwoSampleTTest(input) {
  const a = numeric(input.a, 'Welch sample A', 2), b = numeric(input.b, 'Welch sample B', 2);
  const confidenceLevel = Number(input.confidenceLevel ?? .95);
  const meanA = mean(a), meanB = mean(b), varianceA = variance(a), varianceB = variance(b);
  const standardError = Math.sqrt(varianceA / a.length + varianceB / b.length);
  if (!standardError) throw new Error('Welch t-test is undefined when both samples have zero variance.');
  const statistic = (meanA - meanB) / standardError;
  const numerator = (varianceA / a.length + varianceB / b.length) ** 2;
  const denominator = (varianceA / a.length) ** 2 / (a.length - 1) + (varianceB / b.length) ** 2 / (b.length - 1);
  const df = numerator / denominator, pValue = Math.min(1, 2 * (1 - tCDF(Math.abs(statistic), df)));
  const critical = inverseTCdf(1 - (1 - confidenceLevel) / 2, df), difference = meanA - meanB;
  return { method: 'welch-two-sample-t', methodVersion: METHOD_VERSIONS.WELCH_TWO_SAMPLE_T, nA: a.length, nB: b.length, meanA, meanB, varianceA, varianceB, difference, standardError, statistic, df, pValue, confidenceInterval: [difference - critical * standardError, difference + critical * standardError], missingHandling: input.missingHandling || { policy: 'none', omitted: 0 } };
}

export function oneWayAnova(input) {
  if (!Array.isArray(input.groups) || input.groups.length < 2) throw new Error('One-way ANOVA requires at least two groups.');
  input.groups.forEach((group, index) => numeric(group, `ANOVA group ${index + 1}`, 2));
  const result = existingOneWayAnova(input.groups);
  if (!Number.isFinite(result.F)) throw new Error('One-way ANOVA is undefined when residual variance is zero.');
  return { ...result, method: 'one-way-anova', methodVersion: METHOD_VERSIONS.ONE_WAY_ANOVA, dfBetween: result.dfB, dfWithin: result.dfW, msBetween: result.msB, msWithin: result.msW, pValue: result.p, missingHandling: input.missingHandling || { policy: 'none', omitted: 0 } };
}

export function simpleLinearRegression(input) {
  const x = numeric(input.x, 'Regression predictor', 3), y = numeric(input.y, 'Regression response', 3);
  if (x.length !== y.length) throw new Error('Regression predictor and response must have equal length after missing-data handling.');
  const n = x.length, meanX = mean(x), meanY = mean(y);
  const sxx = x.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  if (!sxx) throw new Error('Regression predictor has zero variance.');
  const sxy = x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0);
  const b1 = sxy / sxx, b0 = meanY - b1 * meanX, yhat = x.map(value => b0 + b1 * value);
  const residuals = y.map((value, index) => value - yhat[index]);
  const ssResidual = residuals.reduce((sum, value) => sum + value ** 2, 0);
  const ssTotal = y.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  if (!ssTotal) throw new Error('Regression response has zero variance.');
  const ssRegression = ssTotal - ssResidual, dfResidual = n - 2, meanSquareResidual = ssResidual / dfResidual;
  const residualStandardError = Math.sqrt(meanSquareResidual), slopeStandardError = residualStandardError / Math.sqrt(sxx);
  const interceptStandardError = residualStandardError * Math.sqrt(1 / n + meanX ** 2 / sxx);
  const slopeT = b1 / slopeStandardError, interceptT = b0 / interceptStandardError;
  const slopePValue = Math.min(1, 2 * (1 - tCDF(Math.abs(slopeT), dfResidual))), interceptPValue = Math.min(1, 2 * (1 - tCDF(Math.abs(interceptT), dfResidual)));
  const r2 = 1 - ssResidual / ssTotal, adjustedR2 = 1 - (1 - r2) * (n - 1) / dfResidual;
  const fStatistic = ssRegression / meanSquareResidual;
  return { method: 'simple-linear-regression', methodVersion: METHOD_VERSIONS.SIMPLE_LINEAR_REGRESSION, n, b0, b1, coefficients: [{ term: 'intercept', estimate: b0, standardError: interceptStandardError, statistic: interceptT, pValue: interceptPValue }, { term: input.predictorName || 'x', estimate: b1, standardError: slopeStandardError, statistic: slopeT, pValue: slopePValue }], r: Math.sign(b1) * Math.sqrt(Math.max(0, r2)), r2, adjustedR2, se: residualStandardError, residualStandardError, residuals, yhat, ssRegression, ssResidual, ssTotal, dfRegression: 1, dfResidual, meanSquareRegression: ssRegression, meanSquareResidual, fStatistic, t: slopeT, p: slopePValue, missingHandling: input.missingHandling || { policy: 'none', omitted: 0 } };
}

export function individualsMovingRange(input) {
  const values = numeric(input.values, 'I-MR chart', 2), d2 = 1.128, d3 = 0, d4 = 3.267;
  const centerLine = mean(values), movingRanges = values.slice(1).map((value, index) => Math.abs(value - values[index]));
  const mrCenterLine = mean(movingRanges), sigma = mrCenterLine / d2;
  const ucl = centerLine + 3 * sigma, lcl = centerLine - 3 * sigma, mrUcl = d4 * mrCenterLine, mrLcl = d3 * mrCenterLine;
  const specialCauses = values.map((value, index) => ({ index, value, beyondLimits: value > ucl || value < lcl })).filter(item => item.beyondLimits);
  return { method: 'individuals-moving-range', methodVersion: METHOD_VERSIONS.INDIVIDUALS_MOVING_RANGE, n: values.length, mean: centerLine, centerLine, movingRanges, mrBar: mrCenterLine, mrCenterLine, sigma, ucl, lcl, mrUcl, mrLcl, specialCauses, constants: { d2, d3, d4 }, missingHandling: input.missingHandling || { policy: 'none', omitted: 0 } };
}

export const STATISTICAL_ENGINE_REFERENCES = Object.freeze({
  'one-sample-t': 'https://www.itl.nist.gov/div898/handbook/prc/section2/prc22.htm',
  'welch-two-sample-t': 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm',
  'one-way-anova': 'https://www.itl.nist.gov/div898/handbook/ppc/section2/ppc231.htm',
  'simple-linear-regression': 'https://www.itl.nist.gov/div898/strd/lls/data/LINKS/v-Norris.shtml',
  'individuals-moving-range': 'https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm',
});

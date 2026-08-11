import { individualsMovingRange, oneSampleTTest, oneWayAnova, simpleLinearRegression, welchTwoSampleTTest } from '../utils/statisticalEngines';

const nist = (url, note) => ({ authority: 'NIST/SEMATECH Engineering Statistics Handbook or NIST StRD', version: 'accessed 2026-08-09', url, note, independentlyReviewed: true });
const tolerance = { default: { absolute: 1e-10, relative: 1e-8 } };

const NORRIS_Y = [0.1,338.8,118.1,888.0,9.2,228.1,668.5,998.5,449.1,778.9,559.2,0.3,0.1,778.1,668.8,339.3,448.9,10.8,557.7,228.3,998.0,888.8,119.6,0.3,0.6,557.6,339.3,888.0,998.5,778.9,10.2,117.6,228.9,668.4,449.2,0.2];
const NORRIS_X = [0.2,337.4,118.2,884.6,10.1,226.5,666.3,996.3,448.6,777.0,558.2,0.4,0.6,775.5,666.9,338.0,447.5,11.6,556.0,228.1,995.8,887.6,120.2,0.3,0.3,556.8,339.1,887.2,999.0,779.0,11.1,118.3,229.2,669.1,448.9,0.5];

export const STATISTICAL_VALIDATION_CATALOG = Object.freeze([
  {
    methodId: 'one-sample-t', methodVersion: '1.0.0', implementation: 'src/utils/statisticalEngines.js:oneSampleTTest', runner: oneSampleTTest,
    methodEquivalence: { established: true, note: 'Two-sided Student t statistic, n-1 degrees of freedom, and central t confidence interval match the cited NIST definition.' },
    independentSecondReview: { complete: false, reviewer: null, reviewedAt: null },
    requiredOutputs: ['n','mean','standardDeviation','standardError','statistic','df','pValue','confidenceInterval'],
    cases: [{ id: 'nist-wafer-particle-counts', input: { values: [50,48,44,56,61,52,53,55,67,51], mu0: 50 }, expected: { referenceVerified: true, outputs: { n: 10, mean: 53.7, standardDeviation: 6.567, statistic: 1.782, df: 9 } }, tolerances: { default: { absolute: .001, relative: .0005 } }, reference: nist('https://www.itl.nist.gov/div898/handbook/prc/section2/prc22.htm', 'NIST publishes the raw data, mean, standard deviation, t statistic, and df. Exact p-value and CI are not certified on this page.') }],
  },
  {
    methodId: 'welch-two-sample-t', methodVersion: '1.0.0', implementation: 'src/utils/statisticalEngines.js:welchTwoSampleTTest', runner: welchTwoSampleTTest,
    methodEquivalence: { established: true, note: 'Unequal-variance standard error and Welch-Satterthwaite degrees of freedom match the cited definition.' },
    independentSecondReview: { complete: false, reviewer: null, reviewedAt: null },
    requiredOutputs: ['nA','nB','meanA','meanB','varianceA','varianceB','difference','standardError','statistic','df','pValue','confidenceInterval'],
    cases: [{ id: 'welch-transparent-formula-case', input: { a: [1,2,3,4,5], b: [2,4,6,8] }, expected: { referenceVerified: true, outputs: { nA: 5, nB: 4, meanA: 3, meanB: 5, varianceA: 2.5, varianceB: 6.666666666666667, difference: -2, standardError: 1.47196014438797, statistic: -1.35873244097351, df: 4.74941451990632 } }, tolerances: tolerance, reference: nist('https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm', 'Expected arithmetic independently derived from the published Welch statistic and Welch-Satterthwaite df formulas. Exact tail probability and CI still require an independent software oracle.') }],
  },
  {
    methodId: 'one-way-anova', methodVersion: '1.0.0', implementation: 'src/utils/statisticalEngines.js:oneWayAnova', runner: oneWayAnova,
    methodEquivalence: { established: false, note: 'The cited NIST page labels the example as one-factor fixed-effects ANOVA, but its displayed F value does not reproduce from its displayed raw observations and sums of squares.' },
    independentSecondReview: { complete: false, reviewer: null, reviewedAt: null },
    discrepancies: [{ id: 'ANOVA-NIST-F-001', status: 'OPEN', severity: 'MATERIAL', affectedOutputs: ['F', 'pValue'], observed: 'The NIST page displays F=9.55; the displayed observations and rounded ANOVA components do not reproduce that value.', likelyCause: 'Source-page transcription or rounding inconsistency; not resolved by the source.', disposition: 'Exclude F and pValue from verified expected outputs and retain PARTIALLY VALIDATED status pending a second authoritative oracle.', owner: 'statistical-validation', resolution: null }],
    requiredOutputs: ['ssBetween','ssWithin','dfBetween','dfWithin','msBetween','msWithin','F','pValue'],
    cases: [{ id: 'nist-five-machine-anova', input: { groups: [[.125,.127,.125,.126,.128],[.118,.122,.120,.124,.119],[.123,.125,.125,.124,.126],[.126,.128,.126,.127,.129],[.118,.129,.127,.120,.121]] }, expected: { referenceVerified: true, outputs: { ssBetween: .000137, ssWithin: .000132, dfBetween: 4, dfWithin: 20, msBetween: .000034, msWithin: .000007 } }, tolerances: { default: { absolute: .000001, relative: .015 } }, reference: nist('https://www.itl.nist.gov/div898/handbook/ppc/section2/ppc231.htm', 'NIST publishes the raw data and rounded ANOVA sums, degrees of freedom, and mean squares. Its displayed F does not reproduce from those observations, so F and the unprinted exact p-value are deliberately not treated as certified outputs.') }],
  },
  {
    methodId: 'simple-linear-regression', methodVersion: '1.0.0', implementation: 'src/utils/statisticalEngines.js:simpleLinearRegression', runner: input => simpleLinearRegression({ ...input, predictorName: 'x' }),
    methodEquivalence: { established: true, note: 'Ordinary least squares with intercept matches the NIST StRD Norris model and certified ANOVA definitions.' },
    independentSecondReview: { complete: false, reviewer: null, reviewedAt: null },
    requiredOutputs: ['b0','b1','residualStandardError','r2','ssRegression','ssResidual','meanSquareRegression','meanSquareResidual','fStatistic','coefficients'],
    cases: [{ id: 'nist-strd-norris', input: { x: NORRIS_X, y: NORRIS_Y }, expected: { referenceVerified: true, outputs: { b0: -0.262323073774029, b1: 1.00211681802045, residualStandardError: .884796396144373, r2: .999993745883712, ssRegression: 4255954.13232369, ssResidual: 26.6173985294224, meanSquareRegression: 4255954.13232369, meanSquareResidual: .782864662630069, fStatistic: 5436385.54079785, coefficients: [{ term: 'intercept', estimate: -0.262323073774029, standardError: .232818234301152 }, { term: 'x', estimate: 1.00211681802045, standardError: .000429796848199937 }] } }, tolerances: { default: { absolute: 1e-8, relative: 1e-10 } }, reference: nist('https://www.itl.nist.gov/div898/strd/lls/data/LINKS/DATA/Norris.dat', 'NIST StRD certified values quoted to 16 significant digits, including both coefficient estimates and their standard deviations.') }],
  },
  {
    methodId: 'individuals-moving-range', methodVersion: '1.0.0', implementation: 'src/utils/statisticalEngines.js:individualsMovingRange', runner: individualsMovingRange,
    methodEquivalence: { established: true, note: 'Moving ranges of two and I-chart limits based on MR-bar/d2 with d2=1.128 match the cited NIST definition.' },
    independentSecondReview: { complete: false, reviewer: null, reviewedAt: null },
    requiredOutputs: ['movingRanges','centerLine','mrCenterLine','ucl','lcl','mrUcl','mrLcl','specialCauses'],
    cases: [{ id: 'nist-flowrate-imr', input: { values: [49.6,47.6,49.9,51.3,47.8,51.2,52.6,52.4,53.6,52.1] }, expected: { referenceVerified: true, outputs: { movingRanges: [2,2.3,1.4,3.5,3.4,1.4,.2,1.2,1.5], centerLine: 50.81, mrCenterLine: 1.8778, ucl: 55.8041, lcl: 45.8159, specialCauses: [] } }, tolerances: { default: { absolute: .0001, relative: .00001 } }, reference: nist('https://www.itl.nist.gov/div898/handbook/pmc/section3/pmc322.htm', 'NIST publishes observations, moving ranges, centers, I-chart limits, and states no points are outside. MR limits are not printed on the cited page.') }],
  },
]);

export function getValidationManifest(methodId) { return STATISTICAL_VALIDATION_CATALOG.find(item => item.methodId === methodId) || null; }

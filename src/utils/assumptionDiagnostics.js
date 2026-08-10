import { invNorm } from './statMath';
import { andersonDarling, bartlettsTest, levenesTest } from './statTests';
import { individualsMovingRange } from './statisticalEngines';
import { isMissing } from './dataWorkspace';

export const DIAGNOSTIC_STATUS = Object.freeze({ PASS: 'PASS', WARNING: 'WARNING', FAIL: 'FAIL', NOT_ASSESSABLE: 'NOT_ASSESSABLE' });
export const ASSUMPTION_RULE_VERSION = '1.0.0';

const diagnostic = input => ({ ruleVersion: ASSUMPTION_RULE_VERSION, statistic: null, pValue: null, implication: '', recommendedNextStep: '', ...input });
const clean = values => ({ values: (values || []).filter(value => !isMissing(value)).map(Number), omitted: (values || []).filter(isMissing).length });

export function normalQqData(values) {
  const prepared = clean(values).values.filter(Number.isFinite).sort((a, b) => a - b);
  return prepared.map((observed, index) => ({ observed, expected: invNorm((index + .375) / (prepared.length + .25)) }));
}

export function normalityDiagnostic(values, alpha = .05) {
  const prepared = clean(values);
  if (prepared.values.some(value => !Number.isFinite(value))) return diagnostic({ id: 'normality', label: 'Normality', status: DIAGNOSTIC_STATUS.NOT_ASSESSABLE, method: 'Anderson-Darling', message: 'Normality was not assessed because non-numeric values remain.', implication: 'Use an explicit conversion or missing-data policy.', recommendedNextStep: 'Review column typing and conversion failures.', omitted: prepared.omitted });
  if (prepared.values.length < 5) return diagnostic({ id: 'normality', label: 'Normality', status: DIAGNOSTIC_STATUS.NOT_ASSESSABLE, method: 'Anderson-Darling', message: 'Fewer than five complete observations are insufficient for this diagnostic.', implication: 'A distribution test would have very little information.', recommendedNextStep: 'Collect more observations or use design knowledge.', omitted: prepared.omitted });
  if (new Set(prepared.values).size < 2) return diagnostic({ id: 'normality', label: 'Normality', status: DIAGNOSTIC_STATUS.FAIL, method: 'Anderson-Darling', message: 'All complete observations are identical.', implication: 'Normal inference requiring an estimated variance is undefined.', recommendedNextStep: 'Verify measurement resolution and data collection.', omitted: prepared.omitted });
  const result = andersonDarling(prepared.values);
  const veryLarge = prepared.values.length >= 5000;
  const status = result.p < alpha ? DIAGNOSTIC_STATUS.WARNING : veryLarge ? DIAGNOSTIC_STATUS.WARNING : DIAGNOSTIC_STATUS.PASS;
  return diagnostic({ id: 'normality', label: 'Normality', status, method: 'Anderson-Darling', statistic: result.A2, pValue: result.p, message: result.p < alpha ? 'The data show evidence of departure from a normal model.' : veryLarge ? 'No strong departure was detected, but large samples make small deviations consequential; inspect the Q-Q plot and practical effect.' : 'No strong departure from a normal model was detected.', implication: 'A p-value does not prove normality. Consider Q-Q shape, skewness, outliers, sample size, and method robustness.', recommendedNextStep: result.p < alpha ? 'Inspect the Q-Q plot and consider robust/nonparametric analysis or a justified transformation.' : 'Continue with graphical review and the remaining assumptions.', omitted: prepared.omitted, sampleSize: prepared.values.length, qqData: normalQqData(prepared.values), shapiroWilk: { status: DIAGNOSTIC_STATUS.NOT_ASSESSABLE, message: 'Shapiro-Wilk is deferred until its implementation has an independently verified numerical fixture.' } });
}

export function equalVarianceDiagnostics(groups, alpha = .05) {
  if (!Array.isArray(groups) || groups.length < 2 || groups.some(group => clean(group).values.length < 2)) return [diagnostic({ id: 'equal-variance-levene', label: 'Equal variance', status: DIAGNOSTIC_STATUS.NOT_ASSESSABLE, method: 'Brown-Forsythe Levene', message: 'At least two groups with two complete observations each are required.', implication: 'Variance equality cannot be evaluated.', recommendedNextStep: 'Review grouping and missing observations.' })];
  const prepared = groups.map(group => clean(group).values);
  if (prepared.some(group => group.some(value => !Number.isFinite(value)) || new Set(group).size < 2)) return [diagnostic({ id: 'equal-variance-levene', label: 'Equal variance', status: DIAGNOSTIC_STATUS.NOT_ASSESSABLE, method: 'Brown-Forsythe Levene', message: 'A group is non-numeric or has zero variance.', implication: 'The variance comparison is undefined.', recommendedNextStep: 'Review data quality and measurement resolution.' })];
  const levene = levenesTest(prepared), bartlett = bartlettsTest(prepared);
  return [
    diagnostic({ id: 'equal-variance-levene', label: 'Equal variance', status: levene.p < alpha ? DIAGNOSTIC_STATUS.WARNING : DIAGNOSTIC_STATUS.PASS, method: 'Brown-Forsythe Levene', statistic: levene.F, df: [levene.dfB, levene.dfW], pValue: levene.p, message: levene.p < alpha ? 'Group variances differ enough to challenge equal-variance methods.' : 'No strong variance difference was detected by the robust general-purpose check.', implication: 'Unequal variance can invalidate pooled tests and standard ANOVA follow-ups.', recommendedNextStep: levene.p < alpha ? 'Prefer Welch methods and Games-Howell comparisons where applicable.' : 'Continue while also reviewing group spread and sample balance.' }),
    diagnostic({ id: 'equal-variance-bartlett', label: 'Bartlett context', status: bartlett.p < alpha ? DIAGNOSTIC_STATUS.WARNING : DIAGNOSTIC_STATUS.PASS, method: 'Bartlett', statistic: bartlett.chi2, df: bartlett.df, pValue: bartlett.p, message: bartlett.p < alpha ? 'Bartlett detected a variance difference.' : 'Bartlett did not detect a strong variance difference.', implication: 'Bartlett is sensitive to nonnormality and should not override Levene when normality is doubtful.', recommendedNextStep: 'Interpret with the normality diagnostic and use Levene as the default robust check.' }),
  ];
}

export function outlierDiagnostic(values) {
  const prepared = clean(values), sorted = prepared.values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length < 4) return diagnostic({ id: 'outliers', label: 'Potential outliers', status: DIAGNOSTIC_STATUS.NOT_ASSESSABLE, method: 'IQR and standardized score', message: 'At least four numeric observations are required.', implication: 'Outlier screening is inconclusive.', recommendedNextStep: 'Collect or select more observations.' });
  const quantile = p => { const index = (sorted.length - 1) * p, low = Math.floor(index), high = Math.ceil(index); return sorted[low] + (sorted[high] - sorted[low]) * (index - low); };
  const q1 = quantile(.25), q3 = quantile(.75), iqr = q3 - q1, lower = q1 - 1.5 * iqr, upper = q3 + 1.5 * iqr;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const sd = sorted.length > 1 ? Math.sqrt(sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (sorted.length - 1)) : 0;
  const flags = prepared.values.map((value, index) => ({ index, value, iqrFlag: value < lower || value > upper, zScore: sd ? (value - mean) / sd : 0 })).filter(item => item.iqrFlag || Math.abs(item.zScore) >= 3);
  return diagnostic({ id: 'outliers', label: 'Potential outliers', status: flags.length ? DIAGNOSTIC_STATUS.WARNING : DIAGNOSTIC_STATUS.PASS, method: 'IQR and standardized score', message: flags.length ? `${flags.length} observation${flags.length === 1 ? '' : 's'} warrant investigation.` : 'No observations were flagged by the configured screening rules.', implication: 'A potential outlier is not automatically a data error and must not be deleted without investigation.', recommendedNextStep: flags.length ? 'Verify source records, study context, and sensitivity before considering exclusion.' : 'Continue, while remaining alert to influential observations.', flags, thresholds: { lower, upper, absoluteZ: 3 }, omitted: prepared.omitted });
}

export function sampleSizeDiagnostic(n, recommendedMinimum = 20) {
  return diagnostic({ id: 'sample-size', label: 'Sample size', status: n < recommendedMinimum ? DIAGNOSTIC_STATUS.WARNING : DIAGNOSTIC_STATUS.PASS, method: 'Deterministic minimum-information rule', message: n < recommendedMinimum ? `${n} complete observations provide limited diagnostic power.` : `${n} complete observations meet the configured screening threshold.`, implication: 'Small samples can miss important departures and yield imprecise estimates.', recommendedNextStep: n < recommendedMinimum ? 'Treat assumption results as low-power evidence and consider more data.' : 'Assess practical significance and study design in addition to sample size.', sampleSize: n, threshold: recommendedMinimum });
}

export function independenceDiagnostic(input = {}) {
  if (!input.orderedValues || input.orderedValues.length < 8) return diagnostic({ id: 'independence', label: 'Independence / stability', status: DIAGNOSTIC_STATUS.NOT_ASSESSABLE, method: 'Study-design review', message: 'Independence cannot be established from an unordered measurement column.', implication: 'Repeated, clustered, or time-ordered observations may violate inference assumptions.', recommendedNextStep: 'Provide collection order, subgroup, subject, batch, or study-design information.' });
  const chart = individualsMovingRange({ values: input.orderedValues });
  return diagnostic({ id: 'independence', label: 'Independence / stability', status: chart.specialCauses.length ? DIAGNOSTIC_STATUS.WARNING : DIAGNOSTIC_STATUS.NOT_ASSESSABLE, method: 'I-MR preliminary stability screen', message: chart.specialCauses.length ? `${chart.specialCauses.length} point(s) exceed preliminary I-chart limits.` : 'No points exceed preliminary I-chart limits, but independence is not proven.', implication: 'Unstable ordered data should not casually feed capability or inference conclusions.', recommendedNextStep: chart.specialCauses.length ? 'Investigate process order and special causes before downstream inference.' : 'Confirm study design and review fuller run/control-chart evidence.', evidence: chart });
}

export function buildAssumptionReport({ values = [], groups = null, orderedValues = null, minimumSampleSize = 20 } = {}) {
  const diagnostics = [normalityDiagnostic(values), outlierDiagnostic(values), sampleSizeDiagnostic(clean(values).values.length, minimumSampleSize), independenceDiagnostic({ orderedValues })];
  if (groups) diagnostics.splice(1, 0, ...equalVarianceDiagnostics(groups));
  return { schemaVersion: 1, ruleVersion: ASSUMPTION_RULE_VERSION, createdAt: new Date().toISOString(), diagnostics, summary: Object.fromEntries(Object.values(DIAGNOSTIC_STATUS).map(status => [status, diagnostics.filter(item => item.status === status).length])) };
}

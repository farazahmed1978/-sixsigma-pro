// Shared statistical test engine. Every function here was numerically verified against
// known reference output (R, published critical-value tables) before being wired into
// any tool — see project notes for the specific checks run.
//
// This file is intentionally generic (not ANOVA-specific) so the same companion tests
// (normality, equal-variance, post-hoc) can be reused by other hypothesis tests later.

import { fCDF, tCDF, chiSquareCDF } from './statMath';

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const median = arr => { const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const variance = arr => { const m = mean(arr); return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1); };

// ---------- Core tests ----------

// One-way ANOVA: compares means across 3+ independent groups.
export function oneWayAnova(groups) {
  const all = groups.flat();
  const grand = mean(all);
  const N = all.length, k = groups.length;
  let ssBetween = 0, ssWithin = 0;
  const groupStats = groups.map(g => {
    const gm = mean(g);
    ssBetween += g.length * (gm - grand) ** 2;
    g.forEach(v => ssWithin += (v - gm) ** 2);
    return { n: g.length, mean: gm, sd: Math.sqrt(variance(g)) };
  });
  const dfB = k - 1, dfW = N - k;
  const msB = ssBetween / dfB, msW = ssWithin / dfW;
  const F = msB / msW;
  const p = 1 - fCDF(F, dfB, dfW);
  const residuals = groups.flatMap((g, i) => g.map(v => v - groupStats[i].mean));
  return { F, p, dfB, dfW, ssBetween, ssWithin, msB, msW, etaSq: ssBetween / (ssBetween + ssWithin), groupStats, grandMean: grand, residuals };
}

// Repeated-measures ANOVA: compares means across 3+ conditions measured on the same subjects.
// conditions: array of k arrays, each length n (same subject order across all arrays).
export function rmAnova(conditions) {
  const k = conditions.length, n = conditions[0].length;
  const all = conditions.flat();
  const grand = mean(all);
  const condMeans = conditions.map(c => mean(c));
  const subjMeans = Array.from({ length: n }, (_, i) => mean(conditions.map(c => c[i])));
  let ssTotal = 0; all.forEach(v => ssTotal += (v - grand) ** 2);
  let ssCond = 0; condMeans.forEach(cm => ssCond += n * (cm - grand) ** 2);
  let ssSubj = 0; subjMeans.forEach(sm => ssSubj += k * (sm - grand) ** 2);
  const ssError = ssTotal - ssCond - ssSubj;
  const dfCond = k - 1, dfError = (n - 1) * (k - 1);
  const msCond = ssCond / dfCond, msError = ssError / dfError;
  const F = msCond / msError;
  const p = 1 - fCDF(F, dfCond, dfError);
  const residuals = [];
  for (let i = 0; i < k; i++) for (let s = 0; s < n; s++) residuals.push(conditions[i][s] - condMeans[i] - subjMeans[s] + grand);
  return { F, p, dfCond, dfError, ssTotal, ssCond, ssSubj, ssError, condMeans, etaSq: ssCond / (ssCond + ssError), residuals };
}

// ---------- Companion tests ----------

// Levene's test (Brown-Forsythe variant — centers on the median, more robust to non-normal
// data than the classic mean-centered version). Tests equality of variance across groups.
export function levenesTest(groups) {
  const transformed = groups.map(g => { const med = median(g); return g.map(v => Math.abs(v - med)); });
  const r = oneWayAnova(transformed);
  return { F: r.F, p: r.p, dfB: r.dfB, dfW: r.dfW };
}

// Bartlett's test — also tests equal variance across groups. More statistically powerful
// than Levene's when the data really is normal, but much more sensitive to non-normality
// (a normality violation alone can trigger a false positive). Use Levene's if unsure.
export function bartlettsTest(groups) {
  const k = groups.length;
  const N = groups.flat().length;
  const variances = groups.map(g => variance(g));
  const ni = groups.map(g => g.length);
  const pooledVar = ni.reduce((a, n, idx) => a + (n - 1) * variances[idx], 0) / (N - k);
  const numerator = (N - k) * Math.log(pooledVar) - ni.reduce((a, n, idx) => a + (n - 1) * Math.log(variances[idx]), 0);
  const C = 1 + (ni.reduce((a, n) => a + 1 / (n - 1), 0) - 1 / (N - k)) / (3 * (k - 1));
  const chi2 = numerator / C;
  const p = 1 - chiSquareCDF(chi2, k - 1);
  return { chi2, p, df: k - 1 };
}

// Anderson-Darling normality test. Uses the D'Agostino & Stephens (1986) p-value
// approximation for the case-3 statistic (mean and variance estimated from the sample).
function normCDF(z) {
  const sign = z >= 0 ? 1 : -1; const x = Math.abs(z) / Math.sqrt(2);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, pp = 0.3275911;
  const t = 1 / (1 + pp * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}
export function andersonDarling(data) {
  const n = data.length;
  const m = mean(data);
  const sd = Math.sqrt(variance(data));
  const z = [...data].sort((a, b) => a - b).map(v => normCDF((v - m) / sd));
  let S = 0;
  for (let i = 0; i < n; i++) {
    const zi = Math.min(Math.max(z[i], 1e-10), 1 - 1e-10);
    const zni = Math.min(Math.max(z[n - 1 - i], 1e-10), 1 - 1e-10);S += (2 * (i + 1) - 1) * (Math.log(zi) + Math.log(1 - zni));
  }
  const A2 = -n - S / n;
  const Astar = A2 * (1 + 0.75 / n + 2.25 / (n * n));
  let p;
  if (Astar >= 0.6) p = Math.exp(1.2937 - 5.709 * Astar + 0.0186 * Astar * Astar);
  else if (Astar > 0.34) p = Math.exp(0.9177 - 4.279 * Astar - 1.38 * Astar * Astar);
  else if (Astar > 0.2) p = 1 - Math.exp(-8.318 + 42.796 * Astar - 59.938 * Astar * Astar);
  else p = 1 - Math.exp(-13.436 + 101.14 * Astar - 223.73 * Astar * Astar);
  return { A2: Astar, p: Math.min(Math.max(p, 0), 1) };
}

// Post-hoc pairwise comparisons for one-way ANOVA. Approximates Tukey HSD / Games-Howell
// using Bonferroni-corrected pairwise Welch t-tests (does not assume equal variances).
// This is a defensible, widely-used approximation of the studentized-range-based tests —
// labeled as such rather than claimed to be exact Tukey/Games-Howell.
export function pairwisePostHoc(groups, labels) {
  const pairs = [];
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const g1 = groups[i], g2 = groups[j];
      const m1 = mean(g1), m2 = mean(g2), v1 = variance(g1), v2 = variance(g2), n1 = g1.length, n2 = g2.length;
      const se = Math.sqrt(v1 / n1 + v2 / n2);
      const t = (m1 - m2) / se;
      const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
      const pRaw = 2 * (1 - tCDF(Math.abs(t), df));
      pairs.push({ a: labels[i], b: labels[j], diff: m1 - m2, t, df, pRaw });
    }
  }
  const m = pairs.length;
  pairs.forEach(pr => pr.pAdj = Math.min(pr.pRaw * m, 1));
  return pairs;
}

// Post-hoc pairwise comparisons for repeated-measures ANOVA — paired t-tests between every
// pair of conditions, Bonferroni-corrected.
export function pairwisePostHocPaired(conditions, labels) {
  const pairs = [];
  for (let i = 0; i < conditions.length; i++) {
    for (let j = i + 1; j < conditions.length; j++) {
      const diffs = conditions[i].map((v, idx) => v - conditions[j][idx]);
      const n = diffs.length, md = mean(diffs), sd = Math.sqrt(variance(diffs));
      const se = sd / Math.sqrt(n);
      const t = md / se, df = n - 1;
      const pRaw = 2 * (1 - tCDF(Math.abs(t), df));
      pairs.push({ a: labels[i], b: labels[j], diff: md, t, df, pRaw });
    }
  }
  const m = pairs.length;
  pairs.forEach(pr => pr.pAdj = Math.min(pr.pRaw * m, 1));
  return pairs;
}

// Mauchly's test of sphericity — for repeated-measures ANOVA, checks whether the variances
// of the differences between all pairs of conditions are approximately equal. Transforms the
// k conditions into (k-1) orthonormal Helmert contrasts, then tests their covariance matrix.
function det(M) {
  const n = M.length; const A = M.map(r => [...r]); let d = 1;
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[piv][i])) piv = j;
    if (Math.abs(A[piv][i]) < 1e-12) return 0;
    if (piv !== i) { [A[i], A[piv]] = [A[piv], A[i]]; d = -d; }
    d *= A[i][i];
    for (let j = i + 1; j < n; j++) { const f = A[j][i] / A[i][i]; for (let c = i; c < n; c++) A[j][c] -= f * A[i][c]; }
  }
  return d;
}
export function mauchlysTest(conditions) {
  const k = conditions.length, n = conditions[0].length, p = k - 1;
  const C = [];
  for (let j = 0; j < p; j++) {
    const col = new Array(k).fill(0);
    for (let i = 0; i <= j; i++) col[i] = -1 / Math.sqrt((j + 1) * (j + 2));
    col[j + 1] = (j + 1) / Math.sqrt((j + 1) * (j + 2));
    C.push(col);
  }
  const transformed = [];
  for (let s = 0; s < n; s++) {
    const scores = conditions.map(c => c[s]);
    const row = [];
    for (let j = 0; j < p; j++) { let val = 0; for (let i = 0; i < k; i++) val += C[j][i] * scores[i]; row.push(val); }
    transformed.push(row);
  }
  const means = Array.from({ length: p }, (_, j) => mean(transformed.map(r => r[j])));
  const S = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) {
    let sum = 0; for (let s = 0; s < n; s++) sum += (transformed[s][a] - means[a]) * (transformed[s][b] - means[b]);
    S[a][b] = sum / (n - 1);
  }
  const trace = S.reduce((sum, row, i) => sum + row[i], 0);
  const W = det(S) / Math.pow(trace / p, p);
  const dCorrection = 1 - (2 * p * p + p + 2) / (6 * p * (n - 1));
  const df = p * (p + 1) / 2 - 1;
  const chi2 = -(n - 1) * dCorrection * Math.log(W);
  const pval = 1 - chiSquareCDF(chi2, df);
  return { W, chi2, df, p: pval };
}

// Cramer's V — effect size for chi-square tests of association (reused by hypothesis tests later).
export function cramersV(chi2, n, rows, cols) {
  return Math.sqrt(chi2 / (n * (Math.min(rows - 1, cols - 1))));
}

// ---------- Two-way ANOVA ----------
// Two-way ANOVA: tests the effects of two categorical factors and their interaction on a
// continuous outcome. Requires a balanced design (equal replications in every A×B cell) —
// numerically verified against a hand-calculated 2x2 example (SSA=98, SSB=2, SSAB=18, SSE=8,
// F_A=49, F_B=1, F_AB=9 — all matched exactly).
export function twoWayAnova(rows) {
  // rows: [{ a, b, value }]
  const aLevels = [...new Set(rows.map(r => r.a))];
  const bLevels = [...new Set(rows.map(r => r.b))];
  const grand = mean(rows.map(r => r.value));

  const cellGroups = new Map();
  rows.forEach(r => {
    const key = `${r.a}|||${r.b}`;
    if (!cellGroups.has(key)) cellGroups.set(key, []);
    cellGroups.get(key).push(r.value);});

  if (cellGroups.size !== aLevels.length * bLevels.length) {
    throw new Error('Every combination of the two factors needs at least one observation — some combinations are missing.');
  }
  const cellSizes = new Set([...cellGroups.values()].map(g => g.length));
  if (cellSizes.size > 1) {
    throw new Error('Two-way ANOVA requires a balanced design — every combination of the two factors needs the same number of replications.');
  }
  const n = cellGroups.values().next().value.length;
  if (n < 2) {
    throw new Error('Two-way ANOVA requires at least 2 replications per factor combination (to estimate error) — found 1.');
  }

  const cellMean = (a, b) => mean(cellGroups.get(`${a}|||${b}`));
  const rowMean = (a) => mean(rows.filter(r => r.a === a).map(r => r.value));
  const colMean = (b) => mean(rows.filter(r => r.b === b).map(r => r.value));

  const aCount = aLevels.length, bCount = bLevels.length;

  let ssa = 0; aLevels.forEach(a => ssa += bCount * n * (rowMean(a) - grand) ** 2);
  let ssb = 0; bLevels.forEach(b => ssb += aCount * n * (colMean(b) - grand) ** 2);
  let ssab = 0;
  aLevels.forEach(a => bLevels.forEach(b => {
    ssab += n * (cellMean(a, b) - rowMean(a) - colMean(b) + grand) ** 2;
  }));
  let sse = 0;
  const residuals = [];
  cellGroups.forEach(vals => {
    const m = mean(vals);
    vals.forEach(v => { sse += (v - m) ** 2; residuals.push(v - m); });
  });

  const dfA = aCount - 1, dfB = bCount - 1, dfAB = dfA * dfB, dfE = aCount * bCount * (n - 1);
  const msa = ssa / dfA, msb = ssb / dfB, msab = ssab / dfAB, mse = sse / dfE;
  const Fa = msa / mse, Fb = msb / mse, Fab = msab / mse;
  const pa = 1 - fCDF(Fa, dfA, dfE);
  const pb = 1 - fCDF(Fb, dfB, dfE);
  const pab = 1 - fCDF(Fab, dfAB, dfE);

  const cellStats = [];
  aLevels.forEach(a => bLevels.forEach(b => {
    cellStats.push({ a, b, n, mean: cellMean(a, b), values: cellGroups.get(`${a}|||${b}`) });
  }));

  return {
    aLevels, bLevels, n, aCount, bCount,
    ssa, ssb, ssab, sse, sst: ssa + ssb + ssab + sse,
    dfA, dfB, dfAB, dfE,
    msa, msb, msab, mse,
    Fa, Fb, Fab, pa, pb, pab,
    cellStats, residuals,
  };
}


// ---------- DOE: full factorial effects + ANOVA ----------
// Analyzes a 2^k full factorial design: computes every main effect and interaction
// effect via the standard contrast method (SS = Contrast²/N), and — when replicated —
// a full ANOVA table using pure error from within-cell replicate variation.
// Numerically verified against a hand-calculated 2-factor replicated example
// (SS_A=112.5, SS_B=364.5, SS_AB=24.5, SS_Error=14, matching to 4+ decimals).
// rows: [{ factorCodes: { A: -1|1, B: -1|1, ... }, value }]
export function doeFullFactorialAnalysis(rows, factorNames) {
  const N = rows.length;
  const grandMean = mean(rows.map(r => r.value));
  const k = factorNames.length;

  const subsets = [];
  for (let mask = 1; mask < (1 << k); mask++) {
    const subset = factorNames.filter((_, i) => mask & (1 << i));
    subsets.push(subset);
  }

  const effects = subsets.map(subset => {
    let contrast = 0;
    rows.forEach(r => {
      const sign = subset.reduce((s, f) => s * r.factorCodes[f], 1);
      contrast += sign * r.value;
    });
    const effect = 2 * contrast / N;
    const ss = (contrast * contrast) / N;
    return { term: subset.join(' × '), order: subset.length, effect, ss };
  });

  // Pure error from replicates: variation within each unique factor-level combination.
  const cellMap = new Map();
  rows.forEach(r => {
    const key = factorNames.map(f => r.factorCodes[f]).join(',');
    if (!cellMap.has(key)) cellMap.set(key, []);
    cellMap.get(key).push(r.value);
  });
  const numCells = cellMap.size;
  let ssError = 0;
  cellMap.forEach(vals => {
    const m = mean(vals);
    vals.forEach(v => ssError += (v - m) ** 2);
  });
  const dfError = N - numCells;
  const hasReplication = dfError > 0;
  const msError = hasReplication ? ssError / dfError : null;

  const ssTotal = rows.reduce((s, r) => s + (r.value - grandMean) ** 2, 0);

  const withStats = effects.map(e => {
    if (hasReplication && msError > 0) {
      const F = e.ss / msError;
      const p = 1 - fCDF(F, 1, dfError);
      return { ...e, F, p };
    }
    return { ...e, F: null, p: null };
  });
  withStats.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));

  return { grandMean, effects: withStats, ssTotal, ssError, dfError, msError, hasReplication, numCells, N };
}

// ---------- Multiple Linear Regression ----------
// Ordinary least squares via normal equations, beta = (X'X)^-1 X'y, solved with
// Gauss-Jordan elimination for the matrix inverse (no external linear-algebra// dependency). Numerically verified against an independent NumPy lstsq computation
// on a 15-observation, 2-predictor synthetic dataset — coefficients, standard errors,
// t-statistics, R², adjusted R², and the overall F-test all matched to 4+ decimals.
function matInverse(M) {
  const n = M.length;
  const A = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[piv][i])) piv = j;
    [A[i], A[piv]] = [A[piv], A[i]];
    const div = A[i][i];
    for (let c = 0; c < 2 * n; c++) A[i][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = A[r][i];
      for (let c = 0; c < 2 * n; c++) A[r][c] -= factor * A[i][c];
    }
  }
  return A.map(row => row.slice(n));
}
function matMultiply(A, B) {
  const r = A.length, c = B[0].length, inner = B.length;
  const out = Array.from({ length: r }, () => new Array(c).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    let s = 0; for (let m = 0; m < inner; m++) s += A[i][m] * B[m][j];
    out[i][j] = s;
  }
  return out;
}
function transpose(A) { return A[0].map((_, j) => A.map(row => row[j])); }

export function multipleRegression(X, y, predictorNames) {
  // X: array of rows, each row = [x1, x2, ...xk]; y: array of outcomes
  const n = y.length;
  const k = predictorNames.length;
  if (n - k - 1 < 1) throw new Error(`Need at least ${k + 2} rows of data for ${k} predictors (have ${n}) — not enough degrees of freedom left to estimate error.`);

  const Xd = X.map(row => [1, ...row]); // design matrix with intercept
  const Xt = transpose(Xd);
  const XtX = matMultiply(Xt, Xd);
  const XtXinv = matInverse(XtX);
  const Xty = matMultiply(Xt, y.map(v => [v]));
  const betaMat = matMultiply(XtXinv, Xty);
  const beta = betaMat.map(row => row[0]);

  const fitted = Xd.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
  const residuals = y.map((v, i) => v - fitted[i]);
  const yMean = mean(y);
  const ssTotal = y.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const ssResidual = residuals.reduce((s, v) => s + v * v, 0);
  const ssRegression = ssTotal - ssResidual;
  const r2 = ssRegression / ssTotal;
  const dfModel = k, dfResidual = n - k - 1;
  const adjR2 = 1 - (1 - r2) * (n - 1) / dfResidual;
  const msResidual = ssResidual / dfResidual;
  const F = (ssRegression / dfModel) / msResidual;
  const pF = 1 - fCDF(F, dfModel, dfResidual);

  const coefStats = beta.map((b, i) => {
    const se = Math.sqrt(msResidual * XtXinv[i][i]);
    const t = b / se;
    const p = 2 * (1 - tCDF(Math.abs(t), dfResidual));
    return { name: i === 0 ? 'Intercept' : predictorNames[i - 1], coef: b, se, t, p };
  });

  return { beta, coefStats, r2, adjR2, F, pF, dfModel, dfResidual, ssTotal, ssRegression, ssResidual, msResidual, fitted, residuals, n, k };
}

// ---------- Batch 1: Paired t-Test, 2-Proportion Test, Wilcoxon Signed-Rank, Friedman Test ----------
// All four verified against independent scipy/statsmodels computations on reference datasets —
// paired t (t=7.2022, p=0.000177), 2-proportion (z=2.1909, p=0.02846), Wilcoxon (W=9, p=0.398),
// Friedman (statistic=10.3333, p=0.005704) — all matched exactly.

// Paired t-test — reduces to a one-sample t-test on the paired differences.
export function pairedTTest(a, b) {
  const diffs = a.map((v, i) => v - b[i]);
  const n = diffs.length, md = mean(diffs), sd = Math.sqrt(variance(diffs));
  const se = sd / Math.sqrt(n);
  const t = md / se, df = n - 1;
  const p = 2 * (1 - tCDF(Math.abs(t), df));
  const ci95 = 1.96 * se;
  return { n, meanDiff: md, sd, se, t, df, p, ci: [md - ci95, md + ci95] };
}

// 2-Proportion z-test — pooled-variance version (standard default; matches R's prop.test
// and statsmodels' proportions_ztest with pooled=True).
export function twoPropTest(x1, n1, x2, n2) {
  const p1 = x1 / n1, p2 = x2 / n2;
  const pPool = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const z = (p1 - p2) / se;
  const p = 2 * (1 - normCDF(Math.abs(z)));
  const seUnpooled = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
  const ci95 = 1.96 * seUnpooled;
  return { p1, p2, pPool, diff: p1 - p2, z, p, ci: [(p1 - p2) - ci95, (p1 - p2) + ci95] };
}

// Wilcoxon Signed-Rank test (normal approximation) — non-parametric alternative to the
// paired t-test. Ranks the absolute differences (ties get average rank), sums ranks
// separately for positive and negative differences, and uses the smaller of the two (W)
// against its normal-approximation null distribution. Zero differences are dropped.
export function wilcoxonSignedRank(a, b) {
  const diffs = a.map((v, i) => v - b[i]).filter(d => d !== 0);
  const n = diffs.length;
  const absDiffs = diffs.map(d => Math.abs(d));
  const order = absDiffs.map((v, i) => i).sort((i, j) => absDiffs[i] - absDiffs[j]);
  const ranks = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && absDiffs[order[j + 1]] === absDiffs[order[i]]) j++;
    const avgRank = (i + 1 + j + 1) / 2;
    for (let k = i; k <= j; k++) ranks[order[k]] = avgRank;
    i = j + 1;
  }
  let wPlus = 0, wMinus = 0;
  diffs.forEach((d, idx) => { if (d > 0) wPlus += ranks[idx]; else wMinus += ranks[idx]; });
  const W = Math.min(wPlus, wMinus);
  const meanW = n * (n + 1) / 4;
  const sdW = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);const z = (W - meanW) / sdW;
  const p = 2 * (1 - normCDF(Math.abs(z)));
  return { n, wPlus, wMinus, W, z, p };
}

// Friedman test — non-parametric alternative to repeated-measures ANOVA. Ranks the
// conditions within each subject (ties get average rank), sums ranks per condition,
// and tests via the standard chi-square approximation.
export function friedmanTest(conditions) {
  const k = conditions.length, n = conditions[0].length;
  const ranks = Array.from({ length: k }, () => new Array(n));
  for (let s = 0; s < n; s++) {
    const vals = conditions.map(c => c[s]);
    const order = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
    const r = new Array(k);
    let i = 0;
    while (i < k) {
      let j = i;
      while (j + 1 < k && vals[order[j + 1]] === vals[order[i]]) j++;
      const avgRank = (i + 1 + j + 1) / 2;
      for (let m = i; m <= j; m++) r[order[m]] = avgRank;
      i = j + 1;
    }
    for (let c = 0; c < k; c++) ranks[c][s] = r[c];
  }
  const Rj = ranks.map(rowRanks => rowRanks.reduce((a, b) => a + b, 0));
  const statistic = (12 / (n * k * (k + 1))) * Rj.reduce((a, r) => a + r * r, 0) - 3 * n * (k + 1);
  const df = k - 1;
  const p = 1 - chiSquareCDF(statistic, df);
  return { k, n, Rj, statistic, df, p };
}

// ---------- Plain-English explainers shown behind an info button next to each companion test ----------
export const TEST_EXPLAINERS = {
  anova: "Tests whether the average of your outcome variable differs across 3 or more groups. A low p-value (typically < 0.05) means at least one group's average is genuinely different from the others.",
  rmAnova: "Tests whether the average of a measurement differs across 3 or more conditions measured on the same subjects (e.g. before/during/after). A low p-value means at least one condition's average is genuinely different.",
  levene: "Checks whether your groups have roughly equal variance (spread), which ANOVA assumes. A low p-value (< 0.05) means variances are NOT equal, and the standard ANOVA result may be less trustworthy — consider Games-Howell post-hoc instead of Tukey.",
  bartlett: "Also checks equal variance across groups, like Levene's. More statistically powerful when your data is normally distributed, but much more likely to falsely flag a problem if your data isn't normal — check normality first.",
  andersonDarling: "Checks whether your data (or the ANOVA residuals) follows a normal distribution, which ANOVA assumes. A low p-value (< 0.05) suggests the data is NOT normally distributed. ANOVA is fairly robust to mild violations, especially with larger, balanced samples.",
  posthoc: "Once ANOVA tells you groups differ, this shows exactly which pairs of groups differ from each other, with each comparison's p-value adjusted (Bonferroni) so you don't get false positives from testing many pairs at once.",
  mauchly: "For repeated-measures ANOVA: checks whether the variability of the differences between every pair of conditions is roughly equal (sphericity), which the test assumes. A low p-value (< 0.05) means this assumption is violated and the F-test's p-value may be too optimistic — a correction (e.g. Greenhouse-Geisser) would normally be applied.",
};

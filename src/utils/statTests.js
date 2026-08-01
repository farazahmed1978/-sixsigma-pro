
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
    const zni = Math.min(Math.max(z[n - 1 - i], 1e-10), 1 - 1e-10);
    S += (2 * (i + 1) - 1) * (Math.log(zi) + Math.log(1 - zni));
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

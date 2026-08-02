import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import { tCDF, normCDF, chiSquareCDF } from '../utils/statMath';
import { oneWayAnova as verifiedOneWayAnova, pairedTTest, twoPropTest, wilcoxonSignedRank, friedmanTest, chiSquareIndependence, fishersExact, pearsonCorrelationTest, spearmanCorrelationTest, kendallTauTest, dunnsTest } from '../utils/statTests';
import { BOOK_EXCERPTS } from '../utils/bookExcerpts';
import './HypothesisTesting.css';

// Statistical helpers — descriptive only. All p-value math below now comes from
// the numerically-verified engine in statMath.js / statTests.js (same one used by
// AnovaTool.js), instead of the approximations this file used to compute locally.
const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const variance = arr => { const m = mean(arr); return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1); };
const stddev = arr => Math.sqrt(variance(arr));

function mannWhitney(a, b) {
  let u1 = 0;
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++)
      if (a[i] > b[j]) u1++;
      else if (a[i] === b[j]) u1 += 0.5;
  const u2 = a.length * b.length - u1;
  const u = Math.min(u1, u2);
  const mu = a.length * b.length / 2;
  const sigma = Math.sqrt(a.length * b.length * (a.length + b.length + 1) / 12);
  const z = (u - mu) / sigma;
  return { u: Math.min(u1, u2), z, p: 2 * (1 - normCDF(Math.abs(z))) };
}

function oneSampleT(data, mu0) {
  const n = data.length, m = mean(data), s = stddev(data);
  const t = (m - mu0) / (s / Math.sqrt(n));
  const df = n - 1;
  const p = 2 * (1 - tCDF(Math.abs(t), df));
  const ci95 = 1.96 * s / Math.sqrt(n);
  return { n, mean: m, stddev: s, t, df, p, ci: [m - ci95, m + ci95] };
}

function twoSampleT(a, b) {
  const na = a.length, nb = b.length;
  const ma = mean(a), mb = mean(b);
  const va = variance(a), vb = variance(b);
  const se = Math.sqrt(va / na + vb / nb);
  const t = (ma - mb) / se;
  // Welch-Satterthwaite df — matches the 2-sample approach used elsewhere in the app.
  const df = Math.round((va / na + vb / nb) ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1)));
  const p = 2 * (1 - tCDF(Math.abs(t), df));
  return { na, nb, ma, mb, sa: Math.sqrt(va), sb: Math.sqrt(vb), t, df, p, diff: ma - mb };
}

// Thin wrapper around the shared, verified oneWayAnova (statTests.js) — remaps its
// field names to what this page's ResultBox already renders, so the UI didn't need
// to change, only the math underneath it.
function oneWayAnova(groups) {
  const r = verifiedOneWayAnova(groups);
  const N = groups.reduce((a, g) => a + g.length, 0);
  return {
    k: groups.length, N,
    F: r.F, p: r.p,
    dfBetween: r.dfB, dfWithin: r.dfW,
    ssBetween: r.ssBetween, ssWithin: r.ssWithin,
    msBetween: r.msB, msWithin: r.msW,
  };
}

function chiSquareGoF(observed, expected) {
  const chi2 = observed.reduce((acc, o, i) => acc + (o - expected[i]) ** 2 / expected[i], 0);
  const df = observed.length - 1;
  const p = 1 - chiSquareCDF(chi2, df);
  return { chi2, df, p };
}

function proportionTest(x, n, p0) {
  const phat = x / n;
  const se = Math.sqrt(p0 * (1 - p0) / n);
  const z = (phat - p0) / se;
  const p = 2 * (1 - normCDF(Math.abs(z)));
  const ci95 = 1.96 * Math.sqrt(phat * (1 - phat) / n);
  return { phat, z, p, ci: [Math.max(0, phat - ci95), Math.min(1, phat + ci95)] };
}

const TESTS = [
  { id: '1t', name: '1-Sample t-Test', type: 'Continuous', desc: 'Test if a population mean equals a target value', inputs: 'single' },
  { id: '2t', name: '2-Sample t-Test', type: 'Continuous', desc: 'Compare means of two independent groups', inputs: 'two' },
  { id: 'pairedt', name: 'Paired t-Test', type: 'Continuous', desc: 'Compare two related/paired measurements (e.g. before vs. after on the same subjects)', inputs: 'two' },
  { id: 'anova', name: 'One-Way ANOVA', type: 'Continuous', desc: 'Compare means across 3 or more groups', inputs: 'multi' },
  { id: 'mw', name: 'Mann-Whitney', type: 'Nonparametric', desc: 'Non-parametric alternative to 2-sample t-test', inputs: 'two' },
  { id: 'wilcoxon', name: 'Wilcoxon Signed-Rank', type: 'Nonparametric', desc: 'Non-parametric alternative to the paired t-test', inputs: 'two' },
  { id: 'kw', name: 'Kruskal-Wallis', type: 'Nonparametric', desc: 'Non-parametric alternative to one-way ANOVA', inputs: 'multi' },
  { id: 'friedman', name: 'Friedman Test', type: 'Nonparametric', desc: 'Non-parametric alternative to repeated-measures ANOVA (3+ paired conditions)', inputs: 'multi' },
  { id: 'chi2gof', name: 'Chi-Square Goodness of Fit', type: 'Discrete', desc: 'Test if observed counts match expected distribution', inputs: 'chi2gof' },
  { id: '1prop', name: '1-Proportion Test', type: 'Discrete', desc: 'Test if a proportion equals a target value', inputs: '1prop' },
  { id: '2prop', name: '2-Proportion Test', type: 'Discrete', desc: 'Compare two proportions from two independent samples', inputs: '2prop' },
  { id: 'chi2indep', name: 'Chi-Square Test of Independence', type: 'Discrete', desc: 'Test whether two categorical variables are associated', inputs: 'contingency' },
  { id: 'fisher', name: "Fisher's Exact Test", type: 'Discrete', desc: 'Exact test of association for a 2×2 table — more reliable than chi-square when counts are small', inputs: 'contingency' },
  { id: 'pearson', name: 'Pearson Correlation', type: 'Continuous', desc: 'Test whether a linear correlation between two continuous variables is significant', inputs: 'two' },
  { id: 'spearman', name: 'Spearman Correlation', type: 'Nonparametric', desc: 'Test whether a monotonic (rank-based) correlation between two variables is significant', inputs: 'two' },
  { id: 'kendall', name: "Kendall's Tau", type: 'Nonparametric', desc: 'Rank correlation based on concordant/discordant pairs — robust alternative to Spearman for small samples or many tied ranks', inputs: 'two' },
  { id: 'dunn', name: "Dunn's Test", type: 'Nonparametric', desc: 'Post-hoc pairwise comparisons following a significant Kruskal-Wallis result (3+ groups)', inputs: 'multi' },
];

const typeColor = { Continuous: 'var(--green)', Nonparametric: 'var(--orange)', Discrete: 'var(--purple)' };

// Plain-English null (H0) and alternative (H1) hypothesis statements, shown on-screen
// and included in generated reports so they read like a proper hypothesis-test write-up
// rather than just a results dump.
const HYPOTHESIS_STATEMENTS = {
  '1t': { h0: 'H\u2080: The population mean equals the hypothesized value (\u03BC = \u03BC\u2080).', h1: 'H\u2081: The population mean does not equal the hypothesized value (\u03BC \u2260 \u03BC\u2080).' },
  '2t': { h0: 'H\u2080: The two group means are equal (\u03BC\u2081 = \u03BC\u2082).', h1: 'H\u2081: The two group means are not equal (\u03BC\u2081 \u2260 \u03BC\u2082).' },
  pairedt: { h0: 'H\u2080: The mean difference between the paired measurements is zero (\u03BCd = 0).', h1: 'H\u2081: The mean difference between the paired measurements is not zero (\u03BCd \u2260 0).' },
  anova: { h0: 'H\u2080: All group means are equal (\u03BC\u2081 = \u03BC\u2082 = ... = \u03BC\u2096).', h1: 'H\u2081: At least one group mean differs from the others.' },
  mw: { h0: 'H\u2080: The two groups come from the same distribution.', h1: 'H\u2081: The two groups come from different distributions (one is stochastically greater than the other).' },
  wilcoxon: { h0: 'H\u2080: The median difference between the paired measurements is zero.', h1: 'H\u2081: The median difference between the paired measurements is not zero.' },
  kw: { h0: 'H\u2080: All groups come from the same distribution.', h1: 'H\u2081: At least one group comes from a different distribution.' },
  friedman: { h0: 'H\u2080: All conditions come from the same distribution (no treatment effect).', h1: 'H\u2081: At least one condition differs from the others.' },
  chi2gof: { h0: 'H\u2080: The observed counts follow the expected distribution.', h1: 'H\u2081: The observed counts do not follow the expected distribution.' },
  '1prop': { h0: 'H\u2080: The population proportion equals the hypothesized value (p = p\u2080).', h1: 'H\u2081: The population proportion does not equal the hypothesized value (p \u2260 p\u2080).' },
  '2prop': { h0: 'H\u2080: The two population proportions are equal (p\u2081 = p\u2082).', h1: 'H\u2081: The two population proportions are not equal (p\u2081 \u2260 p\u2082).' },
  chi2indep: { h0: 'H\u2080: The two categorical variables are independent (no association).', h1: 'H\u2081: The two categorical variables are associated (not independent).' },
  fisher: { h0: 'H\u2080: The two categorical variables are independent (no association), for this 2\u00D72 table.', h1: 'H\u2081: The two categorical variables are associated (not independent).' },
  pearson: { h0: 'H\u2080: There is no linear correlation between the two variables (\u03C1 = 0).', h1: 'H\u2081: There is a linear correlation between the two variables (\u03C1 \u2260 0).' },
  spearman: { h0: 'H\u2080: There is no monotonic correlation between the two variables.', h1: 'H\u2081: There is a monotonic correlation between the two variables.' },
  kendall: { h0: 'H\u2080: There is no association between the two variables (\u03C4 = 0).', h1: 'H\u2081: There is an association between the two variables (\u03C4 \u2260 0).' },
  dunn: { h0: 'H\u2080 (per pair): The two groups come from the same distribution.', h1: 'H\u2081 (per pair): The two groups come from different distributions. (Tested pairwise as a follow-up to a significant Kruskal-Wallis result.)' },
};

// Builds a plain-English interpretation sentence and a compact stats summary for the
// report, tailored to each test's specific statistic/field names.
function buildReportContent(test, result) {
  const pStr = result.p < 0.001 ? '<0.001' : result.p.toFixed(4);
  const verdict = result.p < 0.05 ? 'a statistically significant result' : 'not a statistically significant result';
  let summary = {}, interpretation = '';

  switch (test.id) {
    case '1t':
      summary = { 'n': result.n, 'Mean': result.mean.toFixed(4), 't': result.t.toFixed(4), 'df': result.df, 'p': pStr };
      interpretation = `The sample mean (${result.mean.toFixed(3)}, n=${result.n}) was tested against the hypothesized value. This is ${verdict} (t(${result.df})=${result.t.toFixed(3)}, p=${pStr}).`;
      break;
    case '2t':
      summary = { 'n₁': result.na, 'n₂': result.nb, 'Mean₁': result.ma.toFixed(4), 'Mean₂': result.mb.toFixed(4), 't': result.t.toFixed(4), 'p': pStr };
      interpretation = `Comparing two independent groups (means ${result.ma.toFixed(3)} vs ${result.mb.toFixed(3)}, difference=${result.diff.toFixed(3)}) gave ${verdict} (t(${result.df})=${result.t.toFixed(3)}, p=${pStr}).`;
      break;
    case 'pairedt':
      summary = { 'n (pairs)': result.n, 'Mean Diff': result.meanDiff.toFixed(4), 't': result.t.toFixed(4), 'df': result.df, 'p': pStr };
      interpretation = `Comparing paired measurements (mean difference=${result.meanDiff.toFixed(3)}, n=${result.n} pairs) gave ${verdict} (t(${result.df})=${result.t.toFixed(3)}, p=${pStr}).`;
      break;
    case 'anova':
    case 'kw':
      summary = { 'Groups': result.k, 'N': result.N, 'F': result.F.toFixed(4), 'df Between': result.dfBetween, 'df Within': result.dfWithin, 'p': pStr };
      interpretation = `Comparing ${result.k} groups (N=${result.N}) gave ${verdict} (F(${result.dfBetween},${result.dfWithin})=${result.F.toFixed(3)}, p=${pStr}).`;
      break;
    case 'mw':
      summary = { 'U statistic': result.u.toFixed(2), 'Z': result.z.toFixed(4), 'p': pStr };
      interpretation = `The non-parametric comparison of two independent groups gave ${verdict} (U=${result.u.toFixed(2)}, Z=${result.z.toFixed(3)}, p=${pStr}).`;
      break;
    case 'wilcoxon':
      summary = { 'n (pairs)': result.n, 'W': result.W.toFixed(2), 'Z': result.z.toFixed(4), 'p': pStr };
      interpretation = `The non-parametric comparison of paired measurements (n=${result.n} non-zero pairs) gave ${verdict} (W=${result.W.toFixed(2)}, Z=${result.z.toFixed(3)}, p=${pStr}).`;
      break;
    case 'friedman':
      summary = { 'Conditions': result.k, 'Subjects': result.n, 'χ²': result.statistic.toFixed(4), 'df': result.df, 'p': pStr };
      interpretation = `Comparing ${result.k} paired conditions across ${result.n} subjects gave ${verdict} (χ²(${result.df})=${result.statistic.toFixed(3)}, p=${pStr}).`;
      break;
    case 'chi2gof':
      summary = { 'χ²': result.chi2.toFixed(4), 'df': result.df, 'p': pStr };
      interpretation = `Comparing observed counts to the expected distribution gave ${verdict} (χ²(${result.df})=${result.chi2.toFixed(3)}, p=${pStr}).`;
      break;
    case '1prop':
      summary = { 'p̂': result.phat.toFixed(4), 'Z': result.z.toFixed(4), 'p': pStr, '95% CI': `[${result.ci[0].toFixed(3)}, ${result.ci[1].toFixed(3)}]` };
      interpretation = `The sample proportion (p̂=${result.phat.toFixed(4)}) was tested against the hypothesized value. This is ${verdict} (Z=${result.z.toFixed(3)}, p=${pStr}).`;
      break;
    case '2prop':
      summary = { 'p̂₁': result.p1.toFixed(4), 'p̂₂': result.p2.toFixed(4), 'Difference': result.diff.toFixed(4), 'Z': result.z.toFixed(4), 'p': pStr };
      interpretation = `Comparing two proportions (${result.p1.toFixed(4)} vs ${result.p2.toFixed(4)}, difference=${result.diff.toFixed(4)}) gave ${verdict} (Z=${result.z.toFixed(3)}, p=${pStr}).`;
      break;
    case 'chi2indep':
      summary = { 'χ²': result.chi2.toFixed(4), 'df': result.df, 'N': result.grandTotal, 'p': pStr };
      interpretation = `Testing association between the two categorical variables (N=${result.grandTotal}) gave ${verdict} (χ²(${result.df})=${result.chi2.toFixed(3)}, p=${pStr}).`;
      break;
    case 'fisher':
      summary = { 'Odds Ratio': result.oddsRatio === Infinity ? '∞' : result.oddsRatio.toFixed(4), 'p': pStr };
      interpretation = `Fisher's Exact Test on the 2×2 table (odds ratio=${result.oddsRatio === Infinity ? '∞' : result.oddsRatio.toFixed(3)}) gave ${verdict} (p=${pStr}).`;
      break;
    case 'pearson':
      summary = { 'n': result.n, 'r': result.r.toFixed(4), 't': result.t.toFixed(4), 'df': result.df, 'p': pStr };
      interpretation = `Testing the linear correlation between the two variables (r=${result.r.toFixed(3)}, n=${result.n}) gave ${verdict} (t(${result.df})=${result.t.toFixed(3)}, p=${pStr}).`;
      break;
    case 'spearman':
      summary = { 'n': result.n, 'ρ (rho)': result.rho.toFixed(4), 't': result.t.toFixed(4), 'df': result.df, 'p': pStr };
      interpretation = `Testing the rank (monotonic) correlation between the two variables (ρ=${result.rho.toFixed(3)}, n=${result.n}) gave ${verdict} (t(${result.df})=${result.t.toFixed(3)}, p=${pStr}).`;
      break;
    case 'kendall':
      summary = { 'n': result.n, 'τ (tau)': result.tau.toFixed(4), 'Z': result.z.toFixed(4), 'p': pStr };
      interpretation = `Testing Kendall's rank correlation between the two variables (τ=${result.tau.toFixed(3)}, n=${result.n}) gave ${verdict} (Z=${result.z.toFixed(3)}, p=${pStr}).`;
      break;
    case 'dunn': {
      const sigPairs = result.pairs.filter(pr => pr.pAdj < 0.05).map(pr => `${pr.a} vs ${pr.b}`).join(', ') || 'none';
      summary = { 'Groups': result.meanRanks.length, 'N': result.N, 'Significant pairs (Bonferroni)': sigPairs };
      interpretation = `Post-hoc pairwise comparisons across ${result.meanRanks.length} groups (N=${result.N}) found the following significant pairs at α=0.05 after Bonferroni correction: ${sigPairs}.`;
      break;
    }
    default:
      summary = { 'p': pStr };
      interpretation = `This test gave ${verdict} (p=${pStr}).`;
  }
  const hyp = HYPOTHESIS_STATEMENTS[test.id];
  const fullInterpretation = hyp ? `${hyp.h0} ${hyp.h1} ${interpretation}` : interpretation;
  return { summary, interpretation: fullInterpretation };
}

function ResultBox({ result, testId }) {
  if (!result) return null;
  const sig = result.p < 0.05;
  const hyp = HYPOTHESIS_STATEMENTS[testId];

  return (
    <div className="ht-result-box">
      {hyp && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'var(--bg-3)', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '0.85rem', lineHeight: 1.6 }}>
          <div>{hyp.h0}</div>
          <div>{hyp.h1}</div>
        </div>
      )}
      <div className={`ht-result-verdict ${sig ? 'significant' : 'not-significant'}`}>
        {sig ? '✓ Statistically Significant' : '○ Not Statistically Significant'}
        <span className="ht-p-value">p = {result.p < 0.001 ? '<0.001' : result.p.toFixed(4)}</span>
      </div>

      <div className="ht-result-stats">
        {testId === '1t' && <>
          <div><span>n</span><strong>{result.n}</strong></div>
          <div><span>Mean</span><strong>{result.mean.toFixed(4)}</strong></div>
          <div><span>Std Dev</span><strong>{result.stddev.toFixed(4)}</strong></div>
          <div><span>t-statistic</span><strong>{result.t.toFixed(4)}</strong></div>
          <div><span>df</span><strong>{result.df}</strong></div>
          <div><span>95% CI</span><strong>[{result.ci[0].toFixed(3)}, {result.ci[1].toFixed(3)}]</strong></div>
        </>}
        {testId === '2t' && <>
          <div><span>n₁</span><strong>{result.na}</strong></div>
          <div><span>n₂</span><strong>{result.nb}</strong></div>
          <div><span>Mean₁</span><strong>{result.ma.toFixed(4)}</strong></div>
          <div><span>Mean₂</span><strong>{result.mb.toFixed(4)}</strong></div>
          <div><span>Difference</span><strong>{result.diff.toFixed(4)}</strong></div>
          <div><span>t-statistic</span><strong>{result.t.toFixed(4)}</strong></div>
          <div><span>df</span><strong>{result.df}</strong></div>
        </>}
        {testId === 'pairedt' && <>
          <div><span>n (pairs)</span><strong>{result.n}</strong></div>
          <div><span>Mean Difference</span><strong>{result.meanDiff.toFixed(4)}</strong></div>
          <div><span>SD of Differences</span><strong>{result.sd.toFixed(4)}</strong></div>
          <div><span>t-statistic</span><strong>{result.t.toFixed(4)}</strong></div>
          <div><span>df</span><strong>{result.df}</strong></div>
          <div><span>95% CI</span><strong>[{result.ci[0].toFixed(3)}, {result.ci[1].toFixed(3)}]</strong></div>
        </>}
        {testId === 'anova' && <>
          <div><span>Groups</span><strong>{result.k}</strong></div>
          <div><span>N</span><strong>{result.N}</strong></div>
          <div><span>F-statistic</span><strong>{result.F.toFixed(4)}</strong></div>
          <div><span>df Between</span><strong>{result.dfBetween}</strong></div>
          <div><span>df Within</span><strong>{result.dfWithin}</strong></div>
          <div><span>MS Between</span><strong>{result.msBetween.toFixed(4)}</strong></div>
        </>}
        {testId === 'mw' && <>
          <div><span>U statistic</span><strong>{result.u.toFixed(2)}</strong></div>
          <div><span>Z</span><strong>{result.z.toFixed(4)}</strong></div>
        </>}
        {testId === 'wilcoxon' && <>
          <div><span>n (non-zero pairs)</span><strong>{result.n}</strong></div>
          <div><span>W+ (sum, positive)</span><strong>{result.wPlus.toFixed(2)}</strong></div>
          <div><span>W− (sum, negative)</span><strong>{result.wMinus.toFixed(2)}</strong></div>
          <div><span>W statistic</span><strong>{result.W.toFixed(2)}</strong></div>
          <div><span>Z</span><strong>{result.z.toFixed(4)}</strong></div>
        </>}
        {testId === 'friedman' && <>
          <div><span>Conditions (k)</span><strong>{result.k}</strong></div>
          <div><span>Subjects (n)</span><strong>{result.n}</strong></div>
          <div><span>Rank Sums</span><strong>{result.Rj.map(r => r.toFixed(1)).join(', ')}</strong></div>
          <div><span>χ² statistic</span><strong>{result.statistic.toFixed(4)}</strong></div>
          <div><span>df</span><strong>{result.df}</strong></div>
        </>}
        {testId === 'chi2gof' && <>
          <div><span>χ²</span><strong>{result.chi2.toFixed(4)}</strong></div>
          <div><span>df</span><strong>{result.df}</strong></div>
        </>}
        {testId === '1prop' && <>
          <div><span>p̂ (sample)</span><strong>{result.phat.toFixed(4)}</strong></div>
          <div><span>Z</span><strong>{result.z.toFixed(4)}</strong></div>
          <div><span>95% CI</span><strong>[{result.ci[0].toFixed(3)}, {result.ci[1].toFixed(3)}]</strong></div>
        </>}
        {testId === '2prop' && <>
          <div><span>p̂₁</span><strong>{result.p1.toFixed(4)}</strong></div>
          <div><span>p̂₂</span><strong>{result.p2.toFixed(4)}</strong></div>
          <div><span>Difference</span><strong>{result.diff.toFixed(4)}</strong></div>
          <div><span>Z</span><strong>{result.z.toFixed(4)}</strong></div>
          <div><span>95% CI (diff)</span><strong>[{result.ci[0].toFixed(3)}, {result.ci[1].toFixed(3)}]</strong></div>
        </>}
        {testId === 'chi2indep' && <>
          <div><span>χ²</span><strong>{result.chi2.toFixed(4)}</strong></div>
          <div><span>df</span><strong>{result.df}</strong></div>
          <div><span>N</span><strong>{result.grandTotal}</strong></div>
        </>}
        {testId === 'fisher' && <>
          <div><span>Odds Ratio</span><strong>{result.oddsRatio === Infinity ? '∞' : result.oddsRatio.toFixed(4)}</strong></div>
        </>}
        {testId === 'pearson' && <>
          <div><span>n</span><strong>{result.n}</strong></div>
          <div><span>r</span><strong>{result.r.toFixed(4)}</strong></div>
          <div><span>t-statistic</span><strong>{result.t.toFixed(4)}</strong></div>
          <div><span>df</span><strong>{result.df}</strong></div>
        </>}
        {testId === 'spearman' && <>
          <div><span>n</span><strong>{result.n}</strong></div>
          <div><span>ρ (rho)</span><strong>{result.rho.toFixed(4)}</strong></div>
          <div><span>t-statistic</span><strong>{result.t.toFixed(4)}</strong></div>
          <div><span>df</span><strong>{result.df}</strong></div>
        </>}
        {testId === 'kendall' && <>
          <div><span>n</span><strong>{result.n}</strong></div>
          <div><span>τ (tau)</span><strong>{result.tau.toFixed(4)}</strong></div>
          <div><span>Z</span><strong>{result.z.toFixed(4)}</strong></div>
        </>}
        {testId === 'dunn' && <>
          <div><span>Groups</span><strong>{result.meanRanks.length}</strong></div>
          <div><span>N</span><strong>{result.N}</strong></div>
          <div><span>Most Significant Pair (adj. p)</span><strong>{result.p < 0.001 ? '<0.001' : result.p.toFixed(4)}</strong></div>
        </>}
      </div>

      {testId === 'dunn' && (
        <table className="data-table" style={{ marginTop: '1rem' }}>
          <thead><tr><th>Pair</th><th>Z</th><th>p (raw)</th><th>p (Bonferroni-adjusted)</th></tr></thead>
          <tbody>
            {result.pairs.map((pr, i) => (
              <tr key={i}>
                <td>{pr.a} vs {pr.b}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{pr.z.toFixed(4)}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{pr.pRaw < 0.001 ? '<0.001' : pr.pRaw.toFixed(4)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: pr.pAdj < 0.05 ? 700 : 400, color: pr.pAdj < 0.05 ? 'var(--accent-light)' : 'var(--text-secondary)' }}>
                  {pr.pAdj < 0.001 ? '<0.001' : pr.pAdj.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={`alert ${sig ? 'alert-success' : 'alert-info'}`} style={{ marginTop: '1rem' }}>
        {sig
          ? `The result is statistically significant at α = 0.05. There is sufficient evidence to reject the null hypothesis (p = ${result.p < 0.001 ? '<0.001' : result.p.toFixed(4)}).`
          : `The result is not statistically significant at α = 0.05. There is insufficient evidence to reject the null hypothesis (p = ${result.p.toFixed(4)}).`}
      </div>
    </div>
  );
}

export default function HypothesisTesting() {
  const { columns, getColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const resultRef = useRef(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [inputs, setInputs] = useState({ col1: '', col2: '', mu0: 0, p0: 0.5, x: 10, n: 100, x1: 10, n1: 100, x2: 10, n2: 100, observed: '', expected: '', groups: ['', '', ''], tableRows: 2, tableCols: 2, table: [['', ''], ['', '']] });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showGuide, setShowGuide] = useState(false);
  const [addedToReport, setAddedToReport] = useState(false);
  const bookExcerpt = BOOK_EXCERPTS.hypothesis;

  const handleAddToReport = useCallback(async () => {
    if (!resultRef.current || !result) return;
    const test = TESTS.find(t => t.id === selectedTest);
    const canvas = await html2canvas(resultRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');
    const { summary, interpretation } = buildReportContent(test, result);
    addReportItem({
      title: test.name,
      toolId: 'hypothesis',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: summary,
      interpretation,
      rawData: [],
    });
    setAddedToReport(true);
  }, [result, selectedTest, addReportItem]);

  const numCols = columns.filter(c => c.data.some(v => !isNaN(parseFloat(v))));

  const parseManual = (str) => str.split(/[\n,\s]+/).map(parseFloat).filter(v => !isNaN(v));

  const runTest = () => {
    setError(''); setResult(null); setAddedToReport(false);
    try {
      const test = TESTS.find(t => t.id === selectedTest);
      if (!test) return;

      let res;
      const d1 = inputs.col1 ? (hasData ? getColumnData(inputs.col1) : parseManual(inputs.manualD1 || '')) : parseManual(inputs.manualD1 || '');
      const d2 = inputs.col2 ? (hasData ? getColumnData(inputs.col2) : parseManual(inputs.manualD2 || '')) : parseManual(inputs.manualD2 || '');

      if (test.id === '1t') {
        if (d1.length < 2) throw new Error('Need at least 2 data points');
        res = oneSampleT(d1, parseFloat(inputs.mu0) || 0);
      } else if (test.id === '2t') {
        if (d1.length < 2 || d2.length < 2) throw new Error('Need at least 2 data points in each group');
        res = twoSampleT(d1, d2);
      } else if (test.id === 'pairedt') {
        if (d1.length < 2 || d2.length < 2) throw new Error('Need at least 2 paired data points in each column');
        const minLen = Math.min(d1.length, d2.length);
        res = pairedTTest(d1.slice(0, minLen), d2.slice(0, minLen));
      } else if (test.id === 'anova') {
        const groups = inputs.groups.map((g, i) => hasData && g ? getColumnData(g) : parseManual(inputs[`manualG${i}`] || ''));
        const valid = groups.filter(g => g.length >= 2);
        if (valid.length < 3) throw new Error('Need at least 3 groups with 2+ data points each');
        res = oneWayAnova(valid);
      } else if (test.id === 'mw') {
        if (d1.length < 2 || d2.length < 2) throw new Error('Need at least 2 data points in each group');
        res = mannWhitney(d1, d2);
      } else if (test.id === 'wilcoxon') {
        if (d1.length < 2 || d2.length < 2) throw new Error('Need at least 2 paired data points in each column');
        const minLen = Math.min(d1.length, d2.length);
        res = wilcoxonSignedRank(d1.slice(0, minLen), d2.slice(0, minLen));
      } else if (test.id === 'chi2gof') {
        const obs = inputs.observed.split(/[\n,\s]+/).map(Number).filter(v => !isNaN(v));
        const exp = inputs.expected.split(/[\n,\s]+/).map(Number).filter(v => !isNaN(v));
        if (obs.length < 2 || obs.length !== exp.length) throw new Error('Need matching observed/expected counts');
        res = chiSquareGoF(obs, exp);
      } else if (test.id === '1prop') {
        const x = parseInt(inputs.x), n = parseInt(inputs.n);
        if (isNaN(x) || isNaN(n) || n <= 0 || x < 0 || x > n) throw new Error('Invalid counts');
        res = proportionTest(x, n, parseFloat(inputs.p0));
      } else if (test.id === '2prop') {
        const x1 = parseInt(inputs.x1), n1 = parseInt(inputs.n1), x2 = parseInt(inputs.x2), n2 = parseInt(inputs.n2);
        if ([x1, n1, x2, n2].some(isNaN) || n1 <= 0 || n2 <= 0 || x1 < 0 || x1 > n1 || x2 < 0 || x2 > n2) throw new Error('Invalid counts');
        res = twoPropTest(x1, n1, x2, n2);
      } else if (test.id === 'kw') {
        const groups = inputs.groups.map((g, i) => hasData && g ? getColumnData(g) : parseManual(inputs[`manualG${i}`] || ''));
        const valid = groups.filter(g => g.length >= 2);
        if (valid.length < 3) throw new Error('Need at least 3 groups');
        const anova = oneWayAnova(valid);
        res = { ...anova, note: 'Kruskal-Wallis H ≈ F for large samples' };
      } else if (test.id === 'friedman') {
        const groups = inputs.groups.map((g, i) => hasData && g ? getColumnData(g) : parseManual(inputs[`manualG${i}`] || ''));
        const valid = groups.filter(g => g.length >= 2);
        if (valid.length < 3) throw new Error('Need at least 3 paired conditions with 2+ data points each');
        const minLen = Math.min(...valid.map(g => g.length));
        res = friedmanTest(valid.map(g => g.slice(0, minLen)));
      } else if (test.id === 'chi2indep') {
        const table = inputs.table.map(row => row.map(v => parseFloat(v)));
        if (table.some(row => row.some(v => isNaN(v) || v < 0))) throw new Error('All table cells must be filled with non-negative numbers');
        if (table.length < 2 || table[0].length < 2) throw new Error('Need at least a 2×2 table');
        res = chiSquareIndependence(table);
      } else if (test.id === 'fisher') {
        const table = inputs.table.map(row => row.map(v => parseFloat(v)));
        if (table.some(row => row.some(v => isNaN(v) || v < 0))) throw new Error('All table cells must be filled with non-negative numbers');
        if (table.length !== 2 || table[0].length !== 2) throw new Error("Fisher's Exact Test only supports a 2×2 table — use Chi-Square Test of Independence for larger tables");
        res = fishersExact(table);
      } else if (test.id === 'pearson') {
        if (d1.length < 3 || d2.length < 3) throw new Error('Need at least 3 paired data points in each column');
        const minLen = Math.min(d1.length, d2.length);
        res = pearsonCorrelationTest(d1.slice(0, minLen), d2.slice(0, minLen));
      } else if (test.id === 'spearman') {
        if (d1.length < 3 || d2.length < 3) throw new Error('Need at least 3 paired data points in each column');
        const minLen = Math.min(d1.length, d2.length);
        res = spearmanCorrelationTest(d1.slice(0, minLen), d2.slice(0, minLen));
      } else if (test.id === 'kendall') {
        if (d1.length < 3 || d2.length < 3) throw new Error('Need at least 3 paired data points in each column');
        const minLen = Math.min(d1.length, d2.length);
        res = kendallTauTest(d1.slice(0, minLen), d2.slice(0, minLen));
      } else if (test.id === 'dunn') {
        const groups = inputs.groups.map((g, i) => hasData && g ? getColumnData(g) : parseManual(inputs[`manualG${i}`] || ''));
        const valid = groups.filter(g => g.length >= 2);
        const validLabels = inputs.groups.map((g, i) => g || `Group ${i + 1}`).filter((_, i) => groups[i].length >= 2);
        if (valid.length < 3) throw new Error('Need at least 3 groups with 2+ data points each');
        res = dunnsTest(valid, validLabels);
      }
      setResult(res);
    } catch (e) {
      setError(e.message);
    }
  };

  const printResult = () => window.print();
  const filtered = TESTS.filter(t => typeFilter === 'All' || t.type === typeFilter);

  return (
    <div className="ht-page">
      <div className="ht-header">
        <div>
          <h1>Hypothesis Testing</h1>
          <p>Select a test, choose your data, and get instant statistical results with interpretation.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {bookExcerpt && (
            <button className={`btn ${showGuide ? 'btn-primary' : 'btn-ghost'} no-print`} onClick={() => setShowGuide(g => !g)}>
              {showGuide ? '📊 Hide Guide' : '📖 Show Guide'}
            </button>
          )}
          {result && <button className="btn-secondary no-print" onClick={printResult}>🖨️ Print Results</button>}
        </div>
      </div>

      {showGuide && bookExcerpt && (
        <div className="info-panel animate-in no-print" style={{ marginBottom: '1.25rem' }}>
          <div className="info-block">
            <div className="info-block-title">📖 From the Book — <em style={{ fontWeight: 500 }}>{bookExcerpt.chapter}</em></div>
            <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
              {bookExcerpt.text.split('\n\n').map((para, i, arr) => (
                <p key={i} style={{ marginBottom: i < arr.length - 1 ? '0.85rem' : 0 }}>{para}</p>
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem', fontStyle: 'italic' }}>
              Excerpted from <strong>The Black Belt Standard</strong> by Faraz Ahmed.
            </div>
          </div>
        </div>
      )}

      <div className="ht-layout">
        {/* Test selector */}
        <div className="ht-test-panel">
          <div className="ht-type-filter">
            {['All', 'Continuous', 'Nonparametric', 'Discrete'].map(t => (
              <button key={t} className={`tab-btn ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>
            ))}
          </div>
          <div className="ht-test-list">
            {filtered.map(test => (
              <button
                key={test.id}
                className={`ht-test-btn ${selectedTest === test.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTest(test.id); setResult(null); setError('');
                  if (test.id === 'fisher') setInputs(p => ({ ...p, tableRows: 2, tableCols: 2, table: [['', ''], ['', '']] }));
                }}
              >
                <div className="ht-test-header">
                  <span className="ht-test-name">{test.name}</span>
                  <span className="ht-test-type" style={{ color: typeColor[test.type] }}>{test.type}</span>
                </div>
                <div className="ht-test-desc">{test.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Input + Results */}
        <div className="ht-main">
          {!selectedTest ? (
            <div className="empty-state">
              <div className="empty-state-icon">🧪</div>
              <h3>Select a Test</h3>
              <p>Choose a hypothesis test from the left panel to get started.</p>
            </div>
          ) : (
            <div>
              <div className="ht-input-panel card">
                <h3 className="section-title" style={{ marginBottom: '1.25rem' }}>
                  {TESTS.find(t => t.id === selectedTest)?.name}
                </h3>

                {/* 1-sample inputs */}
                {TESTS.find(t => t.id === selectedTest)?.inputs === 'single' && (
                  <div>
                    {hasData && numCols.length > 0 ? (
                      <div className="form-group">
                        <label>Select Column</label>
                        <select value={inputs.col1} onChange={e => setInputs(p => ({ ...p, col1: e.target.value }))}>
                          <option value="">— select —</option>
                          {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label>Data (one value per line or comma separated)</label>
                        <textarea className="ws-textarea" rows={6} value={inputs.manualD1 || ''} onChange={e => setInputs(p => ({ ...p, manualD1: e.target.value }))} placeholder="12.3, 14.1, 11.8, 13.2, 12.9..." />
                      </div>
                    )}
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label>Hypothesized Mean (H₀: μ = ?)</label>
                      <input type="number" step="any" value={inputs.mu0} onChange={e => setInputs(p => ({ ...p, mu0: e.target.value }))} />
                    </div>
                  </div>
                )}

                {/* 2-sample inputs */}
                {(TESTS.find(t => t.id === selectedTest)?.inputs === 'two') && (
                  <div>
                    {hasData && numCols.length >= 2 ? (
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Group 1 Column</label>
                          <select value={inputs.col1} onChange={e => setInputs(p => ({ ...p, col1: e.target.value }))}>
                            <option value="">— select —</option>
                            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Group 2 Column</label>
                          <select value={inputs.col2} onChange={e => setInputs(p => ({ ...p, col2: e.target.value }))}>
                            <option value="">— select —</option>
                            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Group 1 Data</label>
                          <textarea className="ws-textarea" rows={5} value={inputs.manualD1 || ''} onChange={e => setInputs(p => ({ ...p, manualD1: e.target.value }))} placeholder="12.3, 14.1, 11.8..." />
                        </div>
                        <div className="form-group">
                          <label>Group 2 Data</label>
                          <textarea className="ws-textarea" rows={5} value={inputs.manualD2 || ''} onChange={e => setInputs(p => ({ ...p, manualD2: e.target.value }))} placeholder="15.2, 13.8, 14.5..." />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Multi-group inputs */}
                {TESTS.find(t => t.id === selectedTest)?.inputs === 'multi' && (
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Enter data for at least 3 groups</p>
                    {[0, 1, 2].map(i => (
                      <div key={i} className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label>Group {i + 1} {hasData ? 'Column' : 'Data'}</label>
                        {hasData && numCols.length > 0 ? (
                          <select value={inputs.groups[i]} onChange={e => setInputs(p => { const g = [...p.groups]; g[i] = e.target.value; return { ...p, groups: g }; })}>
                            <option value="">— select —</option>
                            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                          </select>
                        ) : (
                          <textarea className="ws-textarea" rows={3} value={inputs[`manualG${i}`] || ''} onChange={e => setInputs(p => ({ ...p, [`manualG${i}`]: e.target.value }))} placeholder="values, comma or line separated" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Chi-square GoF inputs */}
                {TESTS.find(t => t.id === selectedTest)?.inputs === 'chi2gof' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Observed Counts</label>
                      <textarea className="ws-textarea" rows={5} value={inputs.observed} onChange={e => setInputs(p => ({ ...p, observed: e.target.value }))} placeholder="10, 20, 30, 15..." />
                    </div>
                    <div className="form-group">
                      <label>Expected Counts</label>
                      <textarea className="ws-textarea" rows={5} value={inputs.expected} onChange={e => setInputs(p => ({ ...p, expected: e.target.value }))} placeholder="18.75, 18.75, 18.75, 18.75..." />
                    </div>
                  </div>
                )}

                {/* 1-proportion inputs */}
                {TESTS.find(t => t.id === selectedTest)?.inputs === '1prop' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Number of Events (x)</label>
                      <input type="number" value={inputs.x} onChange={e => setInputs(p => ({ ...p, x: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Sample Size (n)</label>
                      <input type="number" value={inputs.n} onChange={e => setInputs(p => ({ ...p, n: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Hypothesized Proportion (p₀)</label>
                      <input type="number" step="0.01" min="0" max="1" value={inputs.p0} onChange={e => setInputs(p => ({ ...p, p0: e.target.value }))} />
                    </div>
                  </div>
                )}

                {TESTS.find(t => t.id === selectedTest)?.inputs === '2prop' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Group 1 — Events (x₁)</label>
                      <input type="number" value={inputs.x1} onChange={e => setInputs(p => ({ ...p, x1: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Group 1 — Sample Size (n₁)</label>
                      <input type="number" value={inputs.n1} onChange={e => setInputs(p => ({ ...p, n1: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Group 2 — Events (x₂)</label>
                      <input type="number" value={inputs.x2} onChange={e => setInputs(p => ({ ...p, x2: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Group 2 — Sample Size (n₂)</label>
                      <input type="number" value={inputs.n2} onChange={e => setInputs(p => ({ ...p, n2: e.target.value }))} />
                    </div>
                  </div>
                )}

                {/* Contingency table inputs (Chi-Square Independence + Fisher's Exact) */}
                {TESTS.find(t => t.id === selectedTest)?.inputs === 'contingency' && (
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Enter observed counts for each combination of the two categorical variables.
                      {selectedTest === 'fisher' && ' Fisher\'s Exact Test only supports a 2×2 table.'}
                    </p>
                    {selectedTest === 'chi2indep' && (
                      <div className="form-grid" style={{ marginBottom: '1rem' }}>
                        <div className="form-group">
                          <label>Rows</label>
                          <select value={inputs.tableRows} onChange={e => {
                            const rows = parseInt(e.target.value);
                            setInputs(p => {
                              const newTable = Array.from({ length: rows }, (_, i) => p.table[i] || Array.from({ length: p.tableCols }, () => ''));
                              return { ...p, tableRows: rows, table: newTable };
                            });
                          }}>
                            {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Columns</label>
                          <select value={inputs.tableCols} onChange={e => {
                            const cols = parseInt(e.target.value);
                            setInputs(p => {
                              const newTable = p.table.map(row => Array.from({ length: cols }, (_, j) => row[j] || ''));
                              return { ...p, tableCols: cols, table: newTable };
                            });
                          }}>
                            {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    <table className="data-table" style={{ width: 'auto' }}>
                      <tbody>
                        {inputs.table.map((row, i) => (
                          <tr key={i}>
                            {row.map((val, j) => (
                              <td key={j}>
                                <input type="number" value={val} style={{ width: '80px' }}
                                  onChange={e => setInputs(p => {
                                    const newTable = p.table.map(r => [...r]);
                                    newTable[i][j] = e.target.value;
                                    return { ...p, table: newTable };
                                  })} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {error && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}
                <button className="btn-primary" style={{ marginTop: '1.25rem' }} onClick={runTest}>Run Test</button>
              </div>

              {result && (
                <div ref={resultRef}>
                  <ResultBox result={result} testId={selectedTest} />
                </div>
              )}
              {result && (
                <button className="btn-primary no-print" style={{ marginTop: '1rem' }} onClick={handleAddToReport}>
                  {addedToReport ? '✓ Added to Report' : 'Add to Report'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

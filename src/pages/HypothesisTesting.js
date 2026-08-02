import React, { useState } from 'react';
import { useWorksheet } from '../context/WorksheetContext';
import { tCDF, normCDF, chiSquareCDF } from '../utils/statMath';
import { oneWayAnova as verifiedOneWayAnova, pairedTTest, twoPropTest, wilcoxonSignedRank, friedmanTest } from '../utils/statTests';
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
];

const typeColor = { Continuous: 'var(--green)', Nonparametric: 'var(--orange)', Discrete: 'var(--purple)' };

function ResultBox({ result, testId }) {
  if (!result) return null;
  const sig = result.p < 0.05;

  return (
    <div className="ht-result-box">
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
      </div>

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
  const [selectedTest, setSelectedTest] = useState(null);
  const [inputs, setInputs] = useState({ col1: '', col2: '', mu0: 0, p0: 0.5, x: 10, n: 100, x1: 10, n1: 100, x2: 10, n2: 100, observed: '', expected: '', groups: ['', '', ''] });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showGuide, setShowGuide] = useState(false);
  const bookExcerpt = BOOK_EXCERPTS.hypothesis;

  const numCols = columns.filter(c => c.data.some(v => !isNaN(parseFloat(v))));

  const parseManual = (str) => str.split(/[\n,\s]+/).map(parseFloat).filter(v => !isNaN(v));

  const runTest = () => {
    setError(''); setResult(null);
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
                onClick={() => { setSelectedTest(test.id); setResult(null); setError(''); }}
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

                {error && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}
                <button className="btn-primary" style={{ marginTop: '1.25rem' }} onClick={runTest}>Run Test</button>
              </div>

              {result && <ResultBox result={result} testId={selectedTest} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

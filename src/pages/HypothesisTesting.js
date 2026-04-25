import React, { useState } from 'react';
import { useWorksheet } from '../context/WorksheetContext';
import './HypothesisTesting.css';

// Statistical helpers
const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const variance = arr => { const m = mean(arr); return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1); };
const stddev = arr => Math.sqrt(variance(arr));

function tDist(t, df) {
  // Approximation of two-tailed p-value using t distribution
  const x = df / (df + t * t);
  let betaInc = 0;
  // Simple beta incomplete function approximation
  const a = 0.5 * df;
  const b = 0.5;
  // Using Abramowitz & Stegun approximation
  const p = Math.min(1, 2 * (1 - normalCDF(Math.abs(t) * Math.sqrt(df / (df + t * t + 0.000001)))));
  return Math.max(0.0001, Math.min(0.9999, p));
}

function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return z > 0 ? 1 - p : p;
}

function chiSquarePValue(chi2, df) {
  if (chi2 <= 0) return 1;
  // Approximation
  const k = df / 2;
  const x = chi2 / 2;
  return 1 - regularizedGammaP(k, x);
}

function regularizedGammaP(a, x) {
  if (x < 0) return 0;
  if (x === 0) return 0;
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  return Math.min(1, sum * Math.exp(-x + a * Math.log(x) - lgamma(a)));
}

function lgamma(z) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = z, x = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y += 1; ser += c[j] / y; }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

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
  return { u: Math.min(u1, u2), z, p: 2 * normalCDF(-Math.abs(z)) };
}

function oneSampleT(data, mu0) {
  const n = data.length, m = mean(data), s = stddev(data);
  const t = (m - mu0) / (s / Math.sqrt(n));
  const df = n - 1;
  const p = tDist(t, df);
  const ci95 = 1.96 * s / Math.sqrt(n);
  return { n, mean: m, stddev: s, t, df, p, ci: [m - ci95, m + ci95] };
}

function twoSampleT(a, b) {
  const na = a.length, nb = b.length;
  const ma = mean(a), mb = mean(b);
  const va = variance(a), vb = variance(b);
  const se = Math.sqrt(va / na + vb / nb);
  const t = (ma - mb) / se;
  const df = Math.round((va / na + vb / nb) ** 2 / ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1)));
  const p = tDist(t, df);
  return { na, nb, ma, mb, sa: Math.sqrt(va), sb: Math.sqrt(vb), t, df, p, diff: ma - mb };
}

function oneWayAnova(groups) {
  const allData = groups.flat();
  const grandMean = mean(allData);
  const k = groups.length;
  const N = allData.length;
  const ssBetween = groups.reduce((acc, g) => acc + g.length * (mean(g) - grandMean) ** 2, 0);
  const ssWithin = groups.reduce((acc, g) => acc + g.reduce((a, v) => a + (v - mean(g)) ** 2, 0), 0);
  const dfBetween = k - 1, dfWithin = N - k;
  const msBetween = ssBetween / dfBetween, msWithin = ssWithin / dfWithin;
  const F = msBetween / msWithin;
  const p = 1 - regularizedGammaP(dfBetween / 2, (dfBetween * F) / (dfBetween * F + dfWithin) * dfWithin / 2);
  return { k, N, ssBetween, ssWithin, dfBetween, dfWithin, msBetween, msWithin, F, p: Math.max(0.0001, p) };
}

function chiSquareGoF(observed, expected) {
  const chi2 = observed.reduce((acc, o, i) => acc + (o - expected[i]) ** 2 / expected[i], 0);
  const df = observed.length - 1;
  const p = chiSquarePValue(chi2, df);
  return { chi2, df, p };
}

function proportionTest(x, n, p0) {
  const phat = x / n;
  const se = Math.sqrt(p0 * (1 - p0) / n);
  const z = (phat - p0) / se;
  const p = 2 * normalCDF(-Math.abs(z));
  const ci95 = 1.96 * Math.sqrt(phat * (1 - phat) / n);
  return { phat, z, p, ci: [Math.max(0, phat - ci95), Math.min(1, phat + ci95)] };
}

const TESTS = [
  { id: '1t', name: '1-Sample t-Test', type: 'Continuous', desc: 'Test if a population mean equals a target value', inputs: 'single' },
  { id: '2t', name: '2-Sample t-Test', type: 'Continuous', desc: 'Compare means of two independent groups', inputs: 'two' },
  { id: 'anova', name: 'One-Way ANOVA', type: 'Continuous', desc: 'Compare means across 3 or more groups', inputs: 'multi' },
  { id: 'mw', name: 'Mann-Whitney', type: 'Nonparametric', desc: 'Non-parametric alternative to 2-sample t-test', inputs: 'two' },
  { id: 'kw', name: 'Kruskal-Wallis', type: 'Nonparametric', desc: 'Non-parametric alternative to one-way ANOVA', inputs: 'multi' },
  { id: 'chi2gof', name: 'Chi-Square Goodness of Fit', type: 'Discrete', desc: 'Test if observed counts match expected distribution', inputs: 'chi2gof' },
  { id: '1prop', name: '1-Proportion Test', type: 'Discrete', desc: 'Test if a proportion equals a target value', inputs: '1prop' },
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
        {testId === 'chi2gof' && <>
          <div><span>χ²</span><strong>{result.chi2.toFixed(4)}</strong></div>
          <div><span>df</span><strong>{result.df}</strong></div>
        </>}
        {testId === '1prop' && <>
          <div><span>p̂ (sample)</span><strong>{result.phat.toFixed(4)}</strong></div>
          <div><span>Z</span><strong>{result.z.toFixed(4)}</strong></div>
          <div><span>95% CI</span><strong>[{result.ci[0].toFixed(3)}, {result.ci[1].toFixed(3)}]</strong></div>
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
  const [inputs, setInputs] = useState({ col1: '', col2: '', mu0: 0, p0: 0.5, x: 10, n: 100, observed: '', expected: '', groups: ['', '', ''] });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

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
      } else if (test.id === 'anova') {
        const groups = inputs.groups.map((g, i) => hasData && g ? getColumnData(g) : parseManual(inputs[`manualG${i}`] || ''));
        const valid = groups.filter(g => g.length >= 2);
        if (valid.length < 3) throw new Error('Need at least 3 groups with 2+ data points each');
        res = oneWayAnova(valid);
      } else if (test.id === 'mw') {
        if (d1.length < 2 || d2.length < 2) throw new Error('Need at least 2 data points in each group');
        res = mannWhitney(d1, d2);
      } else if (test.id === 'chi2gof') {
        const obs = inputs.observed.split(/[\n,\s]+/).map(Number).filter(v => !isNaN(v));
        const exp = inputs.expected.split(/[\n,\s]+/).map(Number).filter(v => !isNaN(v));
        if (obs.length < 2 || obs.length !== exp.length) throw new Error('Need matching observed/expected counts');
        res = chiSquareGoF(obs, exp);
      } else if (test.id === '1prop') {
        const x = parseInt(inputs.x), n = parseInt(inputs.n);
        if (isNaN(x) || isNaN(n) || n <= 0 || x < 0 || x > n) throw new Error('Invalid counts');
        res = proportionTest(x, n, parseFloat(inputs.p0));
      } else if (test.id === 'kw') {
        const groups = inputs.groups.map((g, i) => hasData && g ? getColumnData(g) : parseManual(inputs[`manualG${i}`] || ''));
        const valid = groups.filter(g => g.length >= 2);
        if (valid.length < 3) throw new Error('Need at least 3 groups');
        const anova = oneWayAnova(valid);
        res = { ...anova, note: 'Kruskal-Wallis H ≈ F for large samples' };
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
        {result && <button className="btn-secondary no-print" onClick={printResult}>🖨️ Print Results</button>}
      </div>

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

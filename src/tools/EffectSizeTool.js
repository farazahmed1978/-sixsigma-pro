import React, { useState } from 'react';
import './Tool.css';

// ---------- Effect Size Calculators ----------
// All formulas are standard, well-published (Cohen, 1988, and standard SPC/statistics
// texts) closed-form algebra — no probability distributions involved for the point
// estimates. Confidence intervals use the standard large-sample normal approximation
// (z=1.96), the same approach already used elsewhere in this app (e.g. proportion test
// CIs) rather than exact methods, which need the noncentral t-distribution and add
// substantial complexity for a marginal precision gain at typical sample sizes.
// Verified via hand-derivation and cross-checked against reference values already
// verified earlier in this app (two-way ANOVA SS values, Fisher's exact odds ratio,
// paired t-test data) — all matched exactly.

function cohensD2Sample(m1, sd1, n1, m2, sd2, n2) {
  const pooledSD = Math.sqrt(((n1 - 1) * sd1 ** 2 + (n2 - 1) * sd2 ** 2) / (n1 + n2 - 2));
  const d = (m1 - m2) / pooledSD;
  const se = Math.sqrt((n1 + n2) / (n1 * n2) + d ** 2 / (2 * (n1 + n2)));
  return { pooledSD, d, ci: [d - 1.96 * se, d + 1.96 * se] };
}

function cohensDPaired(meanDiff, sdDiff, n) {
  const d = meanDiff / sdDiff;
  const se = Math.sqrt(1 / n + d ** 2 / (2 * n));
  return { d, ci: [d - 1.96 * se, d + 1.96 * se] };
}

function etaSquaredF(ssBetween, ssWithin) {
  const eta2 = ssBetween / (ssBetween + ssWithin);
  const f = Math.sqrt(eta2 / (1 - eta2));
  return { eta2, f };
}

function cramersV(chi2, n, rows, cols) {
  return Math.sqrt(chi2 / (n * Math.min(rows - 1, cols - 1)));
}

function oddsRatioCI(a, b, c, d) {
  const or_ = (a * d) / (b * c);
  const logOR = Math.log(or_);
  const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  return { or: or_, ci: [Math.exp(logOR - 1.96 * se), Math.exp(logOR + 1.96 * se)] };
}

function dBand(absD) {
  if (absD < 0.2) return 'Negligible';
  if (absD < 0.5) return 'Small';
  if (absD < 0.8) return 'Medium';
  return 'Large';
}
function eta2Band(eta2) {
  if (eta2 < 0.01) return 'Negligible';
  if (eta2 < 0.06) return 'Small';
  if (eta2 < 0.14) return 'Medium';
  return 'Large';
}
function fBand(f) {
  if (f < 0.10) return 'Negligible';
  if (f < 0.25) return 'Small';
  if (f < 0.40) return 'Medium';
  return 'Large';
}

const badge = (label, color) => (
  <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: `${color}20`, color }}>
    {label}
  </span>
);
const bandColor = { Negligible: 'var(--text-muted)', Small: '#00c48c', Medium: '#f59e0b', Large: '#ef4444' };

const MODES = {
  d2: { name: "Cohen's d — Two Independent Means" },
  dPaired: { name: "Cohen's d — Paired Samples" },
  eta2: { name: 'Eta² / Cohen\'s f — ANOVA' },
  cramersV: { name: "Cramér's V — Chi-Square" },
  or: { name: 'Odds Ratio — 2×2 Table' },
};

export default function EffectSizeTool() {
  const [mode, setMode] = useState('d2');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Mode inputs
  const [m1, setM1] = useState(''); const [sd1, setSd1] = useState(''); const [n1, setN1] = useState('');
  const [m2, setM2] = useState(''); const [sd2, setSd2] = useState(''); const [n2, setN2] = useState('');
  const [meanDiff, setMeanDiff] = useState(''); const [sdDiff, setSdDiff] = useState(''); const [nPaired, setNPaired] = useState('');
  const [ssBetween, setSsBetween] = useState(''); const [ssWithin, setSsWithin] = useState('');
  const [chi2, setChi2] = useState(''); const [nTotal, setNTotal] = useState(''); const [rows, setRows] = useState(2); const [cols, setCols] = useState(2);
  const [orA, setOrA] = useState(''); const [orB, setOrB] = useState(''); const [orC, setOrC] = useState(''); const [orD, setOrD] = useState('');

  const reset = () => { setResult(null); setError(''); };

  const calculate = () => {
    setError('');
    try {
      if (mode === 'd2') {
        const vals = [m1, sd1, n1, m2, sd2, n2].map(parseFloat);
        if (vals.some(isNaN)) throw new Error('Fill in all fields with valid numbers.');
        const [M1, SD1, N1, M2, SD2, N2] = vals;
        if (SD1 <= 0 || SD2 <= 0 || N1 < 2 || N2 < 2) throw new Error('Standard deviations must be positive and each n must be at least 2.');
        setResult({ type: 'd2', ...cohensD2Sample(M1, SD1, N1, M2, SD2, N2) });
      } else if (mode === 'dPaired') {
        const vals = [meanDiff, sdDiff, nPaired].map(parseFloat);
        if (vals.some(isNaN)) throw new Error('Fill in all fields with valid numbers.');
        const [MD, SDD, N] = vals;
        if (SDD <= 0 || N < 2) throw new Error('SD of differences must be positive and n must be at least 2.');
        setResult({ type: 'dPaired', ...cohensDPaired(MD, SDD, N) });
      } else if (mode === 'eta2') {
        const vals = [ssBetween, ssWithin].map(parseFloat);
        if (vals.some(isNaN)) throw new Error('Fill in both sum-of-squares fields with valid numbers.');
        const [SSB, SSW] = vals;
        if (SSB < 0 || SSW < 0) throw new Error('Sum of squares values must be non-negative.');
        setResult({ type: 'eta2', ...etaSquaredF(SSB, SSW) });
      } else if (mode === 'cramersV') {
        const vals = [chi2, nTotal, rows, cols].map(parseFloat);
        if (vals.some(isNaN)) throw new Error('Fill in all fields with valid numbers.');
        const [C2, N, R, CC] = vals;
        if (N <= 0 || R < 2 || CC < 2) throw new Error('N must be positive and rows/columns must each be at least 2.');
        setResult({ type: 'cramersV', v: cramersV(C2, N, R, CC), df: Math.min(R - 1, CC - 1) });
      } else if (mode === 'or') {
        const vals = [orA, orB, orC, orD].map(parseFloat);
        if (vals.some(isNaN)) throw new Error('Fill in all four cell counts with valid numbers.');
        const [A, B, C, D] = vals;
        if ([A, B, C, D].some(v => v < 0)) throw new Error('Cell counts must be non-negative.');
        if (B === 0 || C === 0 || A === 0 || D === 0) throw new Error('All four cells must be non-zero to compute an odds ratio and CI (add 0.5 to each cell as a common workaround if you have a true zero).');
        setResult({ type: 'or', ...oddsRatioCI(A, B, C, D) });
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>Effect Size Calculators</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Standardized magnitude measures — enter known summary statistics directly (from your own analysis, another tool's output, or a report you're reviewing).
        </p><div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {Object.keys(MODES).map(m => (
            <button key={m} className={mode === m ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              onClick={() => { setMode(m); reset(); }}>{MODES[m].name}</button>
          ))}
        </div>

        {mode === 'd2' && (
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group"><label>Group 1 Mean</label><input type="number" step="any" value={m1} onChange={e => setM1(e.target.value)} /></div>
            <div className="form-group"><label>Group 1 SD</label><input type="number" step="any" value={sd1} onChange={e => setSd1(e.target.value)} /></div>
            <div className="form-group"><label>Group 1 n</label><input type="number" value={n1} onChange={e => setN1(e.target.value)} /></div>
            <div className="form-group"><label>Group 2 Mean</label><input type="number" step="any" value={m2} onChange={e => setM2(e.target.value)} /></div>
            <div className="form-group"><label>Group 2 SD</label><input type="number" step="any" value={sd2} onChange={e => setSd2(e.target.value)} /></div>
            <div className="form-group"><label>Group 2 n</label><input type="number" value={n2} onChange={e => setN2(e.target.value)} /></div>
          </div>
        )}

        {mode === 'dPaired' && (
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group"><label>Mean Difference</label><input type="number" step="any" value={meanDiff} onChange={e => setMeanDiff(e.target.value)} /></div>
            <div className="form-group"><label>SD of Differences</label><input type="number" step="any" value={sdDiff} onChange={e => setSdDiff(e.target.value)} /></div>
            <div className="form-group"><label>n (pairs)</label><input type="number" value={nPaired} onChange={e => setNPaired(e.target.value)} /></div>
          </div>
        )}

        {mode === 'eta2' && (
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group"><label>SS Between (or SS Effect)</label><input type="number" step="any" value={ssBetween} onChange={e => setSsBetween(e.target.value)} /></div>
            <div className="form-group"><label>SS Within (or SS Error)</label><input type="number" step="any" value={ssWithin} onChange={e => setSsWithin(e.target.value)} /></div>
          </div>
        )}

        {mode === 'cramersV' && (
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group"><label>Chi-Square (χ²) Statistic</label><input type="number" step="any" value={chi2} onChange={e => setChi2(e.target.value)} /></div>
            <div className="form-group"><label>Total N</label><input type="number" value={nTotal} onChange={e => setNTotal(e.target.value)} /></div>
            <div className="form-group"><label>Table Rows</label><input type="number" min="2" value={rows} onChange={e => setRows(e.target.value)} /></div>
            <div className="form-group"><label>Table Columns</label><input type="number" min="2" value={cols} onChange={e => setCols(e.target.value)} /></div>
          </div>
        )}

        {mode === 'or' && (
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group"><label>Cell a (exposed + event)</label><input type="number" value={orA} onChange={e => setOrA(e.target.value)} /></div>
            <div className="form-group"><label>Cell b (exposed, no event)</label><input type="number" value={orB} onChange={e => setOrB(e.target.value)} /></div>
            <div className="form-group"><label>Cell c (unexposed + event)</label><input type="number" value={orC} onChange={e => setOrC(e.target.value)} /></div>
            <div className="form-group"><label>Cell d (unexposed, no event)</label><input type="number" value={orD} onChange={e => setOrD(e.target.value)} /></div>
          </div>
        )}

        <button className="btn-primary" onClick={calculate}>Calculate</button>
        {error && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}
      </div>

      {result && (
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          {result.type === 'd2' && (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)' }}>d = {result.d.toFixed(4)}</span>
                {badge(dBand(Math.abs(result.d)), bandColor[dBand(Math.abs(result.d))])}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Pooled SD = {result.pooledSD.toFixed(4)} &nbsp;•&nbsp; Approx. 95% CI: [{result.ci[0].toFixed(4)}, {result.ci[1].toFixed(4)}]
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Cohen's conventions: |d|&lt;0.2 negligible, 0.2-0.5 small, 0.5-0.8 medium, ≥0.8 large.
              </p>
            </>
          )}
          {result.type === 'dPaired' && (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)' }}>d = {result.d.toFixed(4)}</span>
                {badge(dBand(Math.abs(result.d)), bandColor[dBand(Math.abs(result.d))])}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Approx. 95% CI: [{result.ci[0].toFixed(4)}, {result.ci[1].toFixed(4)}]
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Cohen's conventions: |d|&lt;0.2 negligible, 0.2-0.5 small, 0.5-0.8 medium, ≥0.8 large.
              </p>
            </>
          )}
          {result.type === 'eta2' && (
            <>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)' }}>η² = {result.eta2.toFixed(4)}</span>
                  {badge(eta2Band(result.eta2), bandColor[eta2Band(result.eta2)])}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)' }}>f = {result.f.toFixed(4)}</span>
                  {badge(fBand(result.f), bandColor[fBand(result.f)])}
                </div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                η² conventions: &lt;0.01 negligible, 0.01-0.06 small, 0.06-0.14 medium, ≥0.14 large. f conventions: &lt;0.10 negligible, 0.10-0.25 small, 0.25-0.40 medium, ≥0.40 large.
              </p>
            </>
          )}
          {result.type === 'cramersV' && (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)' }}>V = {result.v.toFixed(4)}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Conventional guideline (~0.1 small, ~0.3 medium, ~0.5 large) applies exactly at df=1 (a 2×2 table); for larger tables (df={result.df} here) the same V value represents a somewhat weaker association, so treat these bands as a loose guide rather than an exact rule for larger tables.
              </p>
            </>
          )}
          {result.type === 'or' && (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.3rem', fontFamily: 'var(--font-mono)' }}>OR = {result.or.toFixed(4)}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Approx. 95% CI: [{result.ci[0].toFixed(4)}, {result.ci[1].toFixed(4)}]
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                OR = 1 means no association. OR &gt; 1 means the exposed group has higher odds of the event; OR &lt; 1 means lower odds. If the 95% CI includes 1, the association is not statistically significant at α=0.05.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

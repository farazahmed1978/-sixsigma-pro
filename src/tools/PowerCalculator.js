import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useReport } from '../context/ReportContext';
import { interpretPower } from '../utils/interpretations';
import { invNorm, normCDF } from '../utils/statMath';
import './Tool.css';

const POWER_TABLE = { '80': 0.80, '90': 0.90, '95': 0.95 };
const ALPHA_TABLE = { '0.10': 0.10, '0.05': 0.05, '0.01': 0.01 };

export default function PowerCalculator() {
  const { addReportItem } = useReport();
  const wrapperRef = useRef(null);
  const [mode, setMode] = useState('solveForN'); // 'solveForN' | 'solveForPower'
  const [effectSize, setEffectSize] = useState('');
  const [stdDev, setStdDev] = useState('');
  const [alpha, setAlpha] = useState('0.05');
  const [targetPower, setTargetPower] = useState('80');
  const [sampleSize, setSampleSize] = useState('');
  const [results, setResults] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const calculate = () => {
    const delta = +effectSize, sd = +stdDev, a = ALPHA_TABLE[alpha];
    if (!delta || !sd || !a) return;
    const zAlphaTwoTailed = invNorm(1 - a / 2);

    if (mode === 'solveForN') {
      const power = POWER_TABLE[targetPower];
      const zBeta = invNorm(power);
      const n = Math.ceil((((zAlphaTwoTailed + zBeta) ** 2) * 2 * sd ** 2) / (delta ** 2));
      setResults({ mode, n, power, effectSize: delta, stdDev: sd, alpha: a });
    } else {
      const n = +sampleSize;
      if (!n) return;
      const zBeta = Math.sqrt((delta ** 2 * n) / (2 * sd ** 2)) - zAlphaTwoTailed;
      const power = normCDF(zBeta);
      setResults({ mode, n, power, effectSize: delta, stdDev: sd, alpha: a });
    }
    setAddedToReport(false);
  };

  const handleAddToReport = useCallback(async () => {
    if (!wrapperRef.current || !results) return;

    const canvas = await html2canvas(wrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretPower(results);

    addReportItem({
      title: `Power / Sample Size Calculator — ${results.mode === 'solveForN' ? 'Solve for N' : 'Solve for Power'}`,
      toolId: 'power-calculator',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'Mode': results.mode === 'solveForN' ? 'Solve for Sample Size' : 'Solve for Power',
        'Effect Size (Δ)': results.effectSize,
        'Std Dev': results.stdDev,
        'Alpha': results.alpha,
        'Power': (results.power * 100).toFixed(1) + '%',
        'n per group': results.n,
      },
      interpretation,
      rawData: [],
    });

    setAddedToReport(true);
  }, [results, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>Power / Sample Size Calculator</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          For a two-sample comparison of means. Uses a normal-distribution approximation rather than the exact noncentral t-distribution — a solid planning estimate, not a substitute for dedicated stats software on high-stakes designs.
        </p>

        <div className="form-group" style={{ maxWidth: 320, marginBottom: '0.75rem' }}>
          <label>What do you want to solve for?</label>
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="solveForN">Required sample size (given target power)</option>
            <option value="solveForPower">Achieved power (given a sample size)</option>
          </select>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Effect Size to Detect (Δ, difference in means)</label>
            <input type="number" step="any" value={effectSize} onChange={e => setEffectSize(e.target.value)} placeholder="e.g. 1.5" />
          </div>
          <div className="form-group">
            <label>Estimated Std Dev (pooled)</label>
            <input type="number" step="any" value={stdDev} onChange={e => setStdDev(e.target.value)} placeholder="e.g. 2.0" />
          </div>
          <div className="form-group">
            <label>Alpha (Type I error rate)</label>
            <select value={alpha} onChange={e => setAlpha(e.target.value)}>
              {Object.keys(ALPHA_TABLE).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {mode === 'solveForN' ? (
            <div className="form-group">
              <label>Target Power</label>
              <select value={targetPower} onChange={e => setTargetPower(e.target.value)}>
                {Object.keys(POWER_TABLE).map(p => <option key={p} value={p}>{p}%</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Sample Size per Group</label>
              <input type="number" min="2" value={sampleSize} onChange={e => setSampleSize(e.target.value)} placeholder="e.g. 30" />
            </div>
          )}
        </div>
        <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={calculate} disabled={!effectSize || !stdDev || (mode === 'solveForPower' && !sampleSize)}>Calculate</button>
      </div>

      {results && (
        <>
          <div ref={wrapperRef}>
            <div className="stat-grid">
              {results.mode === 'solveForN' ? (
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>{results.n}</div>
                  <div className="stat-label">Required n per Group</div>
                </div>
              ) : (
                <div className="stat-card">
                  <div className="stat-value" style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', color: results.power >= 0.8 ? 'var(--green)' : 'var(--red)' }}>{(results.power * 100).toFixed(1)}%</div>
                  <div className="stat-label">Achieved Power</div>
                </div>
              )}
              <div className="stat-card"><div className="stat-value" style={{ fontFamily: 'var(--font-mono)' }}>{results.effectSize}</div><div className="stat-label">Effect Size (Δ)</div></div>
              <div className="stat-card"><div className="stat-value" style={{ fontFamily: 'var(--font-mono)' }}>{results.alpha}</div><div className="stat-label">Alpha</div></div>
            </div>
            {results.mode === 'solveForPower' && (
              <div className={`alert ${results.power >= 0.8 ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: '0.75rem' }}>
                {results.power >= 0.8 ? `✓ Adequate power (${(results.power * 100).toFixed(1)}% ≥ 80%).` : `✕ Underpowered (${(results.power * 100).toFixed(1)}% < 80%) — increase sample size or accept a larger minimum detectable effect.`}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>
              {addedToReport ? '✓ Added to Report' : '📄 Add to Report'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

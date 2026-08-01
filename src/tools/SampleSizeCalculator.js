import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useReport } from '../context/ReportContext';
import { interpretSampleSize } from '../utils/interpretations';
import { Z_TABLE } from '../utils/statMath';
import './Tool.css';

export default function SampleSizeCalculator() {
  const { addReportItem } = useReport();
  const wrapperRef = useRef(null);
  const [mode, setMode] = useState('continuous'); // 'continuous' | 'proportion'
  const [confidenceLevel, setConfidenceLevel] = useState('95');
  const [marginOfError, setMarginOfError] = useState('');
  const [stdDev, setStdDev] = useState('');
  const [proportion, setProportion] = useState('0.5');
  const [results, setResults] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const calculate = () => {
    const z = Z_TABLE[confidenceLevel];
    const E = +marginOfError;
    if (!E || !z) return;

    let n;
    if (mode === 'continuous') {
      const sd = +stdDev;
      if (!sd) return;
      n = Math.ceil(((z * sd) / E) ** 2);
    } else {
      const p = +proportion;
      if (p <= 0 || p >= 1) return;
      n = Math.ceil((z ** 2 * p * (1 - p)) / (E ** 2));
    }

    setResults({ mode, n, confidenceLevel, marginOfError: E, stdDev: +stdDev, proportion: +proportion });
    setAddedToReport(false);
  };

  const handleAddToReport = useCallback(async () => {
    if (!wrapperRef.current || !results) return;

    const canvas = await html2canvas(wrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretSampleSize(results);

    addReportItem({
      title: `Sample Size Calculator — ${results.mode === 'continuous' ? 'Mean Estimation' : 'Proportion Estimation'}`,
      toolId: 'sample-size-calculator',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'Mode': results.mode === 'continuous' ? 'Mean (continuous data)' : 'Proportion (attribute data)',
        'Confidence Level': results.confidenceLevel + '%',
        'Margin of Error': results.marginOfError,
        ...(results.mode === 'continuous' ? { 'Est. Std Dev': results.stdDev } : { 'Est. Proportion': results.proportion }),
        'Required Sample Size': results.n,
      },
      interpretation,
      rawData: [],
    });

    setAddedToReport(true);
  }, [results, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>Sample Size Calculator</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Determines the minimum sample size needed to estimate a population mean or proportion within a target margin of error.
        </p>

        <div className="form-group" style={{ maxWidth: 320, marginBottom: '0.75rem' }}>
          <label>What are you estimating?</label>
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="continuous">A mean (continuous data)</option>
            <option value="proportion">A proportion (pass/fail, defect rate)</option>
          </select>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Confidence Level</label>
            <select value={confidenceLevel} onChange={e => setConfidenceLevel(e.target.value)}>
              {Object.keys(Z_TABLE).map(l => <option key={l} value={l}>{l}%</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Margin of Error {mode === 'proportion' ? '(as a decimal, e.g. 0.05 = 5pp)' : ''}</label>
            <input type="number" step="any" value={marginOfError} onChange={e => setMarginOfError(e.target.value)} placeholder={mode === 'continuous' ? 'e.g. 0.5' : 'e.g. 0.05'} />
          </div>
          {mode === 'continuous' ? (
            <div className="form-group">
              <label>Estimated Std Dev</label>
              <input type="number" step="any" value={stdDev} onChange={e => setStdDev(e.target.value)} placeholder="e.g. 2.1" />
            </div>
          ) : (
            <div className="form-group">
              <label>Estimated Proportion (0.5 if unknown)</label>
              <input type="number" step="any" min="0" max="1" value={proportion} onChange={e => setProportion(e.target.value)} placeholder="0.5" />
            </div>
          )}
        </div>
        <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={calculate} disabled={!marginOfError || (mode === 'continuous' ? !stdDev : !proportion)}>Calculate</button>
      </div>

      {results && (
        <>
          <div ref={wrapperRef}>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-value" style={{ fontSize: '1.8rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>{results.n}</div>
                <div className="stat-label">Required Sample Size</div>
              </div>
              <div className="stat-card"><div className="stat-value" style={{ fontFamily: 'var(--font-mono)' }}>{results.confidenceLevel}%</div><div className="stat-label">Confidence Level</div></div>
              <div className="stat-card"><div className="stat-value" style={{ fontFamily: 'var(--font-mono)' }}>{results.marginOfError}</div><div className="stat-label">Margin of Error</div></div>
            </div>
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

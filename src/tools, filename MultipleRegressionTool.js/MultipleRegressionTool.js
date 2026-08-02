import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import { multipleRegression } from '../utils/statTests';
import { QQPlot, SimpleHistogram } from '../utils/statViews';
import './Tool.css';

const sigBadge = (p) => (
  <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: p < 0.05 ? 'rgba(239,68,68,0.12)' : 'rgba(0,196,140,0.12)', color: p < 0.05 ? '#ef4444' : '#00c48c' }}>
    {p < 0.05 ? 'Significant' : 'Not significant'}
  </span>
);

export default function MultipleRegressionTool() {
  const { getNumericColumns, getColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const resultsRef = useRef(null);

  const [outcomeVar, setOutcomeVar] = useState('');
  const [predictorVars, setPredictorVars] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [addedToReport, setAddedToReport] = useState(false);
  const [showQQ, setShowQQ] = useState(false);
  const [showHist, setShowHist] = useState(false);

  const numCols = getNumericColumns ? getNumericColumns() : [];

  const togglePredictor = (name) => setPredictorVars(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);

  const run = () => {
    setError('');
    setAddedToReport(false);
    if (!outcomeVar || predictorVars.length < 1) return;
    try {
      const y = getColumnData(outcomeVar);
      const predictorData = predictorVars.map(v => getColumnData(v));
      const minLen = Math.min(y.length, ...predictorData.map(d => d.length));
      const X = [];
      const yTrimmed = [];
      for (let i = 0; i < minLen; i++) {
        const row = predictorData.map(d => d[i]);
        if (!isNaN(y[i]) && row.every(v => !isNaN(v))) {
          X.push(row);
          yTrimmed.push(y[i]);
        }
      }
      if (X.length < predictorVars.length + 3) {
        throw new Error(`Need at least ${predictorVars.length + 3} complete rows for ${predictorVars.length} predictors (have ${X.length}).`);
      }
      setResult(multipleRegression(X, yTrimmed, predictorVars));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddToReport = useCallback(async () => {
    if (!resultsRef.current || !result) return;
    const canvas = await html2canvas(resultsRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const eqn = result.coefStats.map((c, i) => i === 0 ? c.coef.toFixed(3) : `${c.coef >= 0 ? '+' : ''}${c.coef.toFixed(3)}×${c.name}`).join(' ');
    const interpretation = `${outcomeVar} = ${eqn}. The model explains ${(result.r2 * 100).toFixed(1)}% of the variation in ${outcomeVar} (R²=${result.r2.toFixed(4)}, adjusted R²=${result.adjR2.toFixed(4)}). The overall model is ${result.pF < 0.05 ? '' : 'not '}statistically significant (F(${result.dfModel},${result.dfResidual})=${result.F.toFixed(3)}, p=${result.pF < 0.001 ? '<0.001' : result.pF.toFixed(4)}). ${result.coefStats.filter((c, i) => i > 0 && c.p < 0.05).map(c => c.name).join(', ') || 'No predictors'} individually reach significance at α=0.05.`;

    addReportItem({
      title: `Multiple Regression — ${outcomeVar} on ${predictorVars.join(', ')}`,
      toolId: 'multiregression',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: { 'R²': result.r2.toFixed(4), 'Adj R²': result.adjR2.toFixed(4), 'F': result.F.toFixed(3), 'p (model)': result.pF < 0.001 ? '<0.001' : result.pF.toFixed(4) },
      interpretation,
      rawData: result.coefStats.map(c => ({ term: c.name, coefficient: c.coef.toFixed(4), se: c.se.toFixed(4), t: c.t.toFixed(4), p: c.p.toFixed(4) })),
    });
    setAddedToReport(true);
  }, [result, outcomeVar, predictorVars, addReportItem]);

  if (!hasData) {
    return <div style={{ padding: '1.5rem' }}><div className="alert alert-info">Load data into the Worksheet first, then return here to run a multiple regression.</div></div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>Multiple Linear Regression</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Fit an outcome (Y) against two or more predictor (X) variables at once, with coefficients, significance tests, and overall model fit.
        </p>

        <div style={{ marginBottom: '0.75rem' }}><div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Outcome Variable (Y)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {numCols.map(c => (
              <button key={c.name} onClick={() => setOutcomeVar(c.name)}
                style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', border: `1px solid ${outcomeVar === c.name ? 'var(--accent)' : 'var(--border)'}`, background: outcomeVar === c.name ? 'var(--accent-dim)' : 'var(--input-bg)', color: outcomeVar === c.name ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Predictor Variables (X) — select 2 or more, different from Y</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {numCols.filter(c => c.name !== outcomeVar).map(c => (
              <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.35rem 0.75rem', borderRadius: '999px', border: `1px solid ${predictorVars.includes(c.name) ? 'var(--accent)' : 'var(--border)'}`, background: predictorVars.includes(c.name) ? 'var(--accent-dim)' : 'var(--input-bg)', cursor: 'pointer' }}>
                <input type="checkbox" checked={predictorVars.includes(c.name)} onChange={() => togglePredictor(c.name)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <button className="btn-primary" disabled={!outcomeVar || predictorVars.length < 1} onClick={run}>Run Regression</button>
        {error && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}
      </div>

      {result && (
        <div ref={resultsRef}>
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Regression Result</h3>
              {sigBadge(result.pF)}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div>R² = <b>{result.r2.toFixed(4)}</b></div>
              <div>Adj R² = <b>{result.adjR2.toFixed(4)}</b></div>
              <div>F({result.dfModel},{result.dfResidual}) = <b>{result.F.toFixed(3)}</b></div>
              <div>p = <b>{result.pF < 0.001 ? '<0.001' : result.pF.toFixed(4)}</b></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <thead><tr>
                <th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-muted)' }}>Term</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Coefficient</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>SE</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>t</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>p</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}></th>
              </tr></thead>
              <tbody>
                {result.coefStats.map((c, i) => (
                  <tr key={c.name}>
                    <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)', fontWeight: i === 0 ? 400 : 600 }}>{c.name}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.coef.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.se.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.t.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.p < 0.001 ? '<0.001' : c.p.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{i > 0 && sigBadge(c.p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              {outcomeVar} = {result.coefStats.map((c, i) => i === 0 ? c.coef.toFixed(3) : `${c.coef >= 0 ? ' + ' : ' − '}${Math.abs(c.coef).toFixed(3)}×${c.name}`).join('')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button className={showHist ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={() => setShowHist(s => !s)}>Residual Histogram</button>
            <button className={showQQ ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={() => setShowQQ(s => !s)}>Q-Q Plot (Residuals)</button>
          </div>
          {showHist && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><SimpleHistogram data={result.residuals} title="Residual Distribution" /></div>}
          {showQQ && <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}><QQPlot data={result.residuals} title="Q-Q Plot of Residuals" /></div>}

          <button className="btn-primary no-print" onClick={handleAddToReport}>
            {addedToReport ? '✓ Added to Report' : 'Add to Report'}
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import { fitLogisticModel } from '../utils/modelEngine';
import './Tool.css';

const sigBadge = (p) => (
  <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: p < 0.05 ? 'rgba(239,68,68,0.12)' : 'rgba(0,196,140,0.12)', color: p < 0.05 ? '#ef4444' : '#00c48c' }}>
    {p < 0.05 ? 'Significant' : 'Not significant'}
  </span>
);

export default function LogisticRegressionTool() {
  const { getNumericColumns, getCategoricalColumns, getRawColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const resultsRef = useRef(null);

  const [outcomeVar, setOutcomeVar] = useState('');
  const [predictorVars, setPredictorVars] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [addedToReport, setAddedToReport] = useState(false);

  const numCols = getNumericColumns ? getNumericColumns() : [];
  const catCols = getCategoricalColumns ? getCategoricalColumns() : [];
  const predictorColumns = [...numCols.filter(column => column.name !== outcomeVar), ...catCols.filter(column => column.name !== outcomeVar && !numCols.some(numeric => numeric.name === column.name))];

  const togglePredictor = (name) => setPredictorVars(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);

  const run = () => {
    setError('');
    setAddedToReport(false);
    if (!outcomeVar || predictorVars.length < 1) return;
    try {
      const sourceNames=[outcomeVar,...predictorVars],source=sourceNames.map(getRawColumnData),rowCount=Math.max(...source.map(values=>values.length)),rows=Array.from({length:rowCount},(_,index)=>Object.fromEntries(sourceNames.map((name,columnIndex)=>[name,source[columnIndex][index]])));
      setResult(fitLogisticModel({rows,specification:{response:outcomeVar,predictors:predictorVars.map(name => ({name,type:catCols.some(column => column.name === name) ? 'categorical' : 'continuous'}))}}));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddToReport = useCallback(async () => {
    if (!resultsRef.current || !result) return;
    const canvas = await html2canvas(resultsRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const eqn = result.coefStats.map((c, i) => i === 0 ? c.coef.toFixed(3) : `${c.coef >= 0 ? '+' : ''}${c.coef.toFixed(3)}×${c.name}`).join(' ');
    const sigVerdict = result.lrP < 0.05 ? '' : 'not ';
    const interpretation = `Logit(${outcomeVar}) = ${eqn}. The overall model is ${sigVerdict}statistically significant (likelihood-ratio χ²(${result.lrDf})=${result.lrChi2.toFixed(3)}, p=${result.lrP < 0.001 ? '<0.001' : result.lrP.toFixed(4)}), explaining ${(result.mcFaddenR2 * 100).toFixed(1)}% of the variation (McFadden's R²=${result.mcFaddenR2.toFixed(4)}). Classification accuracy at a 0.5 threshold: ${(result.accuracy * 100).toFixed(1)}%. ${result.coefStats.filter((c, i) => i > 0 && c.p < 0.05).map(c => c.name).join(', ') || 'No predictors'} individually reach significance at α=0.05.`;

    addReportItem({
      title: `Logistic Regression — ${outcomeVar} on ${predictorVars.join(', ')}`,
      toolId: 'logistic',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: { 'McFadden R²': result.mcFaddenR2.toFixed(4), 'LR χ²': result.lrChi2.toFixed(3), 'p (model)': result.lrP < 0.001 ? '<0.001' : result.lrP.toFixed(4), 'Accuracy': `${(result.accuracy * 100).toFixed(1)}%` },
      interpretation,
      rawData: result.coefStats.map(c => ({ term: c.name, coefficient: c.coef.toFixed(4), oddsRatio: c.oddsRatio.toFixed(4), se: c.se.toFixed(4), z: c.z.toFixed(4), p: c.p.toFixed(4) })),
      diagnostics: { converged:result.converged, iterations:result.iterations, separation:result.separation, sensitivity:result.sensitivity, specificity:result.specificity, auc:result.auc, warnings:result.warnings },
      provenance: { method:result.method, methodVersion:result.methodVersion, omittedRowIndices:result.omittedRowIndices, variableMappings:{response:outcomeVar,predictors:predictorVars} },
    });
    setAddedToReport(true);
  }, [result, outcomeVar, predictorVars, addReportItem]);

  if (!hasData) {
    return <div style={{ padding: '1.5rem' }}><div className="alert alert-info">Load data into the Worksheet first, then return here to run a logistic regression.</div></div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>Logistic Regression</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Predict a binary outcome (coded 0/1 — e.g. Pass/Fail, Defect/No Defect) from one or more predictor variables, with odds ratios and significance tests.
        </p>

        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Outcome Variable (Y) — must be coded 0/1</div>
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
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Predictor Variables (X) — select 1 or more, different from Y</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {predictorColumns.map(c => (
              <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.35rem 0.75rem', borderRadius: '999px', border: `1px solid ${predictorVars.includes(c.name) ? 'var(--accent)' : 'var(--border)'}`, background: predictorVars.includes(c.name) ? 'var(--accent-dim)' : 'var(--input-bg)', cursor: 'pointer' }}>
                <input type="checkbox" checked={predictorVars.includes(c.name)} onChange={() => togglePredictor(c.name)} />
                {c.name}{catCols.some(column => column.name === c.name) ? ' · categorical' : ''}
              </label>
            ))}
          </div>
        </div>

        <button className="btn-primary" disabled={!outcomeVar || predictorVars.length < 1} onClick={run}>Run Logistic Regression</button>
        {error && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}
      </div>

      {result && (
        <div ref={resultsRef}>
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}>Model Result</h3>
              {sigBadge(result.lrP)}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div>McFadden R² = <b>{result.mcFaddenR2.toFixed(4)}</b></div>
              <div>LR χ²({result.lrDf}) = <b>{result.lrChi2.toFixed(3)}</b></div>
              <div>p = <b>{result.lrP < 0.001 ? '<0.001' : result.lrP.toFixed(4)}</b></div>
              <div>Accuracy = <b>{(result.accuracy * 100).toFixed(1)}%</b></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <thead><tr>
                <th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-muted)' }}>Term</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Coefficient</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>SE</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Z</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>p</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Odds Ratio</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>95% CI (OR)</th>
                <th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}></th>
              </tr></thead>
              <tbody>
                {result.coefStats.map((c, i) => (
                  <tr key={c.name}>
                    <td style={{ padding: '0.4rem', borderTop: '1px solid var(--border)', fontWeight: i === 0 ? 400 : 600 }}>{c.name}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.coef.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.se.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.z.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.p < 0.001 ? '<0.001' : c.p.toFixed(4)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{c.oddsRatio.toFixed(3)}</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>[{c.orCI[0].toFixed(3)}, {c.orCI[1].toFixed(3)}]</td>
                    <td style={{ padding: '0.4rem', textAlign: 'right', borderTop: '1px solid var(--border)' }}>{i > 0 && sigBadge(c.p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              Logit({outcomeVar}) = {result.coefStats.map((c, i) => i === 0 ? c.coef.toFixed(3) : `${c.coef >= 0 ? ' + ' : ' − '}${Math.abs(c.coef).toFixed(3)}×${c.name}`).join('')}
            </p>
          </div>

          <div className="card" style={{padding:'1.25rem',marginBottom:'1rem'}}><h3 className="section-title">Model diagnostics</h3><div style={{display:'flex',gap:'1rem',flexWrap:'wrap'}}><span>Converged <b>{result.converged?'Yes':'No'}</b></span><span>Iterations <b>{result.iterations}</b></span><span>ROC AUC <b>{result.auc?.toFixed(3)||'—'}</b></span><span>Sensitivity <b>{Number.isFinite(result.sensitivity)?(result.sensitivity*100).toFixed(1)+'%':'—'}</b></span><span>Specificity <b>{Number.isFinite(result.specificity)?(result.specificity*100).toFixed(1)+'%':'—'}</b></span></div>{result.warnings.map(warning=><div className="alert alert-warning" key={warning}>{warning}</div>)}</div>

          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div className="section-title" style={{ marginBottom: '0.75rem' }}>Confusion Matrix (0.5 threshold)</div>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th></th>
                  <th style={{ padding: '0.4rem 1rem', color: 'var(--text-muted)' }}>Predicted 0</th>
                  <th style={{ padding: '0.4rem 1rem', color: 'var(--text-muted)' }}>Predicted 1</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.4rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Actual 0</td>
                  <td style={{ padding: '0.4rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{result.confusion.tn}</td>
                  <td style={{ padding: '0.4rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{result.confusion.fp}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.4rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Actual 1</td>
                  <td style={{ padding: '0.4rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{result.confusion.fn}</td>
                  <td style={{ padding: '0.4rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{result.confusion.tp}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button className="btn-primary no-print" onClick={handleAddToReport}>
            {addedToReport ? '✓ Added to Report' : 'Add to Report'}
          </button>
        </div>
      )}
    </div>
  );
}

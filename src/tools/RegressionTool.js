import React, { useState, useCallback, useRef } from 'react';
import { useWorksheet } from '../context/WorksheetContext';
import { Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Line, ResponsiveContainer, ComposedChart } from 'recharts';
import html2canvas from 'html2canvas';
import { useProjectReportPlacement as useReport } from '../context/ProjectPlacementContext';
import { interpretRegression } from '../utils/interpretations';
import { simpleLinearRegression } from '../utils/statisticalEngines';
import { buildAssumptionReport } from '../utils/assumptionDiagnostics';
import AssumptionReportCard from '../components/AssumptionReportCard';

export default function RegressionTool() {
  const { columns, getColumnData, hasData } = useWorksheet();
  const { addReportItem, addReportOnly } = useReport();
  const chartWrapperRef = useRef(null);
  const [yCol, setYCol] = useState('');
  const [xCol, setXCol] = useState('');
  const [result, setResult] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const numCols = columns.filter(c => c.data.some(v => !isNaN(parseFloat(v))));

  const run = () => {
    setAddedToReport(false);
    const y = getColumnData(yCol), x = getColumnData(xCol);
    const n = Math.min(x.length, y.length);
    if (n < 3) return;
    const res = simpleLinearRegression({ x: x.slice(0, n), y: y.slice(0, n), predictorName: xCol });
    const plotData = x.slice(0, n).map((v, i) => ({ x: v, y: y[i], yhat: res.yhat[i] })).sort((a, b) => a.x - b.x);
    setResult({ ...res, plotData, xName: xCol, yName: yCol });
  };

  const handleAddToReport = useCallback(async (reportOnly=false) => {
    if (!chartWrapperRef.current || !result) return;

    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretRegression(result);
    const assumptionReport = buildAssumptionReport({ values: result.residuals, orderedValues: result.residuals });

    (reportOnly?addReportOnly:addReportItem)({
      title: `Regression — ${result.yName} vs ${result.xName}`,
      toolId: 'regression',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'R²': result.r2.toFixed(4),
        'R': result.r.toFixed(4),
        'Intercept (β0)': result.b0.toFixed(4),
        'Slope (β1)': result.b1.toFixed(4),
        'Std Error': result.se.toFixed(4),
        't-statistic': result.t.toFixed(4),
        'n': result.n,
      },
      interpretation,
      assumptionReport,
      provenance: { method: result.method, methodVersion: result.methodVersion, nAnalyzed: result.n, missingHandling: result.missingHandling },
      rawData: result.plotData.map(d => ({ [result.xName]: d.x, [result.yName]: d.y, predicted: d.yhat.toFixed(4) })),
    });

    if(reportOnly)setAddedToReport(previous=>!previous);
  }, [result, addReportItem, addReportOnly]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Regression Analysis</h3>
        {!hasData || numCols.length < 2 ? (
          <div className="alert alert-info">Load at least 2 numeric columns into the Worksheet to run regression.</div>
        ) : (
          <>
            <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label>Response (Y) Column</label>
                <select value={yCol} onChange={e => setYCol(e.target.value)}>
                  <option value="">— select Y —</option>
                  {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Predictor (X) Column</label>
                <select value={xCol} onChange={e => setXCol(e.target.value)}>
                  <option value="">— select X —</option>
                  {numCols.filter(c => c.name !== yCol).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" disabled={!yCol || !xCol} onClick={run}>Run Regression</button>
          </>
        )}
      </div>

      {result && (
        <>
          <div ref={chartWrapperRef}>
            <div className="stat-grid">
              {[
                { label: 'R² (R-squared)', value: result.r2.toFixed(4) },
                { label: 'R (correlation)', value: result.r.toFixed(4) },
                { label: 'Intercept (β₀)', value: result.b0.toFixed(4) },
                { label: 'Slope (β₁)', value: result.b1.toFixed(4) },
                { label: 'Std Error', value: result.se.toFixed(4) },
                { label: 't-statistic', value: result.t.toFixed(4) },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ margin: '1rem 0', padding: '1rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--accent-light)' }}>
                Ŷ = {result.b0.toFixed(4)} + {result.b1.toFixed(4)} × X
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {result.yName} = {result.b0.toFixed(4)} + {result.b1.toFixed(4)} × {result.xName}
              </div>
            </div>

            <div className="chart-wrapper">
              <div className="section-title" style={{ marginBottom: '0.75rem' }}>Regression Plot</div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={result.plotData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="x" name={result.xName} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} label={{ value: result.xName, position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Scatter dataKey="y" fill="var(--accent)" fillOpacity={0.7} name={result.yName} />
                  <Line dataKey="yhat" stroke="var(--orange)" strokeWidth={2} dot={false} name="Fit" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className={`alert ${result.r2 >= 0.7 ? 'alert-success' : result.r2 >= 0.4 ? 'alert-warning' : 'alert-danger'}`}>
              {result.r2 >= 0.7 ? `✓ Strong model fit: R² = ${(result.r2 * 100).toFixed(1)}% of variation in ${result.yName} is explained by ${result.xName}.` :
                result.r2 >= 0.4 ? `⚠ Moderate fit: R² = ${(result.r2 * 100).toFixed(1)}%. Consider additional predictors or a different model.` :
                  `✕ Weak fit: R² = ${(result.r2 * 100).toFixed(1)}%. ${result.xName} has limited predictive power for ${result.yName}.`}
            </div>
          </div>
          <AssumptionReportCard report={buildAssumptionReport({ values: result.residuals, orderedValues: result.residuals })} />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print Results</button>
            <button className="btn-primary no-print" onClick={()=>handleAddToReport(false)}>Add to Project</button>
            <button className="btn-secondary no-print" onClick={()=>handleAddToReport(true)}>{addedToReport?'Remove from Report':'Add to Report'}</button>
          </div>
        </>
      )}
    </div>
  );
}

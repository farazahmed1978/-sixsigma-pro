import React, { useState, useCallback, useRef } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import { useProjectReportPlacement as useReport } from '../context/ProjectPlacementContext';
import { interpretScatterPlot } from '../utils/interpretations';
import './Tool.css';

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const pearson = (a, b) => { const ma = mean(a), mb = mean(b), num = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0), den = Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0)); return den === 0 ? 0 : num / den; };

export default function ScatterPlot() {
  const { getNumericColumns, getColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);
  const [data, setData] = useState(null);
  const [cols, setCols] = useState([]);
  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');
  const [chartData, setChartData] = useState(null);
  const [r, setR] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const numericWsCols = getNumericColumns();

  const handleData = (rows, fields) => { setData(rows); setCols(fields); setXCol(fields[0]); setYCol(fields[1] || fields[0]); };

  const analyze = () => {
    setAddedToReport(false);
    let xVals, yVals;
    if (hasData && numericWsCols.length >= 2) {
      xVals = getColumnData(xCol); yVals = getColumnData(yCol);
    } else if (data) {
      xVals = data.map(r => +r[xCol]).filter(v => !isNaN(v));
      yVals = data.map(r => +r[yCol]).filter(v => !isNaN(v));
    }
    if (!xVals || !yVals) return;
    const n = Math.min(xVals.length, yVals.length);
    setChartData(Array.from({ length: n }, (_, i) => ({ x: xVals[i], y: yVals[i] })));
    setR(pearson(xVals.slice(0, n), yVals.slice(0, n)));
  };

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || r === null || !chartData) return;

    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretScatterPlot({ r, r2: r * r, n: chartData.length, xName: xCol, yName: yCol });

    addReportItem({
      title: `Scatter Plot — ${xCol} vs ${yCol}`,
      toolId: 'scatter-plot',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'Pearson r': r.toFixed(4),
        'R²': (r * r).toFixed(4),
        'n': chartData.length,
        'Strength': Math.abs(r) >= 0.7 ? 'Strong' : Math.abs(r) >= 0.4 ? 'Moderate' : 'Weak',
      },
      interpretation,
      rawData: chartData.map((d, i) => ({ sample: i + 1, [xCol]: d.x, [yCol]: d.y })),
    });

    setAddedToReport(true);
  }, [r, chartData, xCol, yCol, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      {hasData && numericWsCols.length > 0 && (
        <div className="ws-banner">
          <span>📊 Worksheet data available — select X and Y columns below</span>
        </div>
      )}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Scatter Plot</h3>
        {!hasData && <CSVUploader onData={handleData} />}
        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <div className="form-group">
            <label>X Column</label>
            <select value={xCol} onChange={e => setXCol(e.target.value)}>
              {(hasData ? numericWsCols.map(c => c.name) : cols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Y Column</label>
            <select value={yCol} onChange={e => setYCol(e.target.value)}>
              {(hasData ? numericWsCols.map(c => c.name) : cols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={analyze}>Generate Plot</button>
      </div>
      {chartData && r !== null && (
        <>
          <div className="chart-wrapper">
            <div ref={chartWrapperRef}>
              <div className="stat-grid">
                {[['Pearson r', r.toFixed(4)], ['R²', (r * r).toFixed(4)], ['n', chartData.length], ['Strength', Math.abs(r) >= 0.7 ? 'Strong' : Math.abs(r) >= 0.4 ? 'Moderate' : 'Weak']].map(([l, v]) => (
                  <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="x" name={xCol} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} label={{ value: xCol, position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis dataKey="y" name={yCol} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={chartData} fill="var(--accent)" fillOpacity={0.75} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
              <button className="btn-primary no-print" onClick={handleAddToReport}>
                {addedToReport ? 'Manage Placement' : 'Add to Project'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

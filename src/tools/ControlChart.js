import React, { useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import './Tool.css';

function calcStats(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev, ucl: mean + 3 * stdDev, lcl: mean - 3 * stdDev, max: Math.max(...values), min: Math.min(...values), n };
}

export default function ControlChart() {
  const { columns, getColumnData, getNumericColumns, hasData } = useWorksheet();
  const [data, setData] = useState(null);
  const [cols, setCols] = useState([]);
  const [valueCol, setValueCol] = useState('');
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState(null);

  const numericWsCols = getNumericColumns();

  const handleData = useCallback((rows, fields) => {
    setData(rows);
    setCols(fields);
    const numericCol = fields.find(f => typeof rows[0]?.[f] === 'number') || fields[0];
    setValueCol(numericCol);
  }, []);

  const loadFromWorksheet = (colName) => {
    const vals = getColumnData(colName);
    const rows = vals.map((v, i) => ({ value: v, label: `Sample ${i + 1}` }));
    setData(rows);
    setCols([colName]);
    setValueCol(colName);
    setChartData(null);
    setStats(null);
  };

  const analyze = useCallback(() => {
    if (!data || !valueCol) return;
    const values = data.map(r => +r[valueCol]).filter(v => !isNaN(v));
    const s = calcStats(values);
    setStats(s);
    const cd = data.map((r, i) => {
      const v = +r[valueCol];
      const outOfControl = v > s.ucl || v < s.lcl;
      return { label: r.label || `${i + 1}`, value: v, ucl: s.ucl, lcl: s.lcl, mean: s.mean, outOfControl };
    });
    setChartData(cd);
  }, [data, valueCol]);

  return (
    <div style={{ padding: '1.5rem' }}>
      {hasData && numericWsCols.length > 0 && (
        <div className="ws-banner">
          <span>📊 Worksheet data available</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {numericWsCols.map(c => (
              <button key={c.name} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={() => loadFromWorksheet(c.name)}>
                Use "{c.name}"
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Control Chart (Individuals)</h3>
        {!hasData && <CSVUploader onData={handleData} />}
        {cols.length > 0 && (
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label>Value Column</label>
              <select value={valueCol} onChange={e => setValueCol(e.target.value)}>
                {cols.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}
        <button className="btn-primary" onClick={analyze} disabled={!data || !valueCol}>Generate Chart</button>
      </div>

      {stats && (
        <div className="stat-grid">
          {[['Mean', stats.mean.toFixed(4)], ['UCL', stats.ucl.toFixed(4)], ['LCL', stats.lcl.toFixed(4)], ['Std Dev', stats.stdDev.toFixed(4)], ['n', stats.n]].map(([l, v]) => (
            <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
          ))}
        </div>
      )}

      {chartData && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <ReferenceLine y={stats.ucl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'UCL', fill: 'var(--red)', fontSize: 11 }} />
              <ReferenceLine y={stats.mean} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'Mean', fill: 'var(--green)', fontSize: 11 }} />
              <ReferenceLine y={stats.lcl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'LCL', fill: 'var(--red)', fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.outOfControl ? 'var(--red)' : 'var(--accent)'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>
          {chartData.some(d => d.outOfControl) && (
            <div className="alert alert-danger">⚠ {chartData.filter(d => d.outOfControl).length} point(s) outside control limits — investigate for special cause variation.</div>
          )}
          {!chartData.some(d => d.outOfControl) && (
            <div className="alert alert-success">✓ All points within control limits — process appears to be in statistical control.</div>
          )}
          <button className="btn-secondary no-print" style={{ marginTop: '0.75rem' }} onClick={() => window.print()}>🖨️ Print</button>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useWorksheet } from '../context/WorksheetContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const variance = arr => { const m = mean(arr); return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1); };
const stddev = arr => Math.sqrt(variance(arr));
const median = arr => { const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const q1 = arr => { const s = [...arr].sort((a, b) => a - b); return median(s.slice(0, Math.floor(s.length / 2))); };
const q3 = arr => { const s = [...arr].sort((a, b) => a - b); return median(s.slice(Math.ceil(s.length / 2))); };
const skewness = arr => { const m = mean(arr), s = stddev(arr), n = arr.length; return (n / ((n - 1) * (n - 2))) * arr.reduce((a, b) => a + ((b - m) / s) ** 3, 0); };
const kurtosis = arr => { const m = mean(arr), s = stddev(arr), n = arr.length; return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * arr.reduce((a, b) => a + ((b - m) / s) ** 4, 0) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3)); };

export default function DescriptiveStats() {
  const { columns, getColumnData, hasData } = useWorksheet();
  const [col, setCol] = useState('');
  const [manualData, setManualData] = useState('');
  const [results, setResults] = useState(null);

  const numCols = columns.filter(c => c.data.some(v => !isNaN(parseFloat(v))));

  const analyze = () => {
    let data = col && hasData ? getColumnData(col) : manualData.split(/[\n,\s]+/).map(parseFloat).filter(v => !isNaN(v));
    if (data.length < 2) return;
    const sorted = [...data].sort((a, b) => a - b);
    const ci95 = 1.96 * stddev(data) / Math.sqrt(data.length);
    setResults({
      n: data.length, mean: mean(data), median: median(data), stddev: stddev(data),
      variance: variance(data), min: sorted[0], max: sorted[sorted.length - 1],
      q1: q1(data), q3: q3(data), iqr: q3(data) - q1(data),
      range: sorted[sorted.length - 1] - sorted[0], skewness: skewness(data),
      kurtosis: kurtosis(data), ci: [mean(data) - ci95, mean(data) + ci95],
      coefVar: (stddev(data) / Math.abs(mean(data))) * 100,
      data
    });
  };

  const stats = results ? [
    { label: 'N', value: results.n, mono: true },
    { label: 'Mean', value: results.mean.toFixed(4) },
    { label: 'Median', value: results.median.toFixed(4) },
    { label: 'Std Dev', value: results.stddev.toFixed(4) },
    { label: 'Variance', value: results.variance.toFixed(4) },
    { label: 'Min', value: results.min.toFixed(4) },
    { label: 'Max', value: results.max.toFixed(4) },
    { label: 'Range', value: results.range.toFixed(4) },
    { label: 'Q1', value: results.q1.toFixed(4) },
    { label: 'Q3', value: results.q3.toFixed(4) },
    { label: 'IQR', value: results.iqr.toFixed(4) },
    { label: 'Skewness', value: results.skewness.toFixed(4) },
    { label: 'Kurtosis', value: results.kurtosis.toFixed(4) },
    { label: 'CV%', value: results.coefVar.toFixed(2) + '%' },
    { label: '95% CI Lower', value: results.ci[0].toFixed(4) },
    { label: '95% CI Upper', value: results.ci[1].toFixed(4) },
  ] : [];

  const histData = () => {
    if (!results) return [];
    const bins = 10, min = results.min, range = results.max - results.min;
    const counts = Array(bins).fill(0);
    results.data.forEach(v => { const i = Math.min(bins - 1, Math.floor((v - min) / range * bins)); counts[i]++; });
    return counts.map((c, i) => ({ bin: (min + i * range / bins).toFixed(2), count: c }));
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Descriptive Statistics</h3>
        {hasData && numCols.length > 0 ? (
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label>Select Column (from Worksheet)</label>
            <select value={col} onChange={e => setCol(e.target.value)}>
              <option value="">— select column —</option>
              {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        ) : (
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label>Enter Data (comma or line separated)</label>
            <textarea style={{ width: '100%', padding: '0.6rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', resize: 'vertical', outline: 'none' }} rows={5} value={manualData} onChange={e => setManualData(e.target.value)} placeholder="12.3, 14.1, 11.8, 13.2..." />
          </div>
        )}
        <button className="btn-primary" onClick={analyze}>Calculate Statistics</button>
      </div>

      {results && (
        <>
          <div className="stat-grid">
            {stats.map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="chart-wrapper" style={{ marginTop: '1rem' }}>
            <div className="section-title" style={{ marginBottom: '0.75rem' }}>Distribution</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bin" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={`alert ${Math.abs(results.skewness) < 0.5 ? 'alert-success' : Math.abs(results.skewness) < 1 ? 'alert-warning' : 'alert-danger'}`}>
            {Math.abs(results.skewness) < 0.5 ? '✓ Distribution is approximately symmetric (|skewness| < 0.5). Normal distribution is a reasonable assumption.' :
             Math.abs(results.skewness) < 1 ? '⚠ Moderate skewness detected. Consider a normality test before applying parametric methods.' :
             '✕ High skewness detected. Consider nonparametric tests or data transformation.'}
          </div>
          <button className="btn-secondary no-print" style={{ marginTop: '0.75rem' }} onClick={() => window.print()}>🖨️ Print Results</button>
        </>
      )}
    </div>
  );
}

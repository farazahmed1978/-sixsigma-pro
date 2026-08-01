import React, { useState, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import { interpretHistogram } from '../utils/interpretations';
import './Tool.css';

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const stddev = arr => { const m = mean(arr); return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1)); };
// Sample skewness (adjusted Fisher-Pearson standardized moment coefficient)
function skewness(arr) {
  const n = arr.length;
  if (n < 3) return 0;
  const m = mean(arr), s = stddev(arr);
  if (s === 0) return 0;
  const g1 = arr.reduce((a, v) => a + Math.pow((v - m) / s, 3), 0) / n;
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
}

export default function Histogram() {
  const { getNumericColumns, getColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);
  const [values, setValues] = useState(null);
  const [colName, setColName] = useState('');
  const [bins, setBins] = useState(10);
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const numericWsCols = getNumericColumns();

  const processValues = (vals, name) => {
    if (!vals.length) return;
    setValues(vals);
    setColName(name);
    setAddedToReport(false);
    const m = mean(vals), s = stddev(vals), skew = skewness(vals);
    const sorted = [...vals].sort((a, b) => a - b);
    setStats({ n: vals.length, mean: m, stddev: s, min: sorted[0], max: sorted[sorted.length - 1], skewness: skew });
    buildChart(vals, bins);
  };

  const buildChart = (vals, b) => {
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min;
    const counts = Array(b).fill(0);
    vals.forEach(v => { const i = Math.min(b - 1, Math.floor((v - min) / range * b)); counts[i]++; });
    setChartData(counts.map((c, i) => ({ bin: (min + i * range / b).toFixed(2), count: c })));
  };

  const handleData = useCallback((rows, fields) => {
    const numCol = fields.find(f => !isNaN(+rows[0]?.[f])) || fields[0];
    const vals = rows.map(r => +r[numCol]).filter(v => !isNaN(v));
    processValues(vals, numCol);
  }, [bins]);

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || !stats) return;

    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretHistogram(stats);

    addReportItem({
      title: `Histogram — ${colName}`,
      toolId: 'histogram',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'n': stats.n,
        'Mean': stats.mean.toFixed(4),
        'Std Dev': stats.stddev.toFixed(4),
        'Min': stats.min.toFixed(4),
        'Max': stats.max.toFixed(4),
        'Skewness': stats.skewness.toFixed(3),
      },
      interpretation,
      rawData: values ? values.map((v, i) => ({ sample: i + 1, value: v })) : [],
    });

    setAddedToReport(true);
  }, [stats, colName, values, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      {hasData && numericWsCols.length > 0 && (
        <div className="ws-banner">
          <span>📊 Worksheet data available</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {numericWsCols.map(c => (
              <button key={c.name} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={() => processValues(getColumnData(c.name), c.name)}>
                Use "{c.name}"
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Histogram</h3>
        {!hasData && <CSVUploader onData={handleData} />}
        <div className="form-group" style={{ marginTop: '0.75rem', maxWidth: '200px' }}>
          <label>Number of Bins</label>
          <select value={bins} onChange={e => { setBins(+e.target.value); if (values) buildChart(values, +e.target.value); }}>
            {[5, 8, 10, 12, 15, 20].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {chartData && (
        <div className="chart-wrapper">
          <div ref={chartWrapperRef}>
            {stats && (
              <div className="stat-grid">
                {[['n', stats.n], ['Mean', stats.mean.toFixed(4)], ['Std Dev', stats.stddev.toFixed(4)], ['Min', stats.min.toFixed(4)], ['Max', stats.max.toFixed(4)], ['Skewness', stats.skewness.toFixed(3)]].map(([l, v]) => (
                  <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
                ))}
              </div>
            )}
            <div className="section-title" style={{ margin: '1rem 0 0.75rem' }}>{colName} — Distribution</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="bin" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>
              {addedToReport ? '✓ Added to Report' : '📄 Add to Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import { interpretControlChart } from '../utils/interpretations';
import './Tool.css';

// Standard I-MR constants (subgroup size n=2 for moving range)
const D2 = 1.128;   // used to estimate sigma from mRbar
const D4 = 3.267;   // moving range UCL multiplier
const D3 = 0;       // moving range LCL multiplier (0 for n=2)

function calcStats(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;

  // Moving ranges between consecutive points
  const movingRanges = [];
  for (let i = 1; i < n; i++) movingRanges.push(Math.abs(values[i] - values[i - 1]));
  const mrBar = movingRanges.reduce((a, b) => a + b, 0) / movingRanges.length;

  // Sigma estimated from moving range (standard I-MR method), not raw sample std dev.
  // This avoids inflating control limits when the data itself contains special-cause variation.
  const sigma = mrBar / D2;

  const ucl = mean + 3 * sigma;
  const lcl = mean - 3 * sigma;
  const mrUcl = D4 * mrBar;
  const mrLcl = D3 * mrBar;

  return { mean, sigma, mrBar, ucl, lcl, mrUcl, mrLcl, n, movingRanges };
}

// Western Electric Rules (applied to the Individuals chart)
// Rule 1: any single point beyond 3-sigma (Zone A)
// Rule 2: 2 of 3 consecutive points beyond 2-sigma, same side
// Rule 3: 4 of 5 consecutive points beyond 1-sigma, same side
// Rule 4: 8 consecutive points on the same side of the centerline
function applyWesternElectricRules(values, mean, sigma) {
  const n = values.length;
  const flags = values.map(() => []);
  const zone = (v) => (v - mean) / sigma; // signed z-score relative to mean

  for (let i = 0; i < n; i++) {
    const z = zone(values[i]);
    if (Math.abs(z) > 3) flags[i].push('Rule 1: beyond 3\u03C3 (special cause)');
  }

  // Rule 2: 2 of 3 consecutive beyond 2-sigma, same side
  for (let i = 2; i < n; i++) {
    const window = [i - 2, i - 1, i];
    const beyond2Pos = window.filter(idx => zone(values[idx]) > 2).length;
    const beyond2Neg = window.filter(idx => zone(values[idx]) < -2).length;
    if (beyond2Pos >= 2) flags[i].push('Rule 2: 2 of 3 points beyond 2\u03C3 (high side)');
    if (beyond2Neg >= 2) flags[i].push('Rule 2: 2 of 3 points beyond 2\u03C3 (low side)');
  }

  // Rule 3: 4 of 5 consecutive beyond 1-sigma, same side
  for (let i = 4; i < n; i++) {
    const window = [i - 4, i - 3, i - 2, i - 1, i];
    const beyond1Pos = window.filter(idx => zone(values[idx]) > 1).length;
    const beyond1Neg = window.filter(idx => zone(values[idx]) < -1).length;
    if (beyond1Pos >= 4) flags[i].push('Rule 3: 4 of 5 points beyond 1\u03C3 (high side)');
    if (beyond1Neg >= 4) flags[i].push('Rule 3: 4 of 5 points beyond 1\u03C3 (low side)');
  }

  // Rule 4: 8 consecutive points on same side of centerline
  for (let i = 7; i < n; i++) {
    const window = [];
    for (let k = i - 7; k <= i; k++) window.push(k);
    const allPos = window.every(idx => values[idx] > mean);
    const allNeg = window.every(idx => values[idx] < mean);
    if (allPos) flags[i].push('Rule 4: 8 consecutive points above centerline');
    if (allNeg) flags[i].push('Rule 4: 8 consecutive points below centerline');
  }

  return flags;
}

export default function ControlChart() {
  const { columns, getColumnData, getNumericColumns, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);
  const [data, setData] = useState(null);
  const [cols, setCols] = useState([]);
  const [valueCol, setValueCol] = useState('');
  const [chartData, setChartData] = useState(null);
  const [mrChartData, setMrChartData] = useState(null);
  const [stats, setStats] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

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
    setMrChartData(null);
    setStats(null);
  };

  const analyze = useCallback(() => {
    if (!data || !valueCol) return;
    setAddedToReport(false);
    const values = data.map(r => +r[valueCol]).filter(v => !isNaN(v));
    const s = calcStats(values);
    setStats(s);

    const ruleFlags = applyWesternElectricRules(values, s.mean, s.sigma);

    const cd = data.map((r, i) => {
      const v = +r[valueCol];
      const flags = ruleFlags[i] || [];
      return {
        label: r.label || `${i + 1}`,
        value: v,
        ucl: s.ucl,
        lcl: s.lcl,
        mean: s.mean,
        outOfControl: flags.length > 0,
        flags,
      };
    });
    setChartData(cd);

    // Moving range chart data (one fewer point than the individuals chart)
    const mrd = s.movingRanges.map((mr, i) => ({
      label: `${i + 2}`, // moving range i corresponds to points i and i+1 (1-indexed)
      mr,
      mrUcl: s.mrUcl,
      mrLcl: s.mrLcl,
      mrBar: s.mrBar,
      outOfControl: mr > s.mrUcl || mr < s.mrLcl,
    }));
    setMrChartData(mrd);
  }, [data, valueCol]);

  const violationCount = chartData ? chartData.filter(d => d.outOfControl).length : 0;

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || !stats || !chartData) return;

    // Capture the chart area as an image for the printed report
    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    // Tally which Western Electric rules fired, for the interpretation text
    const ruleBreakdown = { rule1: 0, rule2: 0, rule3: 0, rule4: 0 };
    chartData.forEach(d => {
      (d.flags || []).forEach(f => {
        if (f.startsWith('Rule 1')) ruleBreakdown.rule1++;
        else if (f.startsWith('Rule 2')) ruleBreakdown.rule2++;
        else if (f.startsWith('Rule 3')) ruleBreakdown.rule3++;
        else if (f.startsWith('Rule 4')) ruleBreakdown.rule4++;
      });
    });

    const interpretation = interpretControlChart({
      violationCount, totalPoints: chartData.length, ruleBreakdown,
    });

    addReportItem({
      title: `I-MR Control Chart — ${valueCol}`,
      toolId: 'control-chart',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'Mean': stats.mean.toFixed(4),
        'UCL': stats.ucl.toFixed(4),
        'LCL': stats.lcl.toFixed(4),
        'Sigma (from MR)': stats.sigma.toFixed(4),
        'MR-bar': stats.mrBar.toFixed(4),
        'n': stats.n,
        'Violations': violationCount,
      },
      interpretation,
      rawData: chartData.map(d => ({ label: d.label, value: d.value })),
    });

    setAddedToReport(true);
  }, [stats, chartData, valueCol, violationCount, addReportItem]);

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
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Individuals &amp; Moving Range (I-MR) Chart</h3>
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
        <button className="btn-primary" onClick={analyze} disabled={!data || !valueCol}>Generate Charts</button>
      </div>

      {stats && (
        <div className="stat-grid">
          {[
            ['Mean', stats.mean.toFixed(4)],
            ['UCL', stats.ucl.toFixed(4)],
            ['LCL', stats.lcl.toFixed(4)],
            ['Sigma (from MR)', stats.sigma.toFixed(4)],
            ['MR-bar', stats.mrBar.toFixed(4)],
            ['n', stats.n],
          ].map(([l, v]) => (
            <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
          ))}
        </div>
      )}

      {chartData && (
        <div className="chart-wrapper">
          <div ref={chartWrapperRef}>
          <h4 style={{ margin: '1rem 0 0.5rem' }}>Individuals Chart</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(val, name, props) => {
                  if (props.payload.flags && props.payload.flags.length) {
                    return [`${val} — ${props.payload.flags.join('; ')}`, 'Value'];
                  }
                  return [val, 'Value'];
                }}
              />
              <ReferenceLine y={stats.ucl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'UCL', fill: 'var(--red)', fontSize: 11 }} />
              <ReferenceLine y={stats.mean} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'Mean', fill: 'var(--green)', fontSize: 11 }} />
              <ReferenceLine y={stats.lcl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'LCL', fill: 'var(--red)', fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.outOfControl ? 'var(--red)' : 'var(--accent)'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>

          <h4 style={{ margin: '1.5rem 0 0.5rem' }}>Moving Range Chart</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mrChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <ReferenceLine y={stats.mrUcl} stroke="var(--red)" strokeDasharray="4 4" label={{ value: 'UCL', fill: 'var(--red)', fontSize: 11 }} />
              <ReferenceLine y={stats.mrBar} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'MR-bar', fill: 'var(--green)', fontSize: 11 }} />
              <Line type="monotone" dataKey="mr" stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                const { cx, cy, payload } = props;
                return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.outOfControl ? 'var(--red)' : 'var(--accent)'} />;
              }} />
            </LineChart>
          </ResponsiveContainer>
          </div>

          {violationCount > 0 ? (
            <div className="alert alert-danger">
              ⚠ {violationCount} point(s) triggered a Western Electric rule — investigate for special cause variation.
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
                {chartData.filter(d => d.outOfControl).map((d, i) => (
                  <li key={i}>{d.label}: {d.flags.join('; ')}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="alert alert-success">✓ No Western Electric rule violations — process appears to be in statistical control.</div>
          )}
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

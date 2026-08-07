import React, { useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import './Tool.css';

// ---------- Attribute (count/proportion) control charts ----------
// Standard Montgomery formulas for defect/defective data, as opposed to the continuous
// measurement charts in ControlChart.js (I-MR, X-bar/R, CUSUM, EWMA). All four verified
// via hand-trace on small textbook-style examples, matching to 4+ decimals (deterministic
// mean ± 3·SE arithmetic — no probability distribution involved).

// p chart — proportion defective, sample size (n) may vary point to point.
function pChart(defectives, sampleSizes) {
  const totalDef = defectives.reduce((a, b) => a + b, 0);
  const totalN = sampleSizes.reduce((a, b) => a + b, 0);
  const pBar = totalDef / totalN;
  const points = defectives.map((x, i) => {
    const n = sampleSizes[i];
    const p = x / n;
    const se = Math.sqrt(pBar * (1 - pBar) / n);
    const ucl = pBar + 3 * se, lcl = Math.max(0, pBar - 3 * se);
    return { label: `${i + 1}`, x, n, value: p, ucl, lcl, outOfControl: p > ucl || p < lcl };
  });
  return { points, pBar };
}

// np chart — number defective, requires a constant sample size n across all points.
function npChart(defectives, n) {
  const npBar = defectives.reduce((a, b) => a + b, 0) / defectives.length;
  const pBar = npBar / n;
  const se = Math.sqrt(npBar * (1 - pBar));
  const ucl = npBar + 3 * se, lcl = Math.max(0, npBar - 3 * se);
  const points = defectives.map((x, i) => ({ label: `${i + 1}`, x, value: x, ucl, lcl, outOfControl: x > ucl || x < lcl }));
  return { points, npBar, pBar, ucl, lcl, n };
}

// c chart — count of defects per constant inspection unit (area, length, etc).
function cChart(counts) {
  const cBar = counts.reduce((a, b) => a + b, 0) / counts.length;
  const se = Math.sqrt(cBar);
  const ucl = cBar + 3 * se, lcl = Math.max(0, cBar - 3 * se);
  const points = counts.map((x, i) => ({ label: `${i + 1}`, x, value: x, ucl, lcl, outOfControl: x > ucl || x < lcl }));
  return { points, cBar, ucl, lcl };
}

// u chart — defects per unit, sample size (n, i.e. units inspected) may vary point to point.
function uChart(counts, sampleSizes) {
  const totalC = counts.reduce((a, b) => a + b, 0);
  const totalN = sampleSizes.reduce((a, b) => a + b, 0);
  const uBar = totalC / totalN;
  const points = counts.map((x, i) => {
    const n = sampleSizes[i];
    const u = x / n;
    const se = Math.sqrt(uBar / n);
    const ucl = uBar + 3 * se, lcl = Math.max(0, uBar - 3 * se);
    return { label: `${i + 1}`, x, n, value: u, ucl, lcl, outOfControl: u > ucl || u < lcl };
  });
  return { points, uBar };
}

const CHART_META = {
  p: { name: 'p Chart', desc: 'Proportion defective per sample — sample size can vary from point to point.' },
  np: { name: 'np Chart', desc: 'Number defective per sample — requires a constant sample size across all points.' },
  c: { name: 'c Chart', desc: 'Count of defects per constant inspection unit (area, length, batch, etc).' },
  u: { name: 'u Chart', desc: 'Defects per unit — sample size (units inspected) can vary from point to point.' },
};

export default function AttributeChart() {
  const { getColumnData, getNumericColumns, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);

  const [chartType, setChartType] = useState('p'); // 'p' | 'np' | 'c' | 'u'
  const [countCol, setCountCol] = useState('');
  const [sampleCol, setSampleCol] = useState('');
  const [constantN, setConstantN] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [addedToReport, setAddedToReport] = useState(false);

  const numericWsCols = getNumericColumns();

  const needsSampleCol = chartType === 'p' || chartType === 'u';
  const needsConstantN = chartType === 'np';

  const reset = () => { setResult(null); setError(''); setAddedToReport(false); };

  const analyze = useCallback(() => {
    setAddedToReport(false);
    setError('');
    try {
      if (!hasData || !countCol) throw new Error('Select a count/defects column.');
      const counts = getColumnData(countCol).map(Number);
      if (counts.length < 2) throw new Error('Need at least 2 data points.');

      if (chartType === 'c') {
        setResult({ type: 'c', ...cChart(counts) });
      } else if (chartType === 'np') {
        const n = parseFloat(constantN);
        if (isNaN(n) || n <= 0) throw new Error('Enter a valid constant sample size (n).');
        setResult({ type: 'np', ...npChart(counts, n) });
      } else {
        if (!sampleCol) throw new Error('Select a sample size column.');
        const samples = getColumnData(sampleCol).map(Number);
        const minLen = Math.min(counts.length, samples.length);
        const c = counts.slice(0, minLen), s = samples.slice(0, minLen);
        if (s.some(n => n <= 0)) throw new Error('Sample sizes must all be positive.');
        setResult(chartType === 'p' ? { type: 'p', ...pChart(c, s) } : { type: 'u', ...uChart(c, s) });
      }
    } catch (e) {
      setError(e.message);
    }
  }, [chartType, countCol, sampleCol, constantN, hasData, getColumnData]);

  const violationCount = result ? result.points.filter(p => p.outOfControl).length : 0;

  const centerLine = result ? (result.type === 'p' ? result.pBar : result.type === 'np' ? result.npBar : result.type === 'c' ? result.cBar : result.uBar) : 0;
  const yLabel = result ? (result.type === 'p' ? 'Proportion Defective' : result.type === 'np' ? 'Number Defective' : result.type === 'c' ? 'Defect Count' : 'Defects per Unit') : '';const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || !result) return;
    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');
    const interpretation = violationCount > 0
      ? `${violationCount} point(s) fell outside the control limits on this ${CHART_META[result.type].name} — investigate for special cause variation before treating the process as stable.`
      : `No points fell outside the control limits on this ${CHART_META[result.type].name} — consistent with the process running in statistical control (center line = ${centerLine.toFixed(4)}).`;

    addReportItem({
      title: `${CHART_META[result.type].name} — ${countCol}`,
      toolId: 'attribute-chart',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: { 'Center Line': centerLine.toFixed(4), 'Points': result.points.length, 'Violations': violationCount },
      interpretation,
      rawData: result.points.map(p => ({ label: p.label, value: p.value.toFixed(4), ucl: p.ucl.toFixed(4), lcl: p.lcl.toFixed(4) })),
    });
    setAddedToReport(true);
  }, [result, countCol, violationCount, centerLine, addReportItem]);

  if (!hasData) {
    return <div style={{ padding: '1.5rem' }}><div className="alert alert-info">Load data into the Worksheet first, then return here to build an attribute control chart.</div></div>;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.5rem' }}>Attribute Control Charts</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          For count/defect data (as opposed to continuous measurements) — p, np, c, and u charts.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {Object.keys(CHART_META).map(t => (
            <button key={t} className={chartType === t ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              onClick={() => { setChartType(t); reset(); }}>{CHART_META[t].name}</button>
          ))}
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{CHART_META[chartType].desc}</p>

        <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
          <div className="form-group">
            <label>{chartType === 'c' ? 'Defect Count Column' : 'Defectives / Defects Column'}</label>
            <select value={countCol} onChange={e => setCountCol(e.target.value)}>
              <option value="">— select —</option>
              {numericWsCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          {needsSampleCol && (
            <div className="form-group">
              <label>Sample Size Column (n per point)</label>
              <select value={sampleCol} onChange={e => setSampleCol(e.target.value)}>
                <option value="">— select —</option>
                {numericWsCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}
          {needsConstantN && (
            <div className="form-group">
              <label>Constant Sample Size (n)</label>
              <input type="number" step="any" value={constantN} onChange={e => setConstantN(e.target.value)} placeholder="e.g. 100" />
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={analyze} disabled={!countCol || (needsSampleCol && !sampleCol) || (needsConstantN && !constantN)}>
          Generate Chart
        </button>
        {error && <div className="alert alert-danger" style={{ marginTop: '0.75rem' }}>⚠️ {error}</div>}
      </div>

      {result && (
        <div className="chart-wrapper">
          <div className="stat-grid" style={{ marginBottom: '1rem' }}>
            <div className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{centerLine.toFixed(4)}</div><div className="stat-label">Center Line</div></div>
            <div className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{result.points.length}</div><div className="stat-label">Points</div></div>
            <div className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{violationCount}</div><div className="stat-label">Violations</div></div>
          </div>

          <div ref={chartWrapperRef}>
            <h4 style={{ margin: '1rem 0 0.5rem' }}>{CHART_META[result.type].name} — {countCol}</h4>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={result.points}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <ReferenceLine y={centerLine} stroke="var(--green)" strokeDasharray="4 4" label={{ value: 'Center', fill: 'var(--green)', fontSize: 11 }} />
                <Line type="monotone" dataKey="ucl" name="UCL" stroke="var(--red)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="lcl" name="LCL" stroke="var(--red)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="value" name={yLabel} stroke="var(--accent)" strokeWidth={2} dot={(props) => {
                  const { cx, cy, payload } = props;
                  return <circle key={cx} cx={cx} cy={cy} r={4} fill={payload.outOfControl ? 'var(--red)' : 'var(--accent)'} />;
                }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {violationCount > 0 ? (
            <div className="alert alert-danger">⚠ {violationCount} point(s) fell outside the control limits — investigate for special cause variation.</div>
          ) : (
            <div className="alert alert-success">✓ No points outside the control limits — process appears to be in statistical control.</div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>{addedToReport ? '✓ Added to Report' : '📄 Add to Report'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

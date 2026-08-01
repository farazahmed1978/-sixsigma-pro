import React, { useState, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import { interpretCapability } from '../utils/interpretations';
import './Tool.css';

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const stddev = arr => { const m = mean(arr); return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1)); };

export default function CapabilityAnalysis() {
  const { getNumericColumns, getColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);
  const [values, setValues] = useState(null);
  const [colName, setColName] = useState('');
  const [lsl, setLsl] = useState('');
  const [usl, setUsl] = useState('');
  const [results, setResults] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const numericWsCols = getNumericColumns();

  const loadValues = (vals, name) => { setValues(vals); setColName(name); setResults(null); setAddedToReport(false); };

  const handleData = (rows, fields) => {
    const numCol = fields.find(f => !isNaN(+rows[0]?.[f])) || fields[0];
    loadValues(rows.map(r => +r[numCol]).filter(v => !isNaN(v)), numCol);
  };

  const analyze = () => {
    if (!values || !lsl || !usl) return;
    setAddedToReport(false);
    const m = mean(values), s = stddev(values);
    const LSL = +lsl, USL = +usl;
    const Cp = (USL - LSL) / (6 * s);
    const Cpu = (USL - m) / (3 * s);
    const Cpl = (m - LSL) / (3 * s);
    const Cpk = Math.min(Cpu, Cpl);
    const sigmaLevel = Cpk * 3;
    const pctBelowLSL = values.filter(v => v < LSL).length / values.length * 100;
    const pctAboveUSL = values.filter(v => v > USL).length / values.length * 100;
    const bins = 12, min = Math.min(...values), max = Math.max(...values), range = max - min;
    const counts = Array(bins).fill(0);
    values.forEach(v => { const i = Math.min(bins - 1, Math.floor((v - min) / range * bins)); counts[i]++; });
    const chartData = counts.map((c, i) => ({ bin: (min + i * range / bins).toFixed(2), count: c }));
    setResults({ m, s, Cp, Cpk, Cpu, Cpl, sigmaLevel, pctBelowLSL, pctAboveUSL, chartData, LSL, USL });
  };

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || !results) return;

    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretCapability({ cpk: results.Cpk, cp: results.Cp });

    addReportItem({
      title: `Capability Analysis — ${colName}`,
      toolId: 'capability-analysis',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'Cp': results.Cp.toFixed(3),
        'Cpk': results.Cpk.toFixed(3),
        'Cpu': results.Cpu.toFixed(3),
        'Cpl': results.Cpl.toFixed(3),
        'Sigma Level': results.sigmaLevel.toFixed(2),
        'Mean': results.m.toFixed(4),
        'Std Dev': results.s.toFixed(4),
        '% Out of Spec': (results.pctBelowLSL + results.pctAboveUSL).toFixed(2) + '%',
        'LSL': results.LSL,
        'USL': results.USL,
      },
      interpretation,
      rawData: values ? values.map((v, i) => ({ sample: i + 1, value: v })) : [],
    });

    setAddedToReport(true);
  }, [results, colName, values, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      {hasData && numericWsCols.length > 0 && (
        <div className="ws-banner">
          <span>📊 Worksheet data available</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {numericWsCols.map(c => (
              <button key={c.name} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={() => loadValues(getColumnData(c.name), c.name)}>
                Use "{c.name}"
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Capability Analysis {colName && `— ${colName}`}</h3>
        {!hasData && <CSVUploader onData={handleData} />}
        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <div className="form-group"><label>Lower Spec Limit (LSL)</label><input type="number" step="any" value={lsl} onChange={e => setLsl(e.target.value)} placeholder="e.g. 11.5" /></div>
          <div className="form-group"><label>Upper Spec Limit (USL)</label><input type="number" step="any" value={usl} onChange={e => setUsl(e.target.value)} placeholder="e.g. 13.5" /></div>
        </div>
        <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={analyze} disabled={!values || !lsl || !usl}>Run Capability Analysis</button>
      </div>

      {results && (
        <>
          <div className="chart-wrapper">
            <div ref={chartWrapperRef}>
              <div className="stat-grid">
                {[['Cp', results.Cp.toFixed(3)], ['Cpk', results.Cpk.toFixed(3)], ['Cpu', results.Cpu.toFixed(3)], ['Cpl', results.Cpl.toFixed(3)], ['Sigma Level', results.sigmaLevel.toFixed(2)], ['Mean', results.m.toFixed(4)], ['Std Dev', results.s.toFixed(4)], ['% Out of Spec', (results.pctBelowLSL + results.pctAboveUSL).toFixed(2) + '%']].map(([l, v]) => (
                  <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="bin" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <ReferenceLine x={results.LSL.toFixed(2)} stroke="var(--red)" label={{ value: 'LSL', fill: 'var(--red)', fontSize: 11 }} />
                  <ReferenceLine x={results.USL.toFixed(2)} stroke="var(--red)" label={{ value: 'USL', fill: 'var(--red)', fontSize: 11 }} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`alert ${results.Cpk >= 1.33 ? 'alert-success' : results.Cpk >= 1.0 ? 'alert-warning' : 'alert-danger'}`}>
              {results.Cpk >= 1.33 ? `✓ Capable process — Cpk = ${results.Cpk.toFixed(3)} ≥ 1.33. Process meets specification reliably.` :
               results.Cpk >= 1.0 ? `⚠ Marginally capable — Cpk = ${results.Cpk.toFixed(3)}. Process meets spec but improvement recommended.` :
               `✕ Not capable — Cpk = ${results.Cpk.toFixed(3)} < 1.0. Process is producing out-of-spec product.`}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
              <button className="btn-primary no-print" onClick={handleAddToReport}>
                {addedToReport ? '✓ Added to Report' : '📄 Add to Report'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import { useProjectReportPlacement as useReport } from '../context/ProjectPlacementContext';
import { interpretBoxPlot } from '../utils/interpretations';
import './Tool.css';

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const median = arr => { const s = [...arr].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const q1 = arr => { const s = [...arr].sort((a, b) => a - b); return median(s.slice(0, Math.floor(s.length / 2))); };
const q3 = arr => { const s = [...arr].sort((a, b) => a - b); return median(s.slice(Math.ceil(s.length / 2))); };

function boxStats(vals) {
  const Q1 = q1(vals), Q3 = q3(vals), IQR = Q3 - Q1, med = median(vals);
  const whiskerLow = Math.max(Math.min(...vals), Q1 - 1.5 * IQR);
  const whiskerHigh = Math.min(Math.max(...vals), Q3 + 1.5 * IQR);
  const outliers = vals.filter(v => v < whiskerLow || v > whiskerHigh);
  return { min: Math.min(...vals), max: Math.max(...vals), Q1, Q3, IQR, median: med, mean: mean(vals), whiskerLow, whiskerHigh, outliers, n: vals.length };
}

export default function BoxPlot() {
  const { getNumericColumns, getCategoricalColumns, getColumnData, getRawColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);
  const [data, setData] = useState(null);
  const [cols, setCols] = useState([]);
  const [valueCol, setValueCol] = useState('');
  const [groupCol, setGroupCol] = useState('');
  const [results, setResults] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const numericWsCols = getNumericColumns();
  const allWsCols = getCategoricalColumns ? getCategoricalColumns() : [];

  const handleData = (rows, fields) => { setData(rows); setCols(fields); setValueCol(fields[0]); };

  const analyze = () => {
    setAddedToReport(false);
    if (hasData) {
      const vals = getColumnData(valueCol);
      if (!groupCol) {
        setResults([{ group: valueCol, ...boxStats(vals) }]);
        return;
      }
      const groups = getRawColumnData(groupCol);
      const unique = [...new Set(groups)].filter(g => g !== '');
      setResults(unique.map(g => {
        const gVals = vals.filter((_, i) => groups[i] === g);
        return { group: g, ...boxStats(gVals) };
      }));
    } else if (data) {
      const vals = data.map(r => +r[valueCol]).filter(v => !isNaN(v));
      setResults([{ group: valueCol, ...boxStats(vals) }]);
    }
  };

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || !results) return;

    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretBoxPlot(results);

    const statsSummary = {};
    results.forEach(r => { statsSummary[`${r.group} median`] = r.median.toFixed(3); statsSummary[`${r.group} IQR`] = r.IQR.toFixed(3); statsSummary[`${r.group} outliers`] = r.outliers.length; });

    addReportItem({
      title: `Box Plot — ${valueCol}${groupCol ? ` by ${groupCol}` : ''}`,
      toolId: 'box-plot',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary,
      interpretation,
      rawData: results.map(r => ({ group: r.group, n: r.n, min: r.min, Q1: r.Q1, median: r.median, mean: r.mean, Q3: r.Q3, max: r.max, IQR: r.IQR, outliers: r.outliers.length })),
    });

    setAddedToReport(true);
  }, [results, valueCol, groupCol, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      {hasData && numericWsCols.length > 0 && (
        <div className="ws-banner">
          <span>📊 Worksheet data available</span>
        </div>
      )}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Box Plot</h3>
        {!hasData && <CSVUploader onData={handleData} />}
        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <div className="form-group">
            <label>Value Column</label>
            <select value={valueCol} onChange={e => setValueCol(e.target.value)}>
              <option value="">— select —</option>
              {(hasData ? numericWsCols.map(c => c.name) : cols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Group Column (optional)</label>
            <select value={groupCol} onChange={e => setGroupCol(e.target.value)}>
              <option value="">— none —</option>
              {(hasData ? [...numericWsCols, ...allWsCols].map(c => c.name) : cols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={analyze} disabled={!valueCol}>Generate Box Plot</button>
      </div>

      {results && (
        <div>
          <div ref={chartWrapperRef}>
            <table className="data-table" style={{ marginBottom: '1rem' }}>
              <thead><tr><th>Group</th><th>n</th><th>Min</th><th>Q1</th><th>Median</th><th>Mean</th><th>Q3</th><th>Max</th><th>IQR</th><th>Outliers</th></tr></thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.group}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.group}</td>
                    <td>{r.n}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.min.toFixed(3)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.Q1.toFixed(3)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.median.toFixed(3)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.mean.toFixed(3)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.Q3.toFixed(3)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.max.toFixed(3)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.IQR.toFixed(3)}</td>
                    <td style={{ color: r.outliers.length > 0 ? 'var(--red)' : 'var(--green)' }}>{r.outliers.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>
              {addedToReport ? 'Manage Placement' : 'Add to Project'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

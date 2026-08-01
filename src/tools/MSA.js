import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import { useReport } from '../context/ReportContext';
import { interpretMSA } from '../utils/interpretations';
import './Tool.css';

const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const range = arr => arr.length ? Math.max(...arr) - Math.min(...arr) : 0;

export default function MSA() {
  const { columns, getRawColumnData, getColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);
  const [data, setData] = useState(null);
  const [cols, setCols] = useState([]);
  const [partCol, setPartCol] = useState('');
  const [opCol, setOpCol] = useState('');
  const [measCol, setMeasCol] = useState('');
  const [results, setResults] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const handleData = (rows, fields) => {
    setData(rows); setCols(fields);
    setPartCol(fields.find(f => f.toLowerCase().includes('part')) || fields[0]);
    setOpCol(fields.find(f => f.toLowerCase().includes('op') || f.toLowerCase().includes('operator')) || fields[1] || fields[0]);
    setMeasCol(fields.find(f => !isNaN(+rows[0]?.[f])) || fields[fields.length - 1]);
  };

  const analyze = () => {
    setAddedToReport(false);
    let rows = [];
    if (hasData && partCol && opCol && measCol) {
      const parts = getRawColumnData(partCol);
      const ops = getRawColumnData(opCol);
      const meas = getColumnData(measCol);
      rows = parts.map((_, i) => ({ part: parts[i], op: ops[i], meas: meas[i] })).filter(r => r.part && r.op && !isNaN(r.meas));
    } else if (data) {
      rows = data.map(r => ({ part: r[partCol], op: r[opCol], meas: +r[measCol] })).filter(r => r.part && r.op && !isNaN(r.meas));
    }
    if (!rows.length) return;

    const ops = [...new Set(rows.map(r => r.op))];
    const parts = [...new Set(rows.map(r => r.part))];
    const totalMeas = rows.map(r => r.meas);
    const grandMean = mean(totalMeas);
    const totalVar = totalMeas.reduce((s, v) => s + (v - grandMean) ** 2, 0) / (totalMeas.length - 1);
    const totalStd = Math.sqrt(totalVar);

    // Repeatability: avg range within operator-part combos
    const ranges = [];
    ops.forEach(op => {
      parts.forEach(part => {
        const vals = rows.filter(r => r.op === op && r.part === part).map(r => r.meas);
        if (vals.length > 1) ranges.push(range(vals));
      });
    });
    const avgRange = mean(ranges);
    const d2 = 1.128; // for n=2 trials
    const repeatability = avgRange / d2;

    // Reproducibility: variation between operators
    const opMeans = ops.map(op => mean(rows.filter(r => r.op === op).map(r => r.meas)));
    const reproducibility = Math.max(0, range(opMeans) / (ops.length > 1 ? 2.059 : 1));

    const grr = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
    const pctGRR = (grr / totalStd) * 100;
    const ndc = Math.floor(1.41 * (totalStd / grr));

    setResults({ repeatability, reproducibility, grr, totalStd, pctGRR, ndc, parts: parts.length, ops: ops.length, n: rows.length });
  };

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || !results) return;

    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretMSA(results);

    addReportItem({
      title: `MSA / Gage R&R — ${measCol}`,
      toolId: 'msa',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        '%GRR': results.pctGRR.toFixed(1) + '%',
        'GRR Std Dev': results.grr.toFixed(4),
        'Repeatability': results.repeatability.toFixed(4),
        'Reproducibility': results.reproducibility.toFixed(4),
        'Total Std Dev': results.totalStd.toFixed(4),
        'NDC': results.ndc,
        'Parts': results.parts,
        'Operators': results.ops,
      },
      interpretation,
      rawData: [],
    });

    setAddedToReport(true);
  }, [results, measCol, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      {hasData && columns.length > 0 && (
        <div className="ws-banner">
          <span>📊 Worksheet data available — select Part, Operator, and Measurement columns</span>
        </div>
      )}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Measurement System Analysis (MSA)</h3>
        {!hasData && <CSVUploader onData={handleData} />}
        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <div className="form-group"><label>Part Column</label>
            <select value={partCol} onChange={e => setPartCol(e.target.value)}>
              <option value="">— select —</option>
              {(hasData ? columns.map(c => c.name) : cols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Operator Column</label>
            <select value={opCol} onChange={e => setOpCol(e.target.value)}>
              <option value="">— select —</option>
              {(hasData ? columns.map(c => c.name) : cols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Measurement Column</label>
            <select value={measCol} onChange={e => setMeasCol(e.target.value)}>
              <option value="">— select —</option>
              {(hasData ? columns.map(c => c.name) : cols).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={analyze} disabled={!partCol || !opCol || !measCol}>Run MSA</button>
      </div>

      {results && (
        <>
          <div ref={chartWrapperRef}>
            <div className="stat-grid">
              {[['%GRR', results.pctGRR.toFixed(1) + '%'], ['GRR Std Dev', results.grr.toFixed(4)], ['Repeatability', results.repeatability.toFixed(4)], ['Reproducibility', results.reproducibility.toFixed(4)], ['Total Std Dev', results.totalStd.toFixed(4)], ['NDC', results.ndc], ['Parts', results.parts], ['Operators', results.ops]].map(([l, v]) => (
                <div key={l} className="stat-card"><div className="stat-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>{v}</div><div className="stat-label">{l}</div></div>
              ))}
            </div>
            <div className={`alert ${results.pctGRR < 10 ? 'alert-success' : results.pctGRR < 30 ? 'alert-warning' : 'alert-danger'}`}>
              {results.pctGRR < 10 ? `✓ Excellent measurement system — %GRR = ${results.pctGRR.toFixed(1)}% (< 10%). Proceed with data collection.` :
                results.pctGRR < 30 ? `⚠ Marginal measurement system — %GRR = ${results.pctGRR.toFixed(1)}% (10–30%). May be acceptable depending on application.` :
                  `✕ Unacceptable measurement system — %GRR = ${results.pctGRR.toFixed(1)}% (> 30%). Improve before collecting data.`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>
              {addedToReport ? '✓ Added to Report' : '📄 Add to Report'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

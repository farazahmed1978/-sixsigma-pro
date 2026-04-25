import React, { useState } from 'react';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import './Tool.css';

const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
const range = arr => arr.length ? Math.max(...arr)-Math.min(...arr) : 0;

export default function MSA() {
  const { columns, getRawColumnData, getColumnData, hasData } = useWorksheet();
  const [data, setData] = useState(null);
  const [cols, setCols] = useState([]);
  const [partCol, setPartCol] = useState('');
  const [opCol, setOpCol] = useState('');
  const [measCol, setMeasCol] = useState('');
  const [results, setResults] = useState(null);

  const handleData = (rows, fields) => {
    setData(rows); setCols(fields);
    setPartCol(fields.find(f=>f.toLowerCase().includes('part'))||fields[0]);
    setOpCol(fields.find(f=>f.toLowerCase().includes('op')||f.toLowerCase().includes('operator'))||fields[1]||fields[0]);
    setMeasCol(fields.find(f=>!isNaN(+rows[0]?.[f]))||fields[fields.length-1]);
  };

  const analyze = () => {
    let rows = [];
    if (hasData && partCol && opCol && measCol) {
      const parts = getRawColumnData(partCol);
      const ops = getRawColumnData(opCol);
      const meas = getColumnData(measCol);
      rows = parts.map((_,i)=>({part:parts[i],op:ops[i],meas:meas[i]})).filter(r=>r.part&&r.op&&!isNaN(r.meas));
    } else if (data) {
      rows = data.map(r=>({part:r[partCol],op:r[opCol],meas:+r[measCol]})).filter(r=>r.part&&r.op&&!isNaN(r.meas));
    }
    if (!rows.length) return;

    const ops = [...new Set(rows.map(r=>r.op))];
    const parts = [...new Set(rows.map(r=>r.part))];
    const totalMeas = rows.map(r=>r.meas);
    const grandMean = mean(totalMeas);
    const totalVar = totalMeas.reduce((s,v)=>s+(v-grandMean)**2,0)/(totalMeas.length-1);
    const totalStd = Math.sqrt(totalVar);

    // Repeatability: avg range within operator-part combos
    const ranges = [];
    ops.forEach(op => {
      parts.forEach(part => {
        const vals = rows.filter(r=>r.op===op&&r.part===part).map(r=>r.meas);
        if (vals.length>1) ranges.push(range(vals));
      });
    });
    const avgRange = mean(ranges);
    const d2 = 1.128; // for n=2 trials
    const repeatability = avgRange / d2;

    // Reproducibility: variation between operators
    const opMeans = ops.map(op=>mean(rows.filter(r=>r.op===op).map(r=>r.meas)));
    const reproducibility = Math.max(0, range(opMeans) / (ops.length > 1 ? 2.059 : 1));

    const grr = Math.sqrt(repeatability**2 + reproducibility**2);
    const pctGRR = (grr / totalStd) * 100;
    const ndc = Math.floor(1.41 * (totalStd / grr));

    setResults({ repeatability: repeatability.toFixed(4), reproducibility: reproducibility.toFixed(4), grr: grr.toFixed(4), totalStd: totalStd.toFixed(4), pctGRR: pctGRR.toFixed(1), ndc, parts: parts.length, ops: ops.length, n: rows.length });
  };

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
            <select value={partCol} onChange={e=>setPartCol(e.target.value)}>
              <option value="">— select —</option>
              {(hasData?columns.map(c=>c.name):cols).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Operator Column</label>
            <select value={opCol} onChange={e=>setOpCol(e.target.value)}>
              <option value="">— select —</option>
              {(hasData?columns.map(c=>c.name):cols).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Measurement Column</label>
            <select value={measCol} onChange={e=>setMeasCol(e.target.value)}>
              <option value="">— select —</option>
              {(hasData?columns.map(c=>c.name):cols).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary" style={{marginTop:'0.75rem'}} onClick={analyze} disabled={!partCol||!opCol||!measCol}>Run MSA</button>
      </div>

      {results && (
        <>
          <div className="stat-grid">
            {[['%GRR',results.pctGRR+'%'],['GRR Std Dev',results.grr],['Repeatability',results.repeatability],['Reproducibility',results.reproducibility],['Total Std Dev',results.totalStd],['NDC',results.ndc],['Parts',results.parts],['Operators',results.ops]].map(([l,v])=>(
              <div key={l} className="stat-card"><div className="stat-value" style={{fontSize:'1.1rem',fontFamily:'var(--font-mono)'}}>{v}</div><div className="stat-label">{l}</div></div>
            ))}
          </div>
          <div className={`alert ${+results.pctGRR<10?'alert-success':+results.pctGRR<30?'alert-warning':'alert-danger'}`}>
            {+results.pctGRR<10?`✓ Excellent measurement system — %GRR = ${results.pctGRR}% (< 10%). Proceed with data collection.`:
             +results.pctGRR<30?`⚠ Marginal measurement system — %GRR = ${results.pctGRR}% (10–30%). May be acceptable depending on application.`:
             `✕ Unacceptable measurement system — %GRR = ${results.pctGRR}% (> 30%). Improve before collecting data.`}
          </div>
          <button className="btn-secondary no-print" style={{marginTop:'0.75rem'}} onClick={()=>window.print()}>🖨️ Print</button>
        </>
      )}
    </div>
  );
}

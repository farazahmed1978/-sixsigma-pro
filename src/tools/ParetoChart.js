import React, { useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import './Tool.css';

export default function ParetoChart() {
  const { columns, getRawColumnData, getColumnData, hasData } = useWorksheet();
  const [data, setData] = useState(null);
  const [cols, setCols] = useState([]);
  const [catCol, setCatCol] = useState('');
  const [countCol, setCountCol] = useState('');
  const [chartData, setChartData] = useState(null);

  const handleData = (rows, fields) => { setData(rows); setCols(fields); setCatCol(fields[0]); setCountCol(fields[1]||fields[0]); };

  const analyze = () => {
    let pairs = [];
    if (hasData && catCol && countCol) {
      const cats = getRawColumnData(catCol);
      const counts = getColumnData(countCol);
      pairs = cats.map((c,i)=>({cat:c,count:counts[i]||0})).filter(p=>p.cat!=='');
    } else if (data && catCol && countCol) {
      pairs = data.map(r=>({cat:r[catCol],count:+r[countCol]||0}));
    }
    if (!pairs.length) return;
    // Aggregate by category
    const agg = {};
    pairs.forEach(({cat,count})=>{ agg[cat]=(agg[cat]||0)+count; });
    const sorted = Object.entries(agg).sort((a,b)=>b[1]-a[1]);
    const total = sorted.reduce((s,[,c])=>s+c,0);
    let cum = 0;
    const cd = sorted.map(([cat,count])=>{ cum+=count; return {cat,count,cumPct:+(cum/total*100).toFixed(1)}; });
    setChartData(cd);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {hasData && columns.length > 0 && (
        <div className="ws-banner">
          <span>📊 Worksheet data available — select category and count columns</span>
        </div>
      )}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Pareto Chart</h3>
        {!hasData && <CSVUploader onData={handleData} />}
        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <div className="form-group">
            <label>Category Column</label>
            <select value={catCol} onChange={e=>setCatCol(e.target.value)}>
              <option value="">— select —</option>
              {(hasData ? columns.map(c=>c.name) : cols).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Count / Frequency Column</label>
            <select value={countCol} onChange={e=>setCountCol(e.target.value)}>
              <option value="">— select —</option>
              {(hasData ? columns.map(c=>c.name) : cols).map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: '0.75rem' }} onClick={analyze} disabled={!catCol||!countCol}>Generate Pareto</button>
      </div>

      {chartData && (
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="cat" tick={{fill:'var(--text-muted)',fontSize:11}} />
              <YAxis yAxisId="left" tick={{fill:'var(--text-muted)',fontSize:11}} />
              <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{fill:'var(--text-muted)',fontSize:11}} unit="%" />
              <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'8px'}} />
              <Bar yAxisId="left" dataKey="count" fill="var(--accent)" radius={[4,4,0,0]} />
              <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke="var(--orange)" strokeWidth={2} dot={{r:4,fill:'var(--orange)'}} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="alert alert-info" style={{marginTop:'0.75rem'}}>
            The top {chartData.findIndex(d=>d.cumPct>=80)+1} categories account for 80%+ of the total. Focus improvement efforts here first.
          </div>
          <button className="btn-secondary no-print" style={{marginTop:'0.75rem'}} onClick={()=>window.print()}>🖨️ Print</button>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import CSVUploader from '../components/CSVUploader';
import { useWorksheet } from '../context/WorksheetContext';
import './Tool.css';

const median = arr => { const s = [...arr].sort((a,b)=>a-b); const m = Math.floor(s.length/2); return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };

export default function RunChart() {
  const { getNumericColumns, getColumnData, hasData } = useWorksheet();
  const [values, setValues] = useState(null);
  const [colName, setColName] = useState('');
  const [chartData, setChartData] = useState(null);

  const numericWsCols = getNumericColumns();

  const processValues = (vals, name) => {
    setValues(vals); setColName(name);
    const med = median(vals);
    setChartData(vals.map((v, i) => ({ x: i + 1, value: v, median: med, above: v > med })));
  };

  const handleData = (rows, fields) => {
    const numCol = fields.find(f => !isNaN(+rows[0]?.[f])) || fields[0];
    processValues(rows.map(r => +r[numCol]).filter(v => !isNaN(v)), numCol);
  };

  const med = values ? median(values) : null;

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
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Run Chart</h3>
        {!hasData && <CSVUploader onData={handleData} />}
      </div>
      {chartData && (
        <div className="chart-wrapper">
          <div className="section-title" style={{ marginBottom: '0.75rem' }}>{colName} — Run Chart (Median = {med.toFixed(4)})</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="x" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <ReferenceLine y={med} stroke="var(--orange)" strokeDasharray="4 4" label={{ value: 'Median', fill: 'var(--orange)', fontSize: 11 }} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4, fill: 'var(--accent)' }} />
            </LineChart>
          </ResponsiveContainer>
          <button className="btn-secondary no-print" style={{ marginTop: '0.75rem' }} onClick={() => window.print()}>🖨️ Print</button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useCallback, useRef } from 'react';
import { useWorksheet } from '../context/WorksheetContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import { useReport } from '../context/ReportContext';
import { interpretMultiVariChart } from '../utils/interpretations';

const COLORS = ['var(--accent)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--cyan)', 'var(--red)'];

export default function MultiVariChart() {
  const { columns, getColumnData, getRawColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);
  const [valueCol, setValueCol] = useState('');
  const [groupCol, setGroupCol] = useState('');
  const [chart, setChart] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const numCols = columns.filter(c => c.data.some(v => !isNaN(parseFloat(v))));
  const catCols = columns;

  const analyze = () => {
    if (!valueCol) return;
    setAddedToReport(false);
    const values = getColumnData(valueCol);
    if (!groupCol) {
      const data = values.map((v, i) => ({ x: i + 1, value: v }));
      setChart({ type: 'single', data });
      return;
    }
    const groups = getRawColumnData(groupCol);
    const unique = [...new Set(groups)].filter(g => g !== '');
    const grouped = {};
    unique.forEach(g => { grouped[g] = []; });
    values.forEach((v, i) => { if (groups[i] !== undefined && grouped[groups[i]] !== undefined) grouped[groups[i]].push({ idx: i, v }); });
    const maxLen = Math.max(...Object.values(grouped).map(a => a.length));
    const data = Array.from({ length: maxLen }, (_, i) => {
      const row = { x: i + 1 };
      unique.forEach(g => { if (grouped[g][i]) row[g] = grouped[g][i].v; });
      return row;
    });
    setChart({ type: 'grouped', data, groups: unique, grouped });
  };

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || !chart) return;

    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    let interpretation, statsSummary = {};
    if (chart.type === 'grouped') {
      const groupRanges = chart.groups.map(g => {
        const vals = chart.grouped[g].map(o => o.v);
        return vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
      });
      chart.groups.forEach((g, i) => { statsSummary[`${g} range`] = groupRanges[i].toFixed(4); });
      interpretation = interpretMultiVariChart({ groupCol, groups: chart.groups, groupRanges });
    } else {
      interpretation = interpretMultiVariChart({ groupCol: null });
      statsSummary = { 'n': chart.data.length };
    }

    addReportItem({
      title: `Multi-Vari Chart — ${valueCol}${groupCol ? ` by ${groupCol}` : ''}`,
      toolId: 'multi-vari-chart',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary,
      interpretation,
      rawData: chart.data,
    });

    setAddedToReport(true);
  }, [chart, valueCol, groupCol, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Multi-Vari Chart</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Visualize variation across positional, cyclical, and temporal sources.</p>
        {!hasData ? (
          <div className="alert alert-info">Load data into the Worksheet to use this tool.</div>
        ) : (
          <>
            <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
              <div className="form-group">
                <label>Measurement (Y) Column</label>
                <select value={valueCol} onChange={e => setValueCol(e.target.value)}>
                  <option value="">— select —</option>
                  {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Group / Factor Column (optional)</label>
                <select value={groupCol} onChange={e => setGroupCol(e.target.value)}>
                  <option value="">— none —</option>
                  {catCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary" disabled={!valueCol} onClick={analyze}>Generate Chart</button>
          </>
        )}
      </div>

      {chart && (
        <div className="chart-wrapper">
          <div ref={chartWrapperRef}>
            <div className="section-title" style={{ marginBottom: '0.75rem' }}>
              Multi-Vari Chart{groupCol ? ` — by ${groupCol}` : ''}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" label={{ value: 'Observation', position: 'insideBottom', fill: 'var(--text-muted)', fontSize: 11 }} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                {chart.type === 'single' ? (
                  <Line dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
                ) : (
                  chart.groups.map((g, i) => <Line key={g} dataKey={g} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)
                )}
                {chart.type === 'grouped' && <Legend />}
              </LineChart>
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

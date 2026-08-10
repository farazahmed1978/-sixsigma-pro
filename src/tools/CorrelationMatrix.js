import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useWorksheet } from '../context/WorksheetContext';
import { useProjectReportPlacement as useReport } from '../context/ProjectPlacementContext';
import { interpretCorrelationMatrix } from '../utils/interpretations';

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const pearson = (a, b) => {
  const ma = mean(a), mb = mean(b);
  const num = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
  const den = Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
  return den === 0 ? 0 : num / den;
};

const corrColor = (r) => {
  if (r >= 0.7) return '#00c48c';
  if (r >= 0.4) return '#7c5ce8';
  if (r <= -0.7) return '#ef4444';
  if (r <= -0.4) return '#ff7d3b';
  return 'var(--text-muted)';
};

export default function CorrelationMatrix() {
  const { columns, getColumnData, hasData } = useWorksheet();
  const { addReportItem } = useReport();
  const chartWrapperRef = useRef(null);
  const [selectedCols, setSelectedCols] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [addedToReport, setAddedToReport] = useState(false);

  const numCols = columns.filter(c => c.data.some(v => !isNaN(parseFloat(v))));

  const toggleCol = (name) => setSelectedCols(p => p.includes(name) ? p.filter(c => c !== name) : [...p, name]);

  const compute = () => {
    setAddedToReport(false);
    const cols = selectedCols.map(name => ({ name, data: getColumnData(name) }));
    const n = cols.length;
    const mat = Array(n).fill(null).map((_, i) => Array(n).fill(null).map((_, j) => pearson(cols[i].data, cols[j].data)));
    setMatrix({ cols, mat });
  };

  const handleAddToReport = useCallback(async () => {
    if (!chartWrapperRef.current || !matrix) return;

    const canvas = await html2canvas(chartWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretCorrelationMatrix(matrix);

    const rawData = [];
    for (let i = 0; i < matrix.cols.length; i++) {
      for (let j = i + 1; j < matrix.cols.length; j++) {
        rawData.push({ variableA: matrix.cols[i].name, variableB: matrix.cols[j].name, r: matrix.mat[i][j].toFixed(4) });
      }
    }

    addReportItem({
      title: `Correlation Matrix — ${matrix.cols.map(c => c.name).join(', ')}`,
      toolId: 'correlation-matrix',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: { 'Variables': matrix.cols.length, 'Pairs': rawData.length },
      interpretation,
      rawData,
    });

    setAddedToReport(true);
  }, [matrix, addReportItem]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Correlation Matrix</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Select 2 or more numeric columns to compute Pearson correlation coefficients.</p>
        {!hasData || numCols.length === 0 ? (
          <div className="alert alert-info">Load data into the Worksheet first, then return here to build the correlation matrix.</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {numCols.map(c => (
                <button key={c.name} onClick={() => toggleCol(c.name)}
                  style={{ padding: '0.35rem 0.85rem', borderRadius: '999px', border: `1px solid ${selectedCols.includes(c.name) ? 'var(--accent)' : 'var(--border)'}`, background: selectedCols.includes(c.name) ? 'var(--accent-dim)' : 'var(--input-bg)', color: selectedCols.includes(c.name) ? 'var(--accent-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
                  {c.name}
                </button>
              ))}
            </div>
            <button className="btn-primary" disabled={selectedCols.length < 2} onClick={compute}>Compute Matrix</button>
          </>
        )}
      </div>

      {matrix && (
        <>
          <div ref={chartWrapperRef}>
            <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: '400px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}></th>
                    {matrix.cols.map(c => <th key={c.name} style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center' }}>{c.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {matrix.cols.map((row, i) => (
                    <tr key={row.name}>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.name}</td>
                      {matrix.cols.map((col, j) => {
                        const r = matrix.mat[i][j];
                        const isdiag = i === j;
                        return (
                          <td key={col.name} style={{ padding: '0.6rem 0.85rem', textAlign: 'center', background: isdiag ? 'var(--bg-3)' : undefined, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: isdiag ? 700 : 500, color: isdiag ? 'var(--text-muted)' : corrColor(r), borderBottom: '1px solid var(--border)' }}>
                            {r.toFixed(3)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {[['≥ 0.7', '#00c48c', 'Strong positive'], ['0.4–0.7', '#7c5ce8', 'Moderate positive'], ['−0.4 to −0.7', '#ff7d3b', 'Moderate negative'], ['≤ −0.7', '#ef4444', 'Strong negative']].map(([r, c, l]) => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-muted)' }}>{r} — {l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary no-print" onClick={() => window.print()}>🖨️ Print Matrix</button>
            <button className="btn-primary no-print" onClick={handleAddToReport}>
              {addedToReport ? 'Manage Placement' : 'Add to Project'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

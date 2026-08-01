import React, { useState } from 'react';
import { useReport } from '../context/ReportContext';
import '../pages/Templates.css'; // reuse existing print-doc / print-section styling

export default function ReportBuilder() {
  const { items, removeReportItem, toggleIncludeRawData, reorderItems, clearReport } = useReport();
  const [reportTitle, setReportTitle] = useState('Project Analysis Report');
  const [preparedBy, setPreparedBy] = useState('');

  const moveItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    reorderItems(index, target);
  };

  const handlePrint = () => window.print();

  if (items.length === 0) {
    return (
      <div style={{ padding: '2rem', maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Report Builder</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          No results added yet. Run a tool (e.g. Control Chart, Capability Analysis) and click <strong>"Add to Report"</strong> to start building a combined document here.
        </p>
      </div>
    );
  }

  return (
    <div className="templates-page">
      {/* ── Editing view (hidden on print) ── */}
      <div className="no-print">
        <div className="templates-header">
          <h1>Report Builder</h1>
          <p>Review, reorder, and choose what to include, then print or save as PDF.</p>
        </div>

        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Report Title</label>
              <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Prepared By</label>
              <input type="text" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} placeholder="Name" />
            </div>
          </div>
        </div>

        {items.map((item, i) => (
          <div key={item.id} className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{item.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 560 }}>{item.interpretation}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }} onClick={() => moveItem(i, -1)} disabled={i === 0}>↑</button>
                <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }} onClick={() => moveItem(i, 1)} disabled={i === items.length - 1}>↓</button>
                <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }} onClick={() => removeReportItem(item.id)}>🗑️ Remove</button>
              </div>
            </div>

            {item.chartImage && (
              <img src={item.chartImage} alt={item.title} style={{ maxWidth: '100%', marginTop: '0.75rem', borderRadius: 8, border: '1px solid var(--border)' }} />
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={item.includeRawData} onChange={() => toggleIncludeRawData(item.id)} />
              Include raw data table in report
            </label>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="btn-primary" onClick={handlePrint}>🖨️ Print / Save as PDF</button>
          <button className="btn-secondary" onClick={clearReport}>Clear All</button>
        </div>
      </div>

      {/* ── Print document (hidden on screen, shown on print) ── */}
      <div className="print-target">
        <div className="print-doc print-only">
          <div className="print-header">
            <div className="print-logo-block">
              <div className="print-logo-placeholder">LOGO</div>
              <div className="print-brand">SixSigmaPro</div>
            </div>
            <div className="print-header-center">
              <div className="print-doc-type">Analysis Report</div>
              <div className="print-doc-title">{reportTitle}</div>
            </div>
            <div className="print-header-meta">
              <div><span>Prepared By:</span> {preparedBy || '—'}</div>
              <div><span>Date:</span> {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {items.map((item, i) => (
            <div key={item.id} className="print-section">
              <div className="print-section-title" style={{ background: '#1a3a6b' }}>
                {i + 1}. {item.title}
              </div>

              {item.chartImage && (
                <div style={{ padding: '12px 20px' }}>
                  <img src={item.chartImage} alt={item.title} style={{ maxWidth: '100%' }} />
                </div>
              )}

              <div className="print-fields-grid cols-1">
                <div className="print-field">
                  <div className="print-field-label">Interpretation</div>
                  <div className="print-field-value multiline">{item.interpretation}</div>
                </div>
              </div>

              {item.statsSummary && (
                <div className="print-fields-grid cols-3">
                  {Object.entries(item.statsSummary).map(([k, v]) => (
                    <div key={k} className="print-field">
                      <div className="print-field-label">{k}</div>
                      <div className="print-field-value">{v}</div>
                    </div>
                  ))}
                </div>
              )}

              {item.includeRawData && item.rawData && (
                <div style={{ padding: '12px 20px' }}>
                  <div className="print-field-label" style={{ marginBottom: 6 }}>Raw Data</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                    <thead>
                      <tr>
                        {Object.keys(item.rawData[0] || {}).map(k => (
                          <th key={k} style={{ textAlign: 'left', borderBottom: '1px solid #d0d8e8', padding: '4px 8px' }}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {item.rawData.map((row, ri) => (
                        <tr key={ri}>
                          {Object.values(row).map((v, vi) => (
                            <td key={vi} style={{ padding: '4px 8px', borderBottom: '1px solid #edf0f7' }}>{typeof v === 'number' ? v.toFixed(4) : v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          <div className="print-footer">
            <span>SixSigmaPro — Generated Report</span>
            <span>{new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

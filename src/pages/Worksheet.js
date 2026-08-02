import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Papa from 'papaparse';
import { useWorksheet } from '../context/WorksheetContext';
import './Worksheet.css';

const QUICK_TOOLS = [
  { name: 'Control Chart', path: '/tool/control-chart', icon: '📈' },
  { name: 'Histogram', path: '/tool/histogram', icon: '📊' },
  { name: 'Capability', path: '/tool/capability', icon: '🎯' },
  { name: 'Pareto', path: '/tool/pareto', icon: '🏆' },
  { name: 'Scatter Plot', path: '/tool/scatter', icon: '🔵' },
  { name: 'Box Plot', path: '/tool/boxplot', icon: '📦' },
  { name: 'MSA / Gage R&R', path: '/tool/msa', icon: '📏' },
  { name: 'Hypothesis Tests', path: '/hypothesis', icon: '🧪' },
];

const GRID_ROW_CAP = 200; // editable rows shown at once — large CSVs should still be imported, not hand-typed

function DataGrid() {
  const {
    columns, rowCount, hasData,
    updateCell, renameColumn, deleteColumn, addBlankColumn, addBlankRow, deleteRow,
  } = useWorksheet();

  const isNumeric = (col) => col.data.filter(v => v !== '').every(v => !isNaN(parseFloat(v)));
  const visibleRows = Math.min(rowCount, GRID_ROW_CAP);

  const cellInputStyle = {
    width: '100%', minWidth: '70px', border: '1px solid transparent', background: 'transparent',
    color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', padding: '0.3rem 0.4rem',
    borderRadius: '4px', outline: 'none',
  };
  const headerInputStyle = {
    border: 'none', background: 'transparent', color: 'inherit', fontWeight: 600, fontSize: '0.85rem',
    outline: 'none', width: '100%', minWidth: '60px', padding: '0.15rem 0.25rem', borderRadius: '4px',
  };
  const deleteBtnStyle = {
    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem',
    lineHeight: 1, padding: '0 0.2rem', flexShrink: 0,
  };
  const addBtnStyle = {
    background: 'var(--input-bg, transparent)', border: '1px dashed var(--border)', borderRadius: '6px',
    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.35rem 0.75rem',
  };

  if (!hasData) return null;

  return (
    <div className="ws-table-wrapper">
      <table className="data-table ws-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th>
            {columns.map((c, colIndex) => (
              <th key={colIndex}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input
                    style={headerInputStyle}
                    value={c.name}
                    onChange={e => renameColumn(colIndex, e.target.value)}
                    onFocus={e => e.target.style.border = '1px solid var(--accent)'}
                    onBlur={e => e.target.style.border = 'none'}
                  />
                  <span className="col-type">{isNumeric(c) ? 'NUM' : 'TEXT'}</span>
                  <button style={deleteBtnStyle} title="Delete column" onClick={() => deleteColumn(colIndex)}>×</button>
                </div>
              </th>
            ))}
            <th style={{ verticalAlign: 'middle' }}>
              <button style={addBtnStyle} onClick={addBlankColumn} title="Add column">+ Column</button>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: visibleRows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              <td className="row-num" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}>
                {rowIndex + 1}
                <button style={{ ...deleteBtnStyle, fontSize: '0.75rem' }} title="Delete row" onClick={() => deleteRow(rowIndex)}>×</button>
              </td>
              {columns.map((c, colIndex) => (
                <td key={colIndex}>
                  <input
                    style={cellInputStyle}
                    data-row={rowIndex}
                    data-col={colIndex}
                    value={c.data[rowIndex] ?? ''}
                    onChange={e => updateCell(colIndex, rowIndex, e.target.value)}
                    onFocus={e => e.target.style.border = '1px solid var(--accent)'}
                    onBlur={e => e.target.style.border = '1px solid transparent'}
                    onKeyDown={e => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const nextRow = rowIndex + 1;
                      const focusNext = () => {
                        const next = document.querySelector(`input[data-row="${nextRow}"][data-col="${colIndex}"]`);
                        if (next) next.focus();
                      };
                      if (nextRow < visibleRows) {
                        focusNext();
                      } else {
                        addBlankRow();
                        setTimeout(focusNext, 0);
                      }
                    }}
                  />
                </td>
              ))}
              <td />
            </tr>
          ))}
          <tr>
            <td colSpan={columns.length + 2} style={{ padding: '0.5rem' }}>
              <button style={addBtnStyle} onClick={addBlankRow}>+ Row</button>
              {rowCount > GRID_ROW_CAP && (
                <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Showing first {GRID_ROW_CAP} of {rowCount} rows — import large datasets via CSV rather than editing them all by hand here.
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function Worksheet() {
  const { columns, fileName, rowCount, loadData, clearData, addColumn, startBlankSheet, hasData } = useWorksheet();
  const [dragOver, setDragOver] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColData, setNewColData] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [activeTab, setActiveTab] = useState('import');
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: ({ data, meta }) => {
        if (!data.length) return;
        const cols = meta.fields.map(f => ({
          name: f,
          data: data.map(row => row[f] ?? '')
        }));
        loadData(cols, file.name);
        setActiveTab('data');
      }
    });
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handlePaste = () => {
    const lines = pasteText.trim().split('\n').map(l => l.split(/\t|,/));
    if (!lines.length) return;
    const headers = lines[0];
    const rows = lines.slice(1);
    const cols = headers.map((h, i) => ({
      name: h.trim() || `Column${i + 1}`,
      data: rows.map(r => (r[i] || '').trim())
    }));
    loadData(cols, 'Pasted Data');
    setPasteText('');
    setActiveTab('data');
  };

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const data = newColData.split('\n').map(v => v.trim()).filter(v => v !== '');
    addColumn(newColName.trim(), data);
    setNewColName('');
    setNewColData('');
    setActiveTab('data');
  };

  const handleStartBlank = () => {
    startBlankSheet();
    setActiveTab('data');
  };

  return (
    <div className="worksheet-page">
      <div className="worksheet-header">
        <div>
          <h1>Data Worksheet</h1>
          <p>Enter your data once — it's available in every analysis tool automatically.</p>
        </div>
        <div className="worksheet-meta">
          {hasData ? (
            <>
              <span className="ws-badge">{fileName}</span>
              <span className="ws-badge">{rowCount} rows</span>
              <span className="ws-badge">{columns.length} columns</span>
              <button className="btn-ghost" onClick={clearData}>✕ Clear</button>
            </>
          ) : (
            <button className="btn-primary" onClick={handleStartBlank}>🗒️ Start Blank Grid</button>
          )}
        </div>
      </div>

      <div className="worksheet-body">
        {/* Left: import panel */}
        <div className="ws-panel">
          <div className="tab-bar">
            {['import', 'paste', 'manual'].map(t => (
              <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t === 'import' ? '📁 Import CSV' : t === 'paste' ? '📋 Paste Data' : '✏️ Add Column'}
              </button>
            ))}
            {hasData && (
              <button className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>
                📊 Data Grid
              </button>
            )}
          </div>

          {activeTab === 'import' && (
            <div>
              <div
                className={`dropzone ${dragOver ? 'active' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
              >
                <div className="dropzone-icon">📂</div>
                <div className="dropzone-text">Drop your CSV file here or click to browse</div>
                <div className="dropzone-hint">Supports .csv files — headers in first row</div>
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
              </div>
              <div className="ws-format-tip">
                <strong>CSV Format:</strong> First row = column names. Each column = one variable.
                Numbers and text are both supported. Example:
                <pre className="ws-example">Part,Measurement,Operator{'\n'}A,12.3,Op1{'\n'}A,12.1,Op1{'\n'}B,15.4,Op2</pre>
              </div>
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>— or —</span>
                <div style={{ marginTop: '0.5rem' }}>
                  <button className="btn-secondary" onClick={handleStartBlank}>🗒️ Start a Blank Grid Instead</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div>
              <p className="ws-hint">Paste data copied from Excel or any spreadsheet. First row should be column names.</p>
              <textarea
                className="ws-textarea"
                placeholder="Paste data here (tab or comma separated)..."
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={12}
              />
              <button className="btn-primary" onClick={handlePaste} style={{ marginTop: '0.75rem' }}>
                Import Pasted Data
              </button>
            </div>
          )}

          {activeTab === 'manual' && (
            <div>
              <p className="ws-hint">
                Add one column at a time by pasting or typing values below — or, for a real spreadsheet-style
                grid you can type directly into cell by cell, use <strong>Start Blank Grid</strong> above and
                edit it in the <strong>Data Grid</strong> tab.
              </p>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label>Column Name</label>
                <input type="text" value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="e.g. Measurement, Defects, Group" />
              </div>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label>Values (one per line)</label>
                <textarea className="ws-textarea" rows={10} value={newColData}
                  onChange={e => setNewColData(e.target.value)}
                  placeholder={"12.3\n14.1\n11.8\n13.2\n..."} />
              </div>
              <button className="btn-primary" onClick={handleAddColumn}>Add Column</button>
            </div>
          )}

          {activeTab === 'data' && hasData && <DataGrid />}
        </div>

        {/* Right: column summary + quick launch */}<div className="ws-sidebar">
          {hasData && (
            <div className="card ws-columns-card">
              <h3 className="section-title" style={{ marginBottom: '1rem' }}>Columns</h3>
              {columns.map(col => {
                const nums = col.data.map(parseFloat).filter(v => !isNaN(v));
                const numeric = nums.length > col.data.filter(v => v !== '').length / 2;
                return (
                  <div key={col.name} className="ws-col-item">
                    <div className="ws-col-header">
                      <span className="ws-col-name">{col.name}</span>
                      <span className={`ws-col-type ${numeric ? 'numeric' : 'text'}`}>{numeric ? 'Numeric' : 'Text'}</span>
                    </div>
                    {numeric && nums.length > 0 && (
                      <div className="ws-col-stats">
                        <span>n={nums.length}</span>
                        <span>x̄={(nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(3)}</span>
                        <span>min={Math.min(...nums).toFixed(2)}</span>
                        <span>max={Math.max(...nums).toFixed(2)}</span>
                      </div>
                    )}
                    {!numeric && (
                      <div className="ws-col-stats">
                        <span>n={col.data.filter(v=>v!=='').length}</span>
                        <span>{[...new Set(col.data.filter(v=>v!==''))].length} unique</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="card ws-tools-card">
            <h3 className="section-title" style={{ marginBottom: '1rem' }}>
              {hasData ? 'Send to Tool' : 'Available Tools'}
            </h3>
            {!hasData && <p className="ws-hint" style={{ marginBottom: '1rem' }}>Import data first, then select a tool to analyze it.</p>}
            <div className="ws-tools-grid">
              {QUICK_TOOLS.map(t => (
                <Link key={t.path} to={t.path} className={`ws-tool-btn ${!hasData ? 'disabled' : ''}`}>
                  <span>{t.icon}</span>
                  <span>{t.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useState } from 'react';
import Papa from 'papaparse';

export default function CSVUploader({ onData, requiredColumns, sampleData, title = "Upload CSV Data" }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const processFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.');
      return;
    }
    setFileName(file.name);
    setError('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV: ' + results.errors[0].message);
          return;
        }
        onData(results.data, results.meta.fields);
      },
      error: (err) => setError('Parse error: ' + err.message),
    });
  }, [onData]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleChange = useCallback((e) => {
    processFile(e.target.files[0]);
  }, [processFile]);

  const loadSample = useCallback(() => {
    if (!sampleData) return;
    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const file = new File([blob], 'sample_data.csv');
    setFileName('sample_data.csv (demo)');
    setError('');
    onData(sampleData, Object.keys(sampleData[0]));
  }, [sampleData, onData]);

  return (
    <div>
      <div
        className={`dropzone ${dragging ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('csv-upload-input').click()}
      >
        <input
          id="csv-upload-input"
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Drag & drop your CSV file here, or click to browse
        </div>
        {requiredColumns && (
          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {requiredColumns.map(col => (
              <span key={col} className="tag">{col}</span>
            ))}
          </div>
        )}
      </div>

      {fileName && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)', fontSize: 13 }}>
          <span>✓</span> <span style={{ fontFamily: 'var(--font-mono)' }}>{fileName}</span>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 13, background: 'rgba(239,71,111,0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,71,111,0.2)' }}>
          ⚠️ {error}
        </div>
      )}

      {sampleData && (
        <button
          className="btn btn-ghost"
          onClick={loadSample}
          style={{ marginTop: 12, fontSize: 13 }}
        >
          🎲 Load Sample Data
        </button>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import './Tool.css';

const emptyRow = () => ({
  id: Date.now() + Math.random(),
  processStep: '',
  failureMode: '',
  effect: '',
  severity: 5,
  cause: '',
  occurrence: 5,
  controls: '',
  detection: 5,
  rpn: 125,
  action: '',
  responsible: '',
  targetDate: '',
  newSev: '',
  newOcc: '',
  newDet: '',
  newRpn: '',
  status: 'Open',
});

const getRPNColor = (rpn) => {
  if (rpn >= 200) return 'var(--red)';
  if (rpn >= 100) return 'var(--orange)';
  if (rpn >= 50) return 'var(--yellow)';
  return 'var(--green)';
};

const getRPNLabel = (rpn) => {
  if (rpn >= 200) return 'Critical';
  if (rpn >= 100) return 'High';
  if (rpn >= 50) return 'Medium';
  return 'Low';
};

export default function FMEA() {
  const [rows, setRows] = useState([
    {
      ...emptyRow(),
      processStep: 'Welding',
      failureMode: 'Incomplete Weld',
      effect: 'Part Failure / Safety Risk',
      severity: 9,
      cause: 'Improper heat setting',
      occurrence: 4,
      controls: 'Visual inspection',
      detection: 6,
      rpn: 216,
      action: 'Add ultrasonic testing',
      responsible: 'J. Smith',
      targetDate: '2025-03-01',
      status: 'In Progress',
    },
    {
      ...emptyRow(),
      processStep: 'Assembly',
      failureMode: 'Wrong Part Installed',
      effect: 'Customer Return',
      severity: 7,
      cause: 'Unclear work instructions',
      occurrence: 3,
      controls: 'Part number check',
      detection: 4,
      rpn: 84,
      action: 'Poka-yoke fixture',
      responsible: 'M. Jones',
      targetDate: '2025-02-15',
      status: 'Open',
    },
  ]);

  const [sortBy, setSortBy] = useState('rpn');

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (['severity', 'occurrence', 'detection'].includes(field)) {
        updated.rpn = updated.severity * updated.occurrence * updated.detection;
      }
      if (['newSev', 'newOcc', 'newDet'].includes(field)) {
        const s = +updated.newSev || updated.severity;
        const o = +updated.newOcc || updated.occurrence;
        const d = +updated.newDet || updated.detection;
        updated.newRpn = s && o && d ? s * o * d : '';
      }
      return updated;
    }));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const deleteRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const sorted = [...rows].sort((a, b) => sortBy === 'rpn' ? b.rpn - a.rpn : b.severity - a.severity);
  const critCount = rows.filter(r => r.rpn >= 200).length;
  const highCount = rows.filter(r => r.rpn >= 100 && r.rpn < 200).length;
  const avgRPN = rows.length ? Math.round(rows.reduce((s, r) => s + r.rpn, 0) / rows.length) : 0;

  const exportCSV = () => {
    const headers = ['Process Step', 'Failure Mode', 'Effect', 'Severity', 'Cause', 'Occurrence', 'Controls', 'Detection', 'RPN', 'Priority', 'Action', 'Responsible', 'Target Date', 'Status'];
    const csvRows = rows.map(r => [
      r.processStep, r.failureMode, r.effect, r.severity, r.cause, r.occurrence, r.controls, r.detection, r.rpn, getRPNLabel(r.rpn), r.action, r.responsible, r.targetDate, r.status
    ].map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'FMEA.csv';
    link.click();
  };

  return (
    <div className="tool-container tool-full">
      {/* Header & Stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div className="stats-row" style={{ flex: 1, minWidth: 0 }}>
          <div className="stat-card"><div className={`stat-value ${critCount > 0 ? 'stat-bad' : 'stat-good'}`}>{critCount}</div><div className="stat-label">Critical (≥200)</div></div>
          <div className="stat-card"><div className={`stat-value ${highCount > 0 ? 'stat-warn' : 'stat-good'}`}>{highCount}</div><div className="stat-label">High (100–199)</div></div>
          <div className="stat-card"><div className="stat-value">{rows.length}</div><div className="stat-label">Total Items</div></div>
          <div className="stat-card"><div className="stat-value">{avgRPN}</div><div className="stat-label">Avg RPN</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <select className="input" style={{ width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="rpn">Sort by RPN</option>
            <option value="severity">Sort by Severity</option>
          </select>
          <button className="btn btn-ghost" onClick={exportCSV}>📥 Export CSV</button>
          <button className="btn btn-primary" onClick={addRow}>+ Add Row</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', background: 'var(--navy-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <table className="data-table" style={{ minWidth: 1400 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 120 }}>Process Step</th>
              <th style={{ minWidth: 150 }}>Failure Mode</th>
              <th style={{ minWidth: 150 }}>Effect</th>
              <th style={{ width: 50, textAlign: 'center' }}>SEV</th>
              <th style={{ minWidth: 150 }}>Cause</th>
              <th style={{ width: 50, textAlign: 'center' }}>OCC</th>
              <th style={{ minWidth: 130 }}>Current Controls</th>
              <th style={{ width: 50, textAlign: 'center' }}>DET</th>
              <th style={{ width: 70, textAlign: 'center' }}>RPN</th>
              <th style={{ width: 80, textAlign: 'center' }}>Priority</th>
              <th style={{ minWidth: 150 }}>Recommended Action</th>
              <th style={{ minWidth: 100 }}>Responsible</th>
              <th style={{ minWidth: 110 }}>Target Date</th>
              <th style={{ width: 90, textAlign: 'center' }}>Status</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.id} style={{ verticalAlign: 'top' }}>
                <td><input className="input" style={{ fontSize: 12, padding: '6px 8px' }} value={row.processStep} onChange={e => updateRow(row.id, 'processStep', e.target.value)} placeholder="Step name" /></td>
                <td><input className="input" style={{ fontSize: 12, padding: '6px 8px' }} value={row.failureMode} onChange={e => updateRow(row.id, 'failureMode', e.target.value)} placeholder="How can it fail?" /></td>
                <td><input className="input" style={{ fontSize: 12, padding: '6px 8px' }} value={row.effect} onChange={e => updateRow(row.id, 'effect', e.target.value)} placeholder="What's the effect?" /></td>
                <td>
                  <select className="input" style={{ fontSize: 12, padding: '6px 4px', textAlign: 'center' }} value={row.severity} onChange={e => updateRow(row.id, 'severity', +e.target.value)}>
                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                  </select>
                </td>
                <td><input className="input" style={{ fontSize: 12, padding: '6px 8px' }} value={row.cause} onChange={e => updateRow(row.id, 'cause', e.target.value)} placeholder="Root cause" /></td>
                <td>
                  <select className="input" style={{ fontSize: 12, padding: '6px 4px', textAlign: 'center' }} value={row.occurrence} onChange={e => updateRow(row.id, 'occurrence', +e.target.value)}>
                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                  </select>
                </td>
                <td><input className="input" style={{ fontSize: 12, padding: '6px 8px' }} value={row.controls} onChange={e => updateRow(row.id, 'controls', e.target.value)} placeholder="Current controls" /></td>
                <td>
                  <select className="input" style={{ fontSize: 12, padding: '6px 4px', textAlign: 'center' }} value={row.detection} onChange={e => updateRow(row.id, 'detection', +e.target.value)}>
                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                  </select>
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: getRPNColor(row.rpn) }}>{row.rpn}</td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ color: getRPNColor(row.rpn), fontWeight: 600, fontSize: 12 }}>{getRPNLabel(row.rpn)}</span>
                </td>
                <td><input className="input" style={{ fontSize: 12, padding: '6px 8px' }} value={row.action} onChange={e => updateRow(row.id, 'action', e.target.value)} placeholder="Action plan" /></td>
                <td><input className="input" style={{ fontSize: 12, padding: '6px 8px' }} value={row.responsible} onChange={e => updateRow(row.id, 'responsible', e.target.value)} placeholder="Owner" /></td>
                <td><input type="date" className="input" style={{ fontSize: 12, padding: '6px 8px' }} value={row.targetDate} onChange={e => updateRow(row.id, 'targetDate', e.target.value)} /></td>
                <td>
                  <select className="input" style={{ fontSize: 12, padding: '6px 4px' }} value={row.status} onChange={e => updateRow(row.id, 'status', e.target.value)}>
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Closed</option>
                    <option>Verified</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => deleteRow(row.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '4px' }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="alert alert-info">
        <strong>📖 FMEA Guide:</strong> RPN = Severity × Occurrence × Detection (each rated 1–10). Prioritize items with RPN ≥ 100 or Severity ≥ 9. After implementing actions, re-score to calculate new RPN.
      </div>
    </div>
  );
}

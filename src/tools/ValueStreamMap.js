import React, { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useReport } from '../context/ReportContext';
import { interpretVSM } from '../utils/interpretations';
import './Tool.css';

const initSteps = [
  { id: 1, name: 'Order Entry', type: 'process', cycleTime: 30, vaTime: 5, waitTime: 120, inventory: 50, workers: 2, isVA: false },
  { id: 2, name: 'Raw Material', type: 'inventory', cycleTime: 0, vaTime: 0, waitTime: 480, inventory: 200, workers: 0, isVA: false },
  { id: 3, name: 'Machining', type: 'process', cycleTime: 45, vaTime: 40, waitTime: 60, inventory: 20, workers: 3, isVA: true },
  { id: 4, name: 'Inspection', type: 'process', cycleTime: 15, vaTime: 0, waitTime: 30, inventory: 10, workers: 1, isVA: false },
  { id: 5, name: 'Assembly', type: 'process', cycleTime: 60, vaTime: 55, waitTime: 90, inventory: 15, workers: 4, isVA: true },
  { id: 6, name: 'Shipping', type: 'process', cycleTime: 20, vaTime: 10, waitTime: 240, inventory: 30, workers: 2, isVA: false },
];

export default function ValueStreamMap() {
  const { addReportItem } = useReport();
  const vsmWrapperRef = useRef(null);
  const [addedToReport, setAddedToReport] = useState(false);
  const [steps, setSteps] = useState(initSteps);
  const [taktTime, setTaktTime] = useState(480);
  const [customerDemand, setCustomerDemand] = useState(100);

  const totalLeadTime = steps.reduce((s, st) => s + st.cycleTime + st.waitTime, 0);
  const totalVATime = steps.reduce((s, st) => s + st.vaTime, 0);
  const totalCycleTime = steps.reduce((s, st) => s + st.cycleTime, 0);
  const efficiency = totalLeadTime > 0 ? ((totalVATime / totalLeadTime) * 100) : 0;
  const totalInventory = steps.reduce((s, st) => s + st.inventory, 0);

  const updateStep = (id, field, value) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: isNaN(+value) ? value : +value } : s));
  };

  const addStep = () => {
    const newId = Math.max(...steps.map(s => s.id)) + 1;
    setSteps(prev => [...prev, { id: newId, name: `Step ${newId}`, type: 'process', cycleTime: 30, vaTime: 20, waitTime: 60, inventory: 10, workers: 1, isVA: true }]);
  };

  const removeStep = (id) => setSteps(prev => prev.filter(s => s.id !== id));

  const handleAddToReport = useCallback(async () => {
    if (!vsmWrapperRef.current) return;

    const canvas = await html2canvas(vsmWrapperRef.current, { backgroundColor: null, scale: 2 });
    const chartImage = canvas.toDataURL('image/png');

    const interpretation = interpretVSM({
      efficiency, totalLeadTime, totalVATime, totalInventory, steps, taktTime: taktTime / customerDemand,
    });

    addReportItem({
      title: 'Value Stream Map — Current State',
      toolId: 'vsm',
      timestamp: new Date().toISOString(),
      chartImage,
      statsSummary: {
        'Process Efficiency': efficiency.toFixed(1) + '%',
        'Total Lead Time (min)': totalLeadTime,
        'Value-Added Time (min)': totalVATime,
        'Non-Value-Added Time (min)': totalLeadTime - totalVATime,
        'Total Inventory (units)': totalInventory,
        'Takt Time (min/unit)': (taktTime / customerDemand).toFixed(2),
      },
      interpretation,
      rawData: steps.map(s => ({ step: s.name, type: s.type, cycleTime: s.cycleTime, vaTime: s.vaTime, waitTime: s.waitTime, inventory: s.inventory, isValueAdd: s.isVA ? 'Yes' : 'No' })),
    });

    setAddedToReport(true);
    setTimeout(() => setAddedToReport(false), 2500);
  }, [steps, efficiency, totalLeadTime, totalVATime, totalInventory, taktTime, customerDemand, addReportItem]);

  return (
    <div className="tool-container tool-full">
      {/* Config */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        <div className="tool-panel">
          <div className="panel-title">⚙️ VSM Settings</div>
          <div className="field-group">
            <label className="field-label">Available Time / Day (min)</label>
            <input type="number" className="input" value={taktTime} onChange={e => setTaktTime(+e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Customer Demand / Day (units)</label>
            <input type="number" className="input" value={customerDemand} onChange={e => setCustomerDemand(+e.target.value)} />
          </div>
          <div style={{ marginTop: 12, padding: '12px', background: 'var(--navy-3)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Takt Time</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--cyan)' }}>{(taktTime / customerDemand).toFixed(2)} min</div>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
          <div className="stat-value" style={{ color: efficiency > 50 ? 'var(--green)' : efficiency > 25 ? 'var(--yellow)' : 'var(--red)' }}>{efficiency.toFixed(1)}%</div>
          <div className="stat-label">Process Efficiency</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(totalLeadTime / 60)}h {totalLeadTime % 60}m</div>
          <div className="stat-label">Total Lead Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-good">{totalVATime} min</div>
          <div className="stat-label">Value-Added Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-bad">{totalLeadTime - totalVATime} min</div>
          <div className="stat-label">Non-Value-Added Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalInventory}</div>
          <div className="stat-label">Total Inventory (units)</div>
        </div>
      </div>

      <div ref={vsmWrapperRef}>
        {/* VSM Visual */}
        <div className="chart-wrapper" style={{ overflowX: 'auto' }}>
          <div className="chart-title">Value Stream Map — Current State</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: steps.length * 180, padding: '16px 0' }}>
            {steps.map((step, i) => (
              <React.Fragment key={step.id}>
                <div style={{ textAlign: 'center', width: 160, flexShrink: 0 }}>
                  {/* Process box */}
                  <div style={{
                    background: step.isVA ? 'var(--green-dim)' : 'var(--navy-3)',
                    border: `2px solid ${step.isVA ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '12px 10px',
                    margin: '0 auto',
                    width: 140,
                  }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: step.isVA ? 'var(--green)' : 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
                      {step.isVA ? 'VALUE-ADD' : 'NON-VA'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{step.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'left' }}>
                      <div>⏱ CT: <strong style={{ color: 'var(--text-primary)' }}>{step.cycleTime}min</strong></div>
                      <div>✅ VA: <strong style={{ color: 'var(--green)' }}>{step.vaTime}min</strong></div>
                      <div>⏳ Wait: <strong style={{ color: 'var(--orange)' }}>{step.waitTime}min</strong></div>
                      <div>📦 Inv: <strong style={{ color: 'var(--cyan)' }}>{step.inventory}</strong></div>
                      {step.workers > 0 && <div>👷 Op: <strong>{step.workers}</strong></div>}
                    </div>
                  </div>
                  {/* Timeline bar */}
                  <div style={{ marginTop: 12, display: 'flex', height: 20, width: 140, margin: '8px auto 0', borderRadius: 4, overflow: 'hidden' }}>
                    {step.vaTime > 0 && (
                      <div style={{ flex: step.vaTime, background: 'var(--green)', opacity: 0.7 }} title={`VA: ${step.vaTime}min`} />
                    )}
                    {(step.cycleTime - step.vaTime) > 0 && (
                      <div style={{ flex: step.cycleTime - step.vaTime, background: 'var(--orange)', opacity: 0.5 }} title={`NVA CT: ${step.cycleTime - step.vaTime}min`} />
                    )}
                    {step.waitTime > 0 && (
                      <div style={{ flex: Math.min(step.waitTime, step.cycleTime * 3 || 60), background: 'var(--red)', opacity: 0.35 }} title={`Wait: ${step.waitTime}min`} />
                    )}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 20, paddingTop: 40 }}>→</div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
            <span style={{ color: 'var(--green)' }}>■ Value-Added</span>
            <span style={{ color: 'var(--orange)', opacity: 0.7 }}>■ Necessary NVA</span>
            <span style={{ color: 'var(--red)', opacity: 0.7 }}>■ Wait / Waste</span>
          </div>
        </div>

        <div className={`alert ${efficiency > 50 ? 'alert-success' : efficiency > 25 ? 'alert-info' : 'alert-warning'}`}>
          <strong>Process Efficiency: {efficiency.toFixed(1)}%</strong> —{' '}
          {efficiency > 50 ? 'Good process efficiency. Continue to look for improvement opportunities.' :
            efficiency > 25 ? 'Moderate efficiency. Significant waste exists. Focus on eliminating wait times and unnecessary steps.' :
              'Low process efficiency. Major waste exists. Use the 8 wastes (TIM WOODS) framework to identify and eliminate NVA activities.'}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Process Steps</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={addStep}>+ Add Step</button>
          <button className="btn btn-primary" onClick={handleAddToReport}>
            {addedToReport ? '✓ Added to Report' : '📄 Add to Report'}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', background: 'var(--navy-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <table className="data-table" style={{ minWidth: 900 }}>
          <thead>
            <tr><th>Step Name</th><th>Type</th><th>Cycle Time (min)</th><th>VA Time (min)</th><th>Wait Time (min)</th><th>Inventory</th><th>Operators</th><th>Value-Add?</th><th></th></tr>
          </thead>
          <tbody>
            {steps.map(step => (
              <tr key={step.id}>
                <td><input className="input" style={{ fontSize: 13, padding: '6px 8px' }} value={step.name} onChange={e => updateStep(step.id, 'name', e.target.value)} /></td>
                <td>
                  <select className="input" style={{ fontSize: 13, padding: '6px 8px' }} value={step.type} onChange={e => updateStep(step.id, 'type', e.target.value)}>
                    <option value="process">Process</option>
                    <option value="inventory">Inventory</option>
                    <option value="transport">Transport</option>
                  </select>
                </td>
                {['cycleTime', 'vaTime', 'waitTime', 'inventory', 'workers'].map(field => (
                  <td key={field}><input type="number" className="input" style={{ fontSize: 13, padding: '6px 8px', width: 90 }} value={step[field]} onChange={e => updateStep(step.id, field, e.target.value)} min={0} /></td>
                ))}
                <td>
                  <select className="input" style={{ fontSize: 13, padding: '6px 8px' }} value={step.isVA ? 'yes' : 'no'} onChange={e => updateStep(step.id, 'isVA', e.target.value === 'yes')}>
                    <option value="yes">✅ Yes</option>
                    <option value="no">❌ No</option>
                  </select>
                </td>
                <td><button onClick={() => removeStep(step.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

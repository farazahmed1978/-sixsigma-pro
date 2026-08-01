import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorksheet } from '../context/WorksheetContext';

const TOOL_META = {
  'descriptive': { icon: '🔢', title: 'Descriptive Statistics' },
  'histogram': { icon: '📊', title: 'Histogram' },
  'run-chart': { icon: '📉', title: 'Run Chart' },
  'control-chart': { icon: '📈', title: 'Control Chart' },
  'capability': { icon: '🎯', title: 'Capability Analysis' },
  'boxplot': { icon: '📦', title: 'Box Plot' },
  'multivari': { icon: '🔀', title: 'Multi-Vari Chart' },
  'correlation': { icon: '🔗', title: 'Correlation Matrix' },
  'regression': { icon: '📐', title: 'Regression Analysis' },
  'anova': { icon: '📶', title: 'ANOVA' },
  'pareto': { icon: '🏆', title: 'Pareto Chart' },
  'fishbone': { icon: '🐟', title: 'Fishbone Diagram' },
  'msa': { icon: '📏', title: 'MSA / Gage R&R' },
  'fmea': { icon: '⚠️', title: 'FMEA' },
  'vsm': { icon: '🗺️', title: 'Value Stream Map' },
  'sigma-calculator': { icon: '🎚️', title: 'Sigma Level / DPMO' },
  'sample-size-calculator': { icon: '🧮', title: 'Sample Size Calculator' },
  'power-calculator': { icon: '⚡', title: 'Power Calculator' },
};

const AREAS = [
  { id: 'descriptive', label: 'Descriptive / Charts', tools: ['descriptive', 'histogram', 'run-chart'] },
  { id: 'control', label: 'Control / Stability', tools: ['control-chart'] },
  { id: 'capability', label: 'Capability', tools: ['capability'] },
  { id: 'hypothesis', label: 'Hypothesis Tests', directLink: '/hypothesis', directIcon: '🧪', directTitle: 'Hypothesis Testing' },
  { id: 'compare', label: 'Compare Groups', tools: ['boxplot', 'multivari'] },
  { id: 'correlation', label: 'Correlation', tools: ['correlation'] },
  { id: 'regression', label: 'Regression', tools: ['regression'] },
  { id: 'anova', label: 'ANOVA', tools: ['anova'] },
  { id: 'pareto', label: 'Pareto / Root Cause', tools: ['pareto', 'fishbone'] },
  { id: 'measurement', label: 'Measurement System', tools: ['msa'] },
  { id: 'risk', label: 'Risk (FMEA)', tools: ['fmea'] },
  { id: 'flow', label: 'Process Flow', tools: ['vsm'] },
  { id: 'calculators', label: 'Sigma / Sample Size', tools: ['sigma-calculator', 'sample-size-calculator', 'power-calculator'] },
];

export default function GuidedHome() {
  const { hasData, getNumericColumns, getCategoricalColumns, clearData } = useWorksheet();
  const navigate = useNavigate();
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState([]);
  const [selectedCategorical, setSelectedCategorical] = useState([]);

  if (!hasData) {
    return (
      <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧭</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Welcome to SixSigma Pro</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Load your data, then select an analysis area and the variables you want to use.
          </p>
          <Link to="/worksheet" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.65rem 1.5rem' }}>
            Upload Your Data →
          </Link>
        </div>
      </div>
    );
  }

  const metricCols = getNumericColumns();
  const categoricalCols = getCategoricalColumns ? getCategoricalColumns() : [];

  const toggleMetric = (name) => setSelectedMetric(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
  const toggleCategorical = (name) => setSelectedCategorical(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);

  const openTool = (toolId, path) => {
    navigate(path || `/tool/${toolId}`, { state: { selectedMetric, selectedCategorical } });
  };

  const area = AREAS.find(a => a.id === selectedArea);

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontWeight: 600 }}>Data loaded — {metricCols.length} metric column{metricCols.length !== 1 ? 's' : ''}, {categoricalCols.length} categorical column{categoricalCols.length !== 1 ? 's' : ''}</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/worksheet" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}>Change Data</Link>
          <button className="btn-secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }} onClick={clearData}>Clear</button>
        </div>
      </div>

      {/* Step 1 — Select Area */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Step 1 — Select Area</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {AREAS.map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedArea(a.id)}
              className={selectedArea === a.id ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {area && (
        <>
          {/* Step 2 — Select Variables */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Step 2 — Select Variables (optional)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Metric Variables</div>
                {metricCols.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None detected</div>}
                {metricCols.map(c => (
                  <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedMetric.includes(c.name)} onChange={() => toggleMetric(c.name)} />
                    {c.name}
                  </label>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Categorical Variables</div>
                {categoricalCols.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None detected</div>}
                {categoricalCols.map(c => (
                  <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedCategorical.includes(c.name)} onChange={() => toggleCategorical(c.name)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3 — Tools in selected area */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Step 3 — Open a Tool</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {area.directLink ? (
                <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '1.4rem' }}>{area.directIcon}</div>
                  <div style={{ flex: 1, fontWeight: 600 }}>{area.directTitle}</div>
                  <button className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => openTool(null, area.directLink)}>Open →</button>
                </div>
              ) : (
                area.tools.map(toolId => {
                  const meta = TOOL_META[toolId] || {};
                  return (
                    <div key={toolId} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ fontSize: '1.4rem' }}>{meta.icon}</div>
                      <div style={{ flex: 1, fontWeight: 600 }}>{meta.title}</div>
                      <button className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={() => openTool(toolId)}>Open →</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Prefer the phase-based menu? <Link to="/dashboard" style={{ color: 'var(--accent-light)' }}>Browse all tools manually</Link>
      </div>
    </div>
  );
}

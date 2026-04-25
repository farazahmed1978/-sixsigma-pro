import React from 'react';
import { Link } from 'react-router-dom';
import { useWorksheet } from '../context/WorksheetContext';
import './Dashboard.css';

const DMAIC_SECTIONS = [
  {
    phase: 'Define',
    color: 'var(--yellow)',
    icon: '🎯',
    desc: 'Clarify the problem, scope the project, and identify customer requirements.',
    tools: [
      { name: 'Project Charter', path: '/templates', icon: '📋', desc: 'Define project scope and goals' },
      { name: 'SIPOC Diagram', path: '/templates', icon: '🗺️', desc: 'Map suppliers, inputs, process, outputs, customers' },
      { name: 'CTQ Tree', path: '/templates', icon: '🌳', desc: 'Translate customer needs to measurable specs' },
      { name: 'Cost-Benefit Analysis', path: '/templates', icon: '💰', desc: 'Justify the project financially' },
    ]
  },
  {
    phase: 'Measure',
    color: 'var(--green)',
    icon: '📏',
    desc: 'Quantify the current state, validate your measurement system, and establish a baseline.',
    tools: [
      { name: 'Control Chart', path: '/tool/control-chart', icon: '📈', desc: 'Detect special cause variation' },
      { name: 'Capability Analysis', path: '/tool/capability', icon: '🎯', desc: 'Calculate Cp, Cpk, Pp, Ppk, sigma level' },
      { name: 'Descriptive Statistics', path: '/tool/descriptive', icon: '🔢', desc: 'Mean, median, std dev, CI, skewness, kurtosis' },
      { name: 'MSA / Gage R&R', path: '/tool/msa', icon: '📏', desc: 'Validate your measurement system' },
      { name: 'Histogram', path: '/tool/histogram', icon: '📊', desc: 'Visualize data distribution' },
      { name: 'Run Chart', path: '/tool/run-chart', icon: '📉', desc: 'Spot trends and shifts over time' },
    ]
  },
  {
    phase: 'Analyze',
    color: 'var(--orange)',
    icon: '🔬',
    desc: 'Identify root causes using data — not assumptions.',
    tools: [
      { name: 'Hypothesis Testing', path: '/hypothesis', icon: '🧪', desc: '20+ tests: t-tests, ANOVA, chi-square, nonparametric' },
      { name: 'Regression Analysis', path: '/tool/regression', icon: '📐', desc: 'Model relationships between variables' },
      { name: 'Correlation Matrix', path: '/tool/correlation', icon: '🔗', desc: 'Pearson r across all variable pairs' },
      { name: 'Pareto Chart', path: '/tool/pareto', icon: '🏆', desc: 'Identify the vital few causes' },
      { name: 'Fishbone Diagram', path: '/tool/fishbone', icon: '🐟', desc: 'Structured root cause brainstorming' },
      { name: 'Box Plot', path: '/tool/boxplot', icon: '📦', desc: 'Compare distributions across groups' },
      { name: 'Scatter Plot', path: '/tool/scatter', icon: '🔵', desc: 'Visualize relationships between two variables' },
      { name: 'Multi-Vari Chart', path: '/tool/multivari', icon: '🔀', desc: 'Separate positional, cyclical, temporal variation' },
    ]
  },
  {
    phase: 'Improve',
    color: 'var(--purple)',
    icon: '⚡',
    desc: 'Develop, test, and implement solutions that eliminate root causes.',
    tools: [
      { name: 'Design of Experiments', path: '/doe', icon: '⚗️', desc: 'Full/fractional factorial + response analysis' },
      { name: 'FMEA', path: '/tool/fmea', icon: '⚠️', desc: 'Failure Mode and Effects Analysis' },
      { name: 'Value Stream Map', path: '/tool/vsm', icon: '🗺️', desc: 'Identify waste and flow improvements' },
      { name: 'DOE Experiment Plan', path: '/templates', icon: '📋', desc: 'Document your experiment design' },
    ]
  },
  {
    phase: 'Control',
    color: 'var(--cyan)',
    icon: '🔒',
    desc: 'Sustain the gains — monitor, document, and hand off.',
    tools: [
      { name: 'Control Chart', path: '/tool/control-chart', icon: '📈', desc: 'Ongoing process monitoring' },
      { name: 'Gage R&R', path: '/tool/gage-rr', icon: '🔬', desc: 'Validate measurement system' },
      { name: 'Meeting Minutes', path: '/templates', icon: '📝', desc: 'Document project decisions and actions' },
    ]
  },
];

const STATS = [
  { value: '40+', label: 'Analysis Tools' },
  { value: '20+', label: 'Hypothesis Tests' },
  { value: '9', label: 'Pro Templates' },
  { value: '100%', label: 'Browser-Based' },
];

export default function Dashboard() {
  const { hasData, fileName, rowCount, columns } = useWorksheet();

  return (
    <div className="dashboard">
      {/* Hero */}
      <section className="dash-hero">
        <div className="dash-hero-content">
          <div className="dash-hero-badge">Professional Lean Six Sigma Platform</div>
          <h1>Your complete DMAIC toolkit — in the browser</h1>
          <p>
            40+ statistical tools, hypothesis testing, design of experiments,
            and professional templates. Everything quality professionals need
            at a fraction of the cost of Minitab.
          </p>
          <div className="dash-hero-actions">
            <Link to="/worksheet" className="btn-primary">
              {hasData ? '📊 Open Worksheet' : '🗂️ Load Your Data'}
            </Link>
            <Link to="/pricing" className="btn-secondary">See Plans & Pricing</Link>
          </div>
        </div>
        <div className="dash-stats-grid">
          {STATS.map(s => (
            <div key={s.label} className="dash-stat">
              <div className="dash-stat-value">{s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Worksheet status banner */}
      {hasData && (
        <div className="dash-ws-banner">
          <span className="dash-ws-icon">📊</span>
          <div>
            <strong>{fileName}</strong> is loaded —{' '}
            <span>{rowCount} rows, {columns.length} columns</span>
          </div>
          <Link to="/worksheet" className="btn-ghost">View &amp; Edit →</Link>
        </div>
      )}

      {!hasData && (
        <div className="dash-ws-banner dash-ws-empty">
          <span className="dash-ws-icon">💡</span>
          <div>
            <strong>Start by loading your data</strong> — enter it once in the Worksheet and every tool uses it automatically.
          </div>
          <Link to="/worksheet" className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}>Open Worksheet</Link>
        </div>
      )}

      {/* DMAIC phases */}
      <section className="dash-phases">
        <h2 className="dash-section-title">Tools by DMAIC Phase</h2>
        <div className="phases-list">
          {DMAIC_SECTIONS.map(section => (
            <div key={section.phase} className="phase-block">
              <div className="phase-header" style={{ borderLeftColor: section.color }}>
                <span className="phase-icon">{section.icon}</span>
                <div>
                  <h3 className="phase-name" style={{ color: section.color }}>{section.phase}</h3>
                  <p className="phase-desc">{section.desc}</p>
                </div>
              </div>
              <div className="phase-tools">
                {section.tools.map(tool => (
                  <Link key={tool.name} to={tool.path} className="dash-tool-card">
                    <span className="dash-tool-icon">{tool.icon}</span>
                    <div>
                      <div className="dash-tool-name">{tool.name}</div>
                      <div className="dash-tool-desc">{tool.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Value prop footer */}
      <section className="dash-value-footer">
        <div className="dash-value-item">
          <div className="dash-value-icon">🔒</div>
          <div>
            <strong>100% Private</strong>
            <p>All calculations run in your browser. Your data never leaves your computer.</p>
          </div>
        </div>
        <div className="dash-value-item">
          <div className="dash-value-icon">🌐</div>
          <div>
            <strong>No Installation</strong>
            <p>Works on any device with a browser. No IT approval required.</p>
          </div>
        </div>
        <div className="dash-value-item">
          <div className="dash-value-icon">💸</div>
          <div>
            <strong>$9.99/month</strong>
            <p>Minitab costs $154+/month. Get the same power for 94% less.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

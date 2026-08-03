import React, { useState, useEffect, useRef } from 'react';
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
      { name: 'Gage R&R (MSA)', path: '/tool/msa', icon: '📏', desc: 'Validate your measurement system' },
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
      { name: 'Meeting Minutes', path: '/templates', icon: '📝', desc: 'Document project decisions and actions' },
    ]
  },
];

const STATS = [
  { target: 40, suffix: '+', label: 'Analysis Tools' },
  { target: 20, suffix: '+', label: 'Hypothesis Tests' },
  { target: 9, suffix: '', label: 'Pro Templates' },
  { target: 100, suffix: '%', label: 'Browser-Based' },
];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function CountUp({ target, suffix, duration = 1400 }) {
  const [display, setDisplay] = useState(prefersReducedMotion() ? target : 0);

  useEffect(() => {
    if (prefersReducedMotion()) { setDisplay(target); return; }
    let start = null;
    let raf;
    const step = (ts) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <>{display}{suffix}</>;
}

// Signature hero visual — an animated control chart: points draw in,
// one point breaches the upper control limit and gets flagged.
function LiveControlChart() {
  const points = [124, 116, 138, 121, 131, 109, 119, 46, 127, 134, 113, 122];
  const breachIndex = 7;
  const width = 600, height = 260, padding = 42;
  const xStep = (width - padding * 2) / (points.length - 1);
  const ucl = 72, lcl = 190, center = 131;
  const coords = points.map((y, i) => [padding + i * xStep, y]);
  const pathD = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="hero-chart-svg" role="img"
      aria-label="Animated control chart: a process point breaches the upper control limit and is flagged out of control">
      <line x1={padding} y1={ucl} x2={width - padding} y2={ucl} className="hero-chart-limit" />
      <line x1={padding} y1={lcl} x2={width - padding} y2={lcl} className="hero-chart-limit" />
      <line x1={padding} y1={center} x2={width - padding} y2={center} className="hero-chart-center" />
      <text x={width - padding + 8} y={ucl + 4} className="hero-chart-label">UCL</text>
      <text x={width - padding + 8} y={lcl + 4} className="hero-chart-label">LCL</text>
      <text x={width - padding + 8} y={center + 4} className="hero-chart-label hero-chart-label-muted">x̄</text>
      <path d={pathD} className="hero-chart-line" />
      {coords.map(([x, y], i) => (
        i === breachIndex ? (
          <g key={i} style={{ animationDelay: `${1.5 + i * 0.06}s` }} className="hero-chart-breach-group">
            <circle cx={x} cy={y} r="6" className="hero-chart-breach-ring" style={{ animationDelay: `${2.2 + i * 0.06}s` }} />
            <circle cx={x} cy={y} r="5" className="hero-chart-breach-dot" style={{ animationDelay: `${1.5 + i * 0.06}s` }} />
            <text x={x} y={y - 16} className="hero-chart-flag" style={{ animationDelay: `${1.9 + i * 0.06}s` }}>OUT OF CONTROL</text>
          </g>
        ) : (
          <circle key={i} cx={x} cy={y} r="4" className="hero-chart-point" style={{ animationDelay: `${1.5 + i * 0.06}s` }} />
        )
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const { hasData, fileName, rowCount, columns } = useWorksheet();

  return (
    <div className="dashboard">
      {/* Hero */}
      <section className="dash-hero">
        <div className="dash-hero-content">
          <div className="dash-hero-badge hero-fade-item" style={{ animationDelay: '0s' }}>
            Verified against R, Python &amp; SciPy
          </div>
          <h1 className="hero-fade-item" style={{ animationDelay: '0.08s' }}>
            Catch <span className="hero-accent-word">the point</span> before it breaks the process.
          </h1>
          <p className="hero-fade-item" style={{ animationDelay: '0.16s' }}>
            The full DMAIC toolkit — 40+ statistical tools, from control charts to logistic
            regression — each one checked against independent statistical software. No installs,
            no Minitab license, no waiting on IT.
          </p>
          <div className="dash-hero-actions hero-fade-item" style={{ animationDelay: '0.24s' }}>
            <Link to="/worksheet" className="btn-primary">
              {hasData ? 'Open Worksheet →' : 'Load Your Data →'}
            </Link>
            <Link to="/pricing" className="btn-secondary">See Plans &amp; Pricing</Link>
          </div>
        </div>
        <div className="hero-chart-wrap hero-fade-item" style={{ animationDelay: '0.1s' }}>
          <LiveControlChart />
        </div>
      </section>

      <div className="dash-stats-grid hero-fade-item" style={{ animationDelay: '0.36s' }}>
        {STATS.map(s => (
          <div key={s.label} className="dash-stat">
            <div className="dash-stat-value">
              <CountUp target={s.target} suffix={s.suffix} />
            </div>
            <div className="dash-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWorksheet } from '../context/WorksheetContext';
import './Dashboard.css';

const PHASES = [
  {
    n: '01',
    phase: 'Define',
    color: 'var(--yellow)',
    headline: 'Say the problem out loud before you touch a single chart.',
    copy: "A project scoped honestly saves you from solving the wrong thing beautifully. Charter it, map it, and know exactly who it's for before the analysis begins.",
    tools: [
      { name: 'Project Charter', path: '/templates' },
      { name: 'SIPOC Diagram', path: '/templates' },
      { name: 'CTQ Tree', path: '/templates' },
      { name: 'Cost-Benefit Analysis', path: '/templates' },
    ]
  },
  {
    n: '02',
    phase: 'Measure',
    color: 'var(--green)',
    headline: 'You can\u2019t fix what you haven\u2019t measured honestly.',
    copy: 'Before you trust a number, prove the number can be trusted. Baseline the process, validate the gauge, then start watching for what actually moves.',
    tools: [
      { name: 'Control Chart', path: '/tool/control-chart' },
      { name: 'Capability Analysis', path: '/tool/capability' },
      { name: 'Descriptive Statistics', path: '/tool/descriptive' },
      { name: 'Gage R&R (MSA)', path: '/tool/msa' },
      { name: 'Histogram', path: '/tool/histogram' },
      { name: 'Run Chart', path: '/tool/run-chart' },
    ]
  },
  {
    n: '03',
    phase: 'Analyze',
    color: 'var(--orange)',
    headline: 'Data doesn\u2019t lie. It just waits for someone to ask it the right question.',
    copy: '17 hypothesis tests, full regression, and every root-cause tool you need for the moment you stop guessing and start proving it.',
    tools: [
      { name: 'Hypothesis Testing', path: '/hypothesis' },
      { name: 'Regression Analysis', path: '/tool/regression' },
      { name: 'Correlation Matrix', path: '/tool/correlation' },
      { name: 'Pareto Chart', path: '/tool/pareto' },
      { name: 'Fishbone Diagram', path: '/tool/fishbone' },
      { name: 'Box Plot', path: '/tool/boxplot' },
      { name: 'Scatter Plot', path: '/tool/scatter' },
      { name: 'Multi-Vari Chart', path: '/tool/multivari' },
    ]
  },
  {
    n: '04',
    phase: 'Improve',
    color: 'var(--purple)',
    headline: 'The moment insight turns into something that actually changes.',
    copy: 'Design the experiment, catch the failure modes before they happen, and build the fix on evidence instead of instinct.',
    tools: [
      { name: 'Design of Experiments', path: '/doe' },
      { name: 'FMEA', path: '/tool/fmea' },
      { name: 'Value Stream Map', path: '/tool/vsm' },
      { name: 'DOE Experiment Plan', path: '/templates' },
    ]
  },
  {
    n: '05',
    phase: 'Control',
    color: 'var(--cyan)',
    headline: 'A win that doesn\u2019t hold isn\u2019t a win. It\u2019s a delay.',
    copy: 'Keep watching after the applause stops. Document the decision, hand it off clean, and make the gain permanent.',
    tools: [
      { name: 'Control Chart', path: '/tool/control-chart' },
      { name: 'Meeting Minutes', path: '/templates' },
    ]
  },
];

const TICKER_ITEMS = [
  'Control Charts (I-MR / X-bar-R / CUSUM / EWMA)', 'Attribute Charts (p/np/c/u)', 'Capability Analysis',
  'Gage R&R (MSA)', 'Descriptive Statistics', 'Histogram', 'Run Chart', 'Hypothesis Testing — 17 Tests',
  'Pareto Analysis', 'Fishbone Diagrams', 'Multi-Vari Charts', 'Correlation Matrix',
  'Regression & Multiple Regression', 'Logistic Regression', 'One / Two-Way & RM ANOVA',
  'Effect Size Calculators', 'Design of Experiments', 'FMEA', 'Value Stream Mapping',
  'Sigma Level & DPMO', 'Sample Size & Power Calculators',
];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Scroll-reveal hook — content fades/rises into place the first time it
// enters the viewport, Apple-product-page style. Fires once, then stops
// observing (cheap, and avoids re-triggering on scroll-back).
function useReveal(threshold = 0.16) {
  const ref = useRef(null);
  const [inView, setInView] = useState(prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion() || !ref.current) { setInView(true); return; }
    const el = ref.current;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInView(true); obs.unobserve(el); }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView];
}

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
          <g key={i}>
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

function MegaHero({ hasData }) {
  const visualRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMouseMove = useCallback((e) => {
    if (prefersReducedMotion() || !visualRef.current) return;
    const rect = visualRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: px * 10, ry: -py * 10 });
  }, []);

  const resetTilt = useCallback(() => setTilt({ rx: 0, ry: 0 }), []);

  return (
    <section className="mega-hero">
      <div className="mega-hero-bg" aria-hidden="true" />
      <div className="mega-hero-inner">
        <div className="mega-hero-content">
          <div className="dash-hero-badge hero-fade-item" style={{ animationDelay: '0s' }}>
            Verified against R, Python &amp; SciPy
          </div>
          <h1 className="hero-fade-item" style={{ animationDelay: '0.08s' }}>
            Catch <span className="hero-accent-word">the point</span> before it breaks the process.
          </h1>
          <p className="hero-fade-item" style={{ animationDelay: '0.16s' }}>
            The full DMAIC toolkit — 50+ verified statistical tools and tests, from control
            charts to logistic regression — each one checked against independent statistical
            software. No installs, no Minitab license, no waiting on IT.
          </p>
          <div className="dash-hero-actions hero-fade-item" style={{ animationDelay: '0.24s' }}>
            <Link to="/worksheet" className="btn-primary">
              {hasData ? 'Open Worksheet →' : 'Load Your Data →'}
            </Link>
            <Link to="/pricing" className="btn-secondary">See Plans &amp; Pricing</Link>
          </div>

          <div className="hero-ticker hero-fade-item" style={{ animationDelay: '0.32s' }}>
            <div className="hero-ticker-eyebrow">50+ verified tools &amp; tests</div>
            <div className="hero-ticker-mask">
              <div className="hero-ticker-track">
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <span key={i} className="hero-ticker-pill">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="hero-visual hero-fade-item"
          style={{ animationDelay: '0.1s' }}
          ref={visualRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={resetTilt}
        >
          <div className="floating-chip chip-a">50+ Tools</div>
          <div className="floating-chip chip-b">100% Browser-Based</div>
          <div className="floating-chip chip-c">$9.99/mo</div>
          <div
            className="hero-chart-frame"
            style={{ transform: `perspective(900px) rotateX(${tilt.ry}deg) rotateY(${tilt.rx}deg)` }}
          >
            <LiveControlChart />
          </div>
        </div>
      </div>
    </section>
  );
}

function PhaseChapter({ data, index }) {
  const [ref, inView] = useReveal();
  return (
    <section
      ref={ref}
      className={`phase-chapter ${inView ? 'in-view' : ''} ${index % 2 === 1 ? 'phase-chapter-alt' : ''}`}
      style={{ '--phase-color': data.color }}
    >
      <div className="phase-chapter-numeral" aria-hidden="true">{data.n}</div>
      <div className="phase-chapter-inner">
        <div className="phase-chapter-eyebrow">
          <span className="phase-chapter-dot" />
          {data.phase}
        </div>
        <h2 className="phase-chapter-headline">{data.headline}</h2>
        <p className="phase-chapter-copy">{data.copy}</p>
        <div className="phase-chapter-tools">
          {data.tools.map(t => (
            <Link key={t.name} to={t.path} className="phase-chapter-pill">{t.name}</Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingChapter() {
  const [ref, inView] = useReveal();
  return (
    <section ref={ref} className={`closing-chapter ${inView ? 'in-view' : ''}`}>
      <h2>Minitab charges $154 a month to tell you the process is broken. We charge $9.99.</h2>
      <p>Everything runs in your browser. Your data never leaves your machine. No installs, no IT tickets, no waiting on a license key.</p>
      <div className="closing-chapter-actions">
        <Link to="/pricing" className="btn-primary">Start Free Trial</Link>
        <Link to="/worksheet" className="btn-secondary">Load Your Data</Link>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { hasData, fileName, rowCount, columns } = useWorksheet();

  return (
    <>
      <MegaHero hasData={hasData} />

      <div className="dashboard">
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
      </div>

      <div className="phase-chapters">
        {PHASES.map((p, i) => <PhaseChapter key={p.phase} data={p} index={i} />)}
      </div>

      <ClosingChapter />
    </>
  );
}

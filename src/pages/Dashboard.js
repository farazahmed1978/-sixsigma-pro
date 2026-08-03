import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWorksheet } from '../context/WorksheetContext';
import heroMain from '../hero-main.jpg';
import featureEngineers from '../feature-engineers.jpg';
import featureAnalyze from '../feature-analyze.jpg';
import featureExcellence from '../feature-excellence.jpg';
import './Dashboard.css';

const PHASES = [
  {
    n: '01', phase: 'Define', color: 'var(--yellow)',
    headline: 'A clear problem statement, before anything else.',
    copy: 'Charter the project, map the process, and know exactly who this is for.',
    tools: [
      { name: 'Project Charter', path: '/templates' },
      { name: 'SIPOC Diagram', path: '/templates' },
      { name: 'CTQ Tree', path: '/templates' },
      { name: 'Cost-Benefit Analysis', path: '/templates' },
    ]
  },
  {
    n: '02', phase: 'Measure', color: 'var(--green)',
    headline: 'Measurement you can actually trust.',
    copy: 'Validate the gauge, baseline the process, and start watching what really moves.',
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
    n: '03', phase: 'Analyze', color: 'var(--orange)',
    headline: 'Let the data answer. Not assumptions.',
    copy: '17 hypothesis tests, full regression, and the root-cause tools to know instead of guess.',
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
    n: '04', phase: 'Improve', color: 'var(--purple)',
    headline: 'Evidence, put into motion.',
    copy: 'Design the experiment, catch failure modes early, and build the fix on what the data actually shows.',
    tools: [
      { name: 'Design of Experiments', path: '/doe' },
      { name: 'FMEA', path: '/tool/fmea' },
      { name: 'Value Stream Map', path: '/tool/vsm' },
      { name: 'DOE Experiment Plan', path: '/templates' },
    ]
  },
  {
    n: '05', phase: 'Control', color: 'var(--cyan)',
    headline: 'Make the gain permanent.',
    copy: 'Keep watching after the project ends. Document it, hand it off, and hold the line.',
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
  'Sigma Level & DPMO', 'Sample Size & Power Calculators', 'Project Templates', 'Project Workbench',
];

const FEATURES = [
  {
    image: featureEngineers,
    headline: 'Designed for quality engineers, not statisticians.',
    copy: 'Powerful tools. Practical insights. Built for real-world quality challenges.',
  },
  {
    image: featureAnalyze,
    headline: 'Analyze with confidence. Improve with intelligence.',
    copy: 'An AI-guided platform built for Lean Six Sigma professionals.',
  },
  {
    image: featureExcellence,
    headline: 'Designed for excellence.',
    copy: 'From data to decisions — without unnecessary complexity.',
  },
];

const PULL_QUOTES = [
  'Templates and a project workbench mean the same report structure doesn\u2019t get rebuilt from scratch every time.',
  'Running a real hypothesis test shouldn\u2019t require decoding a statistics textbook first.',
  'One DMAIC report, synced automatically — instead of stitching four tools\u2019 screenshots together by hand.',
];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function useReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(prefersReducedMotion());
  useEffect(() => {
    if (prefersReducedMotion() || !ref.current) { setInView(true); return; }
    const el = ref.current;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.unobserve(el); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function Hero({ hasData }) {
  const [ref, inView] = useReveal(0.3);
  return (
    <section className="photo-hero" ref={ref}>
      <div className="photo-hero-bg" style={{ backgroundImage: `url(${heroMain})` }} />
      <div className="photo-hero-scrim" />
      <div className="photo-hero-inner">
        <div className={`slide-fade-text ${inView ? 'is-active' : ''}`}>
          <div className="dash-hero-badge">For quality engineers, not statisticians</div>
          <h1>A smarter way to run Six Sigma.</h1>
          <p>
            50+ verified tools, project templates, and a workbench that keeps every finding
            organized — built for the people running the project, not just reviewing it.
          </p>
        </div>
        <div className="photo-hero-actions">
          <Link to="/worksheet" className="btn-primary">
            {hasData ? 'Open Worksheet →' : 'Load Your Data →'}
          </Link>
          <Link to="/pricing" className="btn-secondary">See Plans &amp; Pricing</Link>
        </div>
        <div className="hero-ticker">
          <div className="hero-ticker-mask">
            <div className="hero-ticker-track">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="hero-ticker-pill">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBlock({ data }) {
  const [ref, inView] = useReveal(0.35);
  return (
    <section className="feature-block" ref={ref}>
      <div className="feature-block-bg" style={{ backgroundImage: `url(${data.image})` }} />
      <div className="feature-block-scrim" />
      <div className={`slide-fade-text feature-block-text ${inView ? 'is-active' : ''}`}>
        <h2>{data.headline}</h2>
        <p>{data.copy}</p>
      </div>
    </section>
  );
}

function PhaseChapter({ data, index }) {
  const [ref, inView] = useReveal(0.16);
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

function Testimonials() {
  const [ref, inView] = useReveal(0.16);
  return (
    <section ref={ref} className={`testimonials-section ${inView ? 'in-view' : ''}`}>
      <div className="testimonials-eyebrow">Why Teams Choose Us!</div>
      <div className="testimonials-grid">
        {PULL_QUOTES.map((q, i) => (
          <div key={i} className="pull-quote-card">
            <p>&ldquo;{q}&rdquo;</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Closing signature: line draws in with a chasing dot, sigma bands flash
// in sequence, then the logo fades in above the chart.
function SigmaRevealChart() {
  const points = [188, 172, 178, 150, 158, 131, 120, 108, 96, 84, 78, 70];
  const width = 600, height = 260, padding = 42;
  const xStep = (width - padding * 2) / (points.length - 1);
  const coords = points.map((y, i) => [padding + i * xStep, y]);
  const pathD = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const center = 131;
  const bands = [
    { label: '1\u03c3', up: center - 21, down: center + 21, delay: 2.4 },
    { label: '2\u03c3', up: center - 42, down: center + 42, delay: 2.85 },
    { label: '3\u03c3', up: center - 63, down: center + 63, delay: 3.3 },
  ];

  return (
    <div className="sigma-reveal">
      <div className="sigma-reveal-logo">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect width="30" height="30" rx="8" fill="var(--accent)" />
          <path d="M7 22L11 15L15 19L19 11L22 15" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7" cy="22" r="1.8" fill="white" />
          <circle cx="22" cy="15" r="1.8" fill="white" />
        </svg>
        <span>SixSigma<b>Pro</b></span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="sigma-reveal-svg" role="img" aria-label="Line chart improving over time with sigma bands">
        <line x1={padding} y1={center} x2={width - padding} y2={center} className="sigma-center-line" />
        {bands.map((b, i) => (
          <g key={i} className="sigma-band" style={{ animationDelay: `${b.delay}s` }}>
            <line x1={padding} y1={b.up} x2={width - padding} y2={b.up} className="sigma-band-line" />
            <line x1={padding} y1={b.down} x2={width - padding} y2={b.down} className="sigma-band-line" />
            <text x={width - padding + 8} y={b.up + 4} className="sigma-band-label">{b.label}</text>
          </g>
        ))}
        <path d={pathD} className="sigma-reveal-line" />
        <circle r="6" className="sigma-chase-dot">
          <animateMotion dur="2.2s" begin="0.1s" fill="freeze" path={pathD} />
        </circle>
      </svg>
    </div>
  );
}

function ClosingChapter() {
  const [ref, inView] = useReveal(0.2);
  return (
    <section ref={ref} className={`closing-chapter ${inView ? 'in-view' : ''}`}>
      <div className="closing-chapter-inner">
        <div className="closing-chapter-text">
          <h2>The same rigor. A fraction of the cost.</h2>
          <p>
            SixSigma Pro runs entirely in your browser — no installs, no IT approval, no
            per-seat license. Compared to $154+/month for Minitab, it&rsquo;s $9.99.
          </p>
          <div className="closing-value-list">
            <div><strong>100% Private</strong><span>Every calculation runs locally. Data never leaves your machine.</span></div>
            <div><strong>No Installation</strong><span>Works on any device with a browser. No IT ticket required.</span></div>
            <div><strong>$9.99/month</strong><span>Compared to $154+ for the incumbent tools most teams already pay for.</span></div>
          </div>
          <div className="closing-chapter-actions">
            <Link to="/pricing" className="btn-primary">Start Free Trial</Link>
            <Link to="/worksheet" className="btn-secondary">Load Your Data</Link>
          </div>
        </div>
        <div className={`sigma-reveal-wrap ${inView ? 'is-visible' : ''}`}>
          <SigmaRevealChart />
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { hasData, fileName, rowCount, columns } = useWorksheet();

  return (
    <>
      <Hero hasData={hasData} />

      <div className="sticky-ws-banner">
        {hasData ? (
          <div className="dash-ws-banner">
            <span className="dash-ws-icon">📊</span>
            <div>
              <strong>{fileName}</strong> is loaded — <span>{rowCount} rows, {columns.length} columns</span>
            </div>
            <Link to="/worksheet" className="btn-ghost">View &amp; Edit →</Link>
          </div>
        ) : (
          <div className="dash-ws-banner dash-ws-empty">
            <span className="dash-ws-icon">💡</span>
            <div><strong>Start by loading your data</strong> — enter it once in the Worksheet and every tool uses it automatically.</div>
            <Link to="/worksheet" className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}>Open Worksheet</Link>
          </div>
        )}
      </div>

      {FEATURES.map((f, i) => <FeatureBlock key={i} data={f} />)}

      <div className="phase-chapters">
        {PHASES.map((p, i) => <PhaseChapter key={p.phase} data={p} index={i} />)}
      </div>

      <Testimonials />
      <ClosingChapter />
    </>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWorksheet } from '../context/WorksheetContext';
import heroPhoto from '../hero-photo.jpg';
import analyzePhoto from '../analyze-photo.jpg';
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
    ],
    bgImage: analyzePhoto,
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

const STAGES = [
  { kind: 'intro' },
  {
    kind: 'panel', eyebrow: 'What\u2019s Inside',
    title: 'Fifty-plus tools. One workspace.',
    copy: 'Control charts, capability studies, regression, DOE — the instruments a quality team actually reaches for. Every finding saves straight into your project report, automatically.',
  },
  {
    kind: 'panel', eyebrow: 'Where We\u2019re Headed',
    title: 'An assistant is coming. The rigor is already here.',
    copy: 'We\u2019re building AI guidance directly into the workflow. For now, every method already follows the same discipline it measures — checked against independent statistical software before it reached you.',
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

function useReveal(threshold = 0.16) {
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

// Toggles both ways (fade in AND out) — used for the chart accent near pricing.
function useToggleReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [inView, setInView] = useState(prefersReducedMotion());
  useEffect(() => {
    if (prefersReducedMotion() || !ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
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
      aria-label="Control chart showing a process point breaching the upper control limit">
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
            <circle cx={x} cy={y} r="6" className="hero-chart-breach-ring" />
            <circle cx={x} cy={y} r="5" className="hero-chart-breach-dot" />
            <text x={x} y={y - 16} className="hero-chart-flag">OUT OF CONTROL</text>
          </g>
        ) : <circle key={i} cx={x} cy={y} r="4" className="hero-chart-point" />
      ))}
    </svg>
  );
}

function PinnedHero({ hasData }) {
  const containerRef = useRef(null);
  const [active, setActive] = useState(0);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const vh = window.innerHeight;
          const scrollable = el.offsetHeight - vh;
          const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0;
          setActive(Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length)));
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [reduced]);

  const introPanel = (isActive) => (
    <div className={`pinned-panel pinned-intro ${isActive ? 'is-active' : ''}`}>
      <div className="dash-hero-badge">For quality engineers, not statisticians</div>
      <h1>A quieter way to run Six Sigma.</h1>
      <p>
        50+ verified tools, project templates, and a workbench that keeps every finding
        organized — built for the people running the project, not just reviewing it.
      </p>
      <div className="dash-hero-actions">
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
  );

  if (reduced) {
    return (
      <section className="pinned-hero pinned-hero-static">
        <div className="pinned-photo" style={{ backgroundImage: `url(${heroPhoto})` }} />
        <div className="pinned-scrim" />
        <div className="pinned-static-stack">
          {introPanel(true)}
          {STAGES.filter(s => s.kind === 'panel').map((s, i) => (
            <div key={i} className="pinned-panel is-active">
              <div className="pinned-eyebrow">{s.eyebrow}</div>
              <h3>{s.title}</h3>
              <p>{s.copy}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="pinned-hero" ref={containerRef} style={{ height: `${STAGES.length * 100}vh` }}>
      <div className="pinned-sticky">
        <div className="pinned-photo" style={{ backgroundImage: `url(${heroPhoto})` }} />
        <div className="pinned-scrim" />
        {introPanel(active === 0)}
        {STAGES.map((s, i) => s.kind === 'panel' ? (
          <div key={i} className={`pinned-panel ${active === i ? 'is-active' : ''}`}>
            <div className="pinned-eyebrow">{s.eyebrow}</div>
            <h3>{s.title}</h3>
            <p>{s.copy}</p>
          </div>
        ) : null)}
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
      style={{
        '--phase-color': data.color,
        ...(data.bgImage ? { backgroundImage: `linear-gradient(120deg, var(--bg) 30%, rgba(6,13,27,0.75)), url(${data.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
      }}
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
  const [ref, inView] = useReveal();
  return (
    <section ref={ref} className={`testimonials-section ${inView ? 'in-view' : ''}`}>
      <div className="testimonials-eyebrow">Why Teams Choose This</div>
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

function ClosingChapter() {
  const [ref, inView] = useReveal();
  const [chartRef, chartVisible] = useToggleReveal();
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
        <div ref={chartRef} className={`closing-chart-accent ${chartVisible ? 'is-visible' : ''}`}>
          <LiveControlChart />
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { hasData, fileName, rowCount, columns } = useWorksheet();

  return (
    <>
      <PinnedHero hasData={hasData} />

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

      <div className="phase-chapters">
        {PHASES.map((p, i) => <PhaseChapter key={p.phase} data={p} index={i} />)}
      </div>

      <Testimonials />
      <ClosingChapter />
    </>
  );
}

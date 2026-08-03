import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWorksheet } from '../context/WorksheetContext';
import heroMain from '../hero-main.jpg';
import featureEngineers from '../feature-engineers.jpg';
import featureAnalyze from '../feature-analyze.jpg';
import featureExcellence from '../feature-excellence.jpg';
import logoMark from '../logo-mark.png';
import './Dashboard.css';

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
    dmaic: [
      { phase: 'Define', color: 'var(--yellow)', line: 'Align the objective.', examples: ['Project Charter', 'SIPOC', 'CTQ Tree'] },
      { phase: 'Measure', color: 'var(--green)', line: 'Measure what matters.', examples: ['Control Chart', 'Capability Analysis', 'Gage R&R'] },
    ],
  },
  {
    image: featureAnalyze,
    headline: 'Analyze with confidence. Improve with intelligence.',
    copy: 'An AI-guided platform built for Lean Six Sigma professionals.',
    dmaic: [
      { phase: 'Analyze', color: 'var(--orange)', line: 'Transform data into insight.', examples: ['Hypothesis Testing', 'Regression', 'Pareto Chart'] },
    ],
  },
  {
    image: featureExcellence,
    headline: 'Designed for excellence.',
    copy: 'From data to decisions — without unnecessary complexity.',
    dmaic: [
      { phase: 'Improve', color: 'var(--purple)', line: 'Design better processes.', examples: ['DOE', 'FMEA', 'Value Stream Map'] },
      { phase: 'Control', color: 'var(--cyan)', line: 'Sustain the results.', examples: ['Control Chart', 'Meeting Minutes'] },
    ],
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

function useReveal(threshold = 0.15) {
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

function useParallax(speed = 0.12) {
  const ref = useRef(null);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const scrollEl = document.querySelector('.main-content') || window;
    let raf = null;
    const update = () => {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const offset = (rect.top - vh / 2) * speed;
        el.style.transform = `translateY(${offset}px)`;
      }
      raf = null;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [speed]);
  return ref;
}

function Hero() {
  const [ref, inView] = useReveal(0.2);
  const bgRef = useParallax(0.08);
  return (
    <section className="photo-hero" ref={ref}>
      <div className="photo-hero-bg" ref={bgRef} style={{ backgroundImage: `url(${heroMain})` }} />
      <div className="photo-hero-scrim" />
      <div className="photo-hero-inner">
        <div className={`slide-fade-text slide-fade-slow ${inView ? 'is-active' : ''}`}>
          <div className="hero-logo-badge">
            <img src={logoMark} alt="" className="hero-logo-mark" />
            <span className="brand-wordmark brand-wordmark-light">SixSigma<b>Pro</b></span>
          </div>
          <h1>Let us streamline your Six Sigma journey.</h1>
          <p>
            50+ verified tools, project templates, and a workbench that keeps every finding
            organized — built for the people running the project, not just reviewing it.
          </p>
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
  const [ref, inView] = useReveal(0.25);
  const bgRef = useParallax(0.1);
  return (
    <section className="feature-block" ref={ref}>
      <div className="feature-block-bg" ref={bgRef} style={{ backgroundImage: `url(${data.image})` }} />
      <div className="feature-block-scrim" />
      <div className={`slide-fade-text slide-fade-slow feature-block-text ${inView ? 'is-active' : ''}`}>
        <h2>{data.headline}</h2>
        <p>{data.copy}</p>
        <div className="dmaic-tags">
          {data.dmaic.map((d, i) => (
            <div key={d.phase} className="dmaic-tag" style={{ '--tag-color': d.color, transitionDelay: `${0.3 + i * 0.25}s` }}>
              <div className="dmaic-tag-head">
                <span className="dmaic-tag-dot" />
                <span className="dmaic-tag-phase">{d.phase}</span>
                <span className="dmaic-tag-line">{d.line}</span>
              </div>
              <div className="dmaic-tag-examples">
                {d.examples.map((ex, j) => (
                  <span key={ex} className="dmaic-example-chip" style={{ transitionDelay: `${0.6 + i * 0.25 + j * 0.15}s` }}>{ex}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const [ref, inView] = useReveal(0.15);
  return (
    <section ref={ref} className={`testimonials-section ${inView ? 'in-view' : ''}`}>
      <div className="testimonials-eyebrow">Why Teams Choose Us!</div>
      <div className="testimonials-grid">
        {PULL_QUOTES.map((q, i) => (
          <div key={i} className="pull-quote-card"><p>&ldquo;{q}&rdquo;</p></div>
        ))}
      </div>
    </section>
  );
}

// Gaussian bell curve: dot climbs the left slope to the apex, then
// pulses continuously once there. Only starts once the chart itself
// (not just the section) is well into view.
function GaussianChart({ active }) {
  const width = 600, height = 260, padding = 40;
  const baseline = 215, peakY = 50, mu = width / 2, sigmaPx = 62;
  const amplitude = baseline - peakY;
  const N = 60;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = padding + (i / N) * (width - padding * 2);
    const y = baseline - amplitude * Math.exp(-((x - mu) ** 2) / (2 * sigmaPx ** 2));
    pts.push([x, y]);
  }
  const fullPath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const ascendingPts = pts.filter(([x]) => x <= mu);
  const climbPath = ascendingPts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const sigmaLabels = [-3, -2, -1, 0, 1, 2, 3].map(k => ({
    k, x: mu + k * sigmaPx, label: k === 0 ? '\u03bc' : `${k > 0 ? '+' : ''}${k}\u03c3`,
  }));

  return (
    <div className="sigma-reveal">
      <div className="sigma-reveal-logo">
        <img src={logoMark} alt="" className="sigma-logo-mark" />
        <span className="brand-wordmark">SixSigma<b>Pro</b></span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="sigma-reveal-svg" role="img" aria-label="Gaussian distribution curve with sigma markings">
        <defs>
          <linearGradient id="sigmaLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-light)" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={baseline} x2={width - padding} y2={baseline} className="sigma-center-line" />

        {active && sigmaLabels.map((s, i) => (
          <g key={s.k} className="sigma-pop" style={{ animationDelay: `${4.8 + i * 0.22}s` }}>
            <line x1={s.x} y1={baseline} x2={s.x} y2={baseline + 8} className="sigma-tick" />
            <text x={s.x} y={baseline + 22} className="sigma-band-label" textAnchor="middle">{s.label}</text>
          </g>
        ))}

        <path d={fullPath} className="sigma-reveal-line-glow" style={active ? { animationPlayState: 'running' } : {}} />
        <path d={fullPath} className="sigma-reveal-line" style={active ? { animationPlayState: 'running' } : {}} />

        {active && (
          <>
            <circle r="6" className="sigma-chase-dot">
              <animateMotion dur="3.6s" begin="0.1s" fill="freeze" path={climbPath} />
            </circle>
            <g className="sigma-apex-pulse" style={{ transform: `translate(${mu}px, ${peakY}px)`, animationDelay: '3.7s' }}>
              <circle r="10" className="sigma-apex-ring" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

function ClosingChapter() {
  const [ref, inView] = useReveal(0.15);
  const [chartRef, chartActive] = useReveal(0.6);
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
        <div className="sigma-reveal-wrap" ref={chartRef}>
          <GaussianChart active={chartActive} />
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { hasData, fileName, rowCount, columns } = useWorksheet();
  return (
    <div data-theme="light" className="dashboard-light-scope">
      <Hero />

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

      <Testimonials />
      <ClosingChapter />
    </div>
  );
}

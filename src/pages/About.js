import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';

const tools = [
  { name: 'Control Chart', path: '/tool/control-chart', phase: 'Control' },
  { name: 'Pareto Chart', path: '/tool/pareto', phase: 'Analyze' },
  { name: 'Histogram', path: '/tool/histogram', phase: 'Measure' },
  { name: 'Capability Analysis', path: '/tool/capability', phase: 'Measure' },
  { name: 'Scatter Plot', path: '/tool/scatter', phase: 'Analyze' },
  { name: 'Box Plot', path: '/tool/boxplot', phase: 'Analyze' },
  { name: 'Run Chart', path: '/tool/run-chart', phase: 'Measure' },
  { name: 'Fishbone Diagram', path: '/tool/fishbone', phase: 'Analyze' },
  { name: 'FMEA', path: '/tool/fmea', phase: 'Analyze' },
  { name: 'MSA / Gage R&R', path: '/tool/msa', phase: 'Measure' },
  { name: 'Value Stream Map', path: '/tool/vsm', phase: 'Analyze' },
];

const phaseColor = {
  Define: '#00d4ff',
  Measure: '#00e078',
  Analyze: '#ffa500',
  Improve: '#a761ff',
  Control: '#ff5a5a',
};

export default function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-badge">Built for Quality Professionals</div>
        <h1>About SixSigma Pro</h1>
        <p>
          A free, browser-based statistical analysis platform for Lean Six Sigma practitioners,
          quality engineers, and continuous improvement teams — no software license required.
        </p>
      </section>

      <div className="about-grid">
        <section className="about-card mission-card">
          <div className="card-icon">🎯</div>
          <h2>Our Mission</h2>
          <p>
            SixSigma Pro was created to democratize access to professional-grade quality
            analysis tools. Enterprise software like Minitab can cost thousands of dollars
            per seat — we believe every quality professional deserves powerful tools, for free.
          </p>
          <p>
            Upload your CSV data, analyze it with validated statistical methods, and make
            data-driven decisions — all without leaving your browser.
          </p>
        </section>

        <section className="about-card owner-card">
          <div className="card-icon">👤</div>
          <h2>Project Owner</h2>
          <div className="owner-info">
            <div className="owner-avatar">FA</div>
            <div>
              <div className="owner-name">Faraz Ahmed</div>
              <div className="owner-title">Lean Six Sigma Platform Developer</div>
            </div>
          </div>
          <p>
            Faraz Ahmed created SixSigma Pro to provide quality teams with a modern,
            accessible alternative to expensive statistical software. The platform is built
            with React and powered entirely by open-source libraries.
          </p>
        </section>
      </div>

      <section className="about-tools-section">
        <h2>Included Tools</h2>
        <p>SixSigma Pro includes {tools.length} fully functional analysis tools across the DMAIC framework.</p>
        <div className="about-tools-grid">
          {tools.map(tool => (
            <Link key={tool.path} to={tool.path} className="about-tool-chip">
              <span
                className="tool-phase-dot"
                style={{ background: phaseColor[tool.phase] || '#00d4ff' }}
              />
              {tool.name}
              <span className="tool-phase-label" style={{ color: phaseColor[tool.phase] || '#00d4ff' }}>
                {tool.phase}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="about-tech-section">
        <h2>Technology Stack</h2>
        <div className="tech-grid">
          {[
            { name: 'React 18', desc: 'Frontend framework', icon: '⚛️' },
            { name: 'Recharts', desc: 'Chart rendering', icon: '📊' },
            { name: 'PapaParse', desc: 'CSV parsing', icon: '📄' },
            { name: 'Math.js', desc: 'Statistical calculations', icon: '🧮' },
            { name: 'React Router', desc: 'Client-side routing', icon: '🔀' },
            { name: 'Vercel', desc: 'Hosting & deployment', icon: '🚀' },
          ].map(t => (
            <div key={t.name} className="tech-card">
              <div className="tech-icon">{t.icon}</div>
              <div className="tech-name">{t.name}</div>
              <div className="tech-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="about-disclaimer">
        <h2>Disclaimer</h2>
        <p>
          SixSigma Pro is provided as-is for educational and professional use. All statistical
          calculations are implemented using standard Six Sigma formulas. Users are responsible
          for validating results before making critical business decisions. This tool is not a
          substitute for certified statistical software in regulated industries — always follow
          your organization's validation requirements.
        </p>
        <div className="disclaimer-cta">
          <Link to="/" className="btn-primary">Go to Dashboard</Link>
          <Link to="/resources" className="btn-secondary">View Resources</Link>
        </div>
      </section>
    </div>
  );
}

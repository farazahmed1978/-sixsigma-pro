import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';


const tools = [
  { name: 'Control Chart', path: '/tool/control-chart', phase: 'Measure' },
  { name: 'Attribute Charts (p/np/c/u)', path: '/tool/attribute-chart', phase: 'Measure' },
  { name: 'Run Chart', path: '/tool/run-chart', phase: 'Measure' },
  { name: 'Capability Analysis', path: '/tool/capability', phase: 'Measure' },
  { name: 'Histogram', path: '/tool/histogram', phase: 'Measure' },
  { name: 'Gage R&R (MSA)', path: '/tool/msa', phase: 'Measure' },
  { name: 'Descriptive Statistics', path: '/tool/descriptive', phase: 'Measure' },
  { name: 'Sigma Level / DPMO', path: '/tool/sigma-calculator', phase: 'Measure' },
  { name: 'Sample Size Calculator', path: '/tool/sample-size-calculator', phase: 'Measure' },
  { name: 'Power Calculator', path: '/tool/power-calculator', phase: 'Measure' },
  { name: 'Hypothesis Testing (17 tests)', path: '/hypothesis', phase: 'Analyze' },
  { name: 'Pareto Chart', path: '/tool/pareto', phase: 'Analyze' },
  { name: 'Scatter Plot', path: '/tool/scatter', phase: 'Analyze' },
  { name: 'Box Plot', path: '/tool/boxplot', phase: 'Analyze' },
  { name: 'Fishbone Diagram', path: '/tool/fishbone', phase: 'Analyze' },
  { name: 'Multi-Vari Chart', path: '/tool/multivari', phase: 'Analyze' },
  { name: 'Correlation Matrix', path: '/tool/correlation', phase: 'Analyze' },
  { name: 'Regression', path: '/tool/regression', phase: 'Analyze' },
  { name: 'Multiple Regression', path: '/tool/multiregression', phase: 'Analyze' },
  { name: 'Logistic Regression', path: '/tool/logistic', phase: 'Analyze' },
  { name: 'ANOVA', path: '/tool/anova', phase: 'Analyze' },
  { name: 'Effect Size Calculators', path: '/tool/effect-size', phase: 'Analyze' },
  { name: 'Design of Experiments', path: '/doe', phase: 'Improve' },
  { name: 'FMEA', path: '/tool/fmea', phase: 'Improve' },
  { name: 'Value Stream Map', path: '/tool/vsm', phase: 'Improve' },
];

const phaseColor = {
  Define: 'var(--yellow)',
  Measure: 'var(--green)',
  Analyze: 'var(--orange)',
  Improve: 'var(--purple)',
  Control: 'var(--cyan)',
};

const FAQS = [
  {
    q: 'Do I need a background in statistics to use Axentra?',
    a: 'No. Axentra supports quality professionals, engineers, operations leaders, project teams, and students with guided workflows and plain-language explanations. You remain in control while the platform simplifies technical complexity.'
  },
  {
    q: 'What makes Axentra different from standalone statistical software?',
    a: 'Standalone tools focus on isolated analyses. Axentra connects operational excellence and project execution: projects, datasets, analyses, evidence, interactive documents, and reports remain part of one workspace. Future intelligence features are designed to build on that connected foundation.'
  },
  {
    q: 'Are the statistical calculations accurate?',
    a: 'Yes. Every statistical calculation is independently verified against established statistical software and published methodologies to ensure reliable, reproducible results. Our goal is to provide the same analytical confidence expected from professional statistical tools while delivering a significantly more modern workflow.'
  },
  {
    q: 'Does my data leave my computer?',
    a: 'No. Statistical calculations are performed locally within your browser whenever possible. Your project data is never sent for analysis unless you explicitly choose to use cloud-based features such as AI assistance, collaboration, or project synchronization.'
  },
  {
    q: 'How does the AI help my projects?',
    a: 'The AI is designed to assist — not replace — your professional judgment. It can help explain statistical output, suggest appropriate analyses, summarize findings, generate project documentation, draft executive reports, and guide users through each DMAIC phase. Final decisions always remain with your team.'
  },
  
  {
    q: 'Can I manage multiple Six Sigma projects?',
    a: 'Yes. Axentra is built as a complete project workspace. Organize multiple initiatives, store datasets, generate reports, maintain project history, and keep analyses and documentation connected.'
  },
  {
    q: 'Can I collaborate with my team?',
    a: 'Yes. Depending on your subscription plan, you can share projects, collaborate with teammates, and maintain a centralized record of analyses, reports, and project documentation.'
  },
  {
    q: 'Is my project information secure?',
    a: 'Protecting customer data is a priority. Projects are stored securely, and access is restricted to authorized users. We continuously follow industry best practices to safeguard your information.'
  },
  {
    q: 'Is Axentra suitable for regulated industries?',
    a: 'Axentra supports standard improvement methods used across regulated environments. Organizations operating under FDA, ISO, GMP, or similar requirements should validate software use according to their own quality and compliance procedures.'
  },
  {
    q: 'Can I export my work?',
    a: "Yes. Generate professional reports, charts, and supporting documentation that can be shared with stakeholders or incorporated into your organization's quality management system."
  },
  {
    q: 'Will more statistical tools be added?',
    a: 'Absolutely. Axentra is under continuous development. New workspaces, statistical methods, visualizations, and project management capabilities are shaped by customer feedback and industry practice.'
  },
  {
    q: 'Is Axentra suitable for students?',
    a: "Yes. Whether you're learning Lean Six Sigma, project management, completing coursework, or working on your first improvement project, Axentra provides structured workflows for professional-quality work."
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes — a 14-day free trial gives you enough time to complete a meaningful DMAIC project before deciding.'
  },
  {
    q: 'Can I cancel my subscription at any time?',
    a: "Yes. You can cancel your subscription at any time. Your plan will remain active until the end of your current billing period, and you won't be charged again unless you renew."
  },
  {
    q: 'Who is Axentra built for?',
    a: 'Six Sigma Green Belts, Black Belts, and Master Black Belts; Quality Engineers and Quality Managers; Manufacturing and Operations Leaders; Process Improvement and Continuous Improvement Teams; Supply Chain and Logistics Professionals; Healthcare Improvement Teams; Students and Certification Candidates; and organizations implementing Lean, Six Sigma, or Operational Excellence programs.'
  },
  {
    q: 'How does Axentra simplify the tool stack?',
    a: 'Our mission is to make professional-grade continuous improvement tools accessible to everyone. By delivering a cloud-based platform with integrated AI, project management, and validated statistical analysis, we eliminate the high licensing costs and complex deployments associated with traditional enterprise software — without compromising analytical rigor.'
  },
];

export default function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-badge">Built for Quality Professionals</div>
        <h1>About Axentra</h1>
        <p>
          A browser-based statistical analysis platform for Lean Six Sigma practitioners,
          quality engineers, and continuous improvement teams — no software license or
          installation required.
        </p>
      </section>

      <section className="about-card mission-card about-mission-full">
        <h2>Our Mission</h2>
        <p>
          At Axentra, our mission is to advance operational excellence through an
          integrated platform that unifies statistical analysis, AI-assisted guidance, project
          execution, and documentation. Rather than treating analytics as isolated tasks, we
          connect every phase of the DMAIC methodology into a single, structured workflow that
          preserves context, captures knowledge, and accelerates decision-making. The result is
          a more efficient, transparent, and scalable approach to solving business problems with
          confidence.
        </p>
      </section>

      <section className="about-tools-section">
        <h2>Included Tools</h2>
        <p>Axentra connects statistical tools with Lean Six Sigma, project management, datasets, evidence, documents, and reporting.</p>
        <div className="about-tools-grid">
          {tools.map(tool => (
            <Link key={tool.path} to={tool.path} className="about-tool-chip">
              <span
                className="tool-phase-dot"
                style={{ background: phaseColor[tool.phase] || 'var(--accent)' }}
              />
              {tool.name}
              <span className="tool-phase-label" style={{ color: phaseColor[tool.phase] || 'var(--accent)' }}>
                {tool.phase}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="about-faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list">
          {FAQS.map((item, i) => (
            <details key={i} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="about-disclaimer">
        <h2>Disclaimer</h2>
        <p>
          Axentra is provided as-is for professional and educational use. All statistical
          calculations follow standard Six Sigma formulas and are independently verified. Users
          are responsible for validating results before making critical business decisions. This
          tool is not a substitute for certified statistical software in regulated industries —
          always follow your organization's validation requirements.
        </p>
        <div className="disclaimer-cta">
          <Link to="/" className="btn-primary">Go to Dashboard</Link>
          <Link to="/resources" className="btn-secondary">View Resources</Link>
        </div>
      </section>
    </div>
  );
}

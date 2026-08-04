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
    q: 'Do I need a background in statistics to use SixSigma Pro?',
    a: 'No. SixSigma Pro is designed for quality professionals, engineers, operations leaders, and students — not statisticians. Every analysis includes guided workflows, plain-language explanations, and AI-assisted interpretation to help you understand both the results and their business impact. You remain in control of the analysis while the platform simplifies the technical complexity.'
  },
  {
    q: 'What makes SixSigma Pro different from Minitab, JMP, or other statistical software?',
    a: 'Traditional statistical software focuses on performing analyses. SixSigma Pro manages the entire improvement lifecycle. Beyond validated statistical tools, SixSigma Pro integrates DMAIC project management, AI-guided recommendations, automated report generation, project documentation, and long-term record keeping within a single workspace. Every chart, analysis, decision, and deliverable remains connected throughout the project, reducing manual work and improving collaboration.'
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
    a: 'Yes. SixSigma Pro is built as a complete project workspace. Organize multiple improvement initiatives, store datasets, generate reports, maintain project history, and keep all analyses and documentation connected in one secure location.'
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
    q: 'Is SixSigma Pro suitable for regulated industries?',
    a: 'Yes. SixSigma Pro supports standard Six Sigma methodology used across manufacturing, healthcare, logistics, aerospace, pharmaceuticals, and other regulated environments. Organizations operating under FDA, ISO, GMP, or similar regulations should validate software use according to their own internal quality and compliance procedures.'
  },
  {
    q: 'Can I export my work?',
    a: "Yes. Generate professional reports, charts, and supporting documentation that can be shared with stakeholders or incorporated into your organization's quality management system."
  },
  {
    q: 'Will more statistical tools be added?',
    a: 'Absolutely. SixSigma Pro is under continuous development. New statistical methods, visualization tools, AI capabilities, and project management features are added regularly based on customer feedback and industry best practices.'
  },
  {
    q: 'Is SixSigma Pro suitable for students?',
    a: "Yes. Whether you're learning Six Sigma, completing coursework, preparing for certification, or working on your first improvement project, SixSigma Pro provides guided workflows that help you understand the methodology while producing professional-quality results."
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
    q: 'Who is SixSigma Pro built for?',
    a: 'Six Sigma Green Belts, Black Belts, and Master Black Belts; Quality Engineers and Quality Managers; Manufacturing and Operations Leaders; Process Improvement and Continuous Improvement Teams; Supply Chain and Logistics Professionals; Healthcare Improvement Teams; Students and Certification Candidates; and organizations implementing Lean, Six Sigma, or Operational Excellence programs.'
  },
  {
    q: 'Why is SixSigma Pro so affordable?',
    a: 'Our mission is to make professional-grade continuous improvement tools accessible to everyone. By delivering a cloud-based platform with integrated AI, project management, and validated statistical analysis, we eliminate the high licensing costs and complex deployments associated with traditional enterprise software — without compromising analytical rigor.'
  },
];

export default function About() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-badge">Built for Quality Professionals</div>
        <h1>About SixSigma Pro</h1>
        <p>
          A browser-based statistical analysis platform for Lean Six Sigma practitioners,
          quality engineers, and continuous improvement teams — no software license or
          installation required.
        </p>
      </section>

      <section className="about-card mission-card about-mission-full">
        <h2>Our Mission</h2>
        <p>
          At SixSigma Pro, our mission is to redefine continuous improvement through an
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
        <p>SixSigma Pro includes 50+ verified statistical tools and tests across the full DMAIC framework.</p>
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
          SixSigma Pro is provided as-is for professional and educational use. All statistical
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

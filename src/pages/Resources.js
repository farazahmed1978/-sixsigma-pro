import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BOOK_EXCERPTS } from '../utils/bookExcerpts';
import './Resources.css';

const resources = [
  {
    phase: 'Define',
    color: 'var(--yellow)',
    icon: '🎯',
    tools: [
      {
        name: 'Project Charter',
        desc: 'Document the problem, goals, scope, timeline, and team for your Six Sigma project.',
        steps: ['Define the problem statement clearly', 'Set SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)', 'Establish project scope (what is in/out)', 'Identify team members and stakeholders', 'Set timeline and milestones'],
        tips: 'A good problem statement describes WHAT is wrong, WHERE it is happening, and the MAGNITUDE of the problem without attributing causes.',
        bookKey: 'charter',
      },
      {
        name: 'SIPOC Diagram',
        desc: 'High-level process map showing Suppliers, Inputs, Process, Outputs, and Customers.',
        steps: ['Start with the Process column (5-7 high-level steps)', 'Work outward to Outputs and Customers', 'Work backward to Inputs and Suppliers', 'Keep it high-level — one page maximum'],
        tips: 'SIPOC is read right-to-left during creation (start with customer needs), but presented left-to-right.',
        bookKey: 'sipoc',
      },
      {
        name: 'Voice of Customer (VoC)',
        desc: 'Capture what customers truly need and translate into measurable CTQs.',
        steps: ['Identify customer segments', 'Collect data via surveys, interviews, complaints', 'Use Kano model to classify needs', 'Convert VoC to Critical to Quality (CTQ) requirements'],
        tips: 'Listen for the "voice behind the voice" — customers often describe symptoms, not root needs.',
        bookKey: 'voc',
      },
    ],
  },
  {
    phase: 'Measure',
    color: 'var(--green)',
    icon: '📏',
    tools: [
      {
        name: 'Measurement System Analysis (MSA)',
        desc: 'Verify your measurement system is trustworthy before collecting process data.',
        steps: ['Select 10 parts spanning the process range', 'Have 2-3 operators measure each part 2-3 times (blind)', 'Calculate %GRR and number of distinct categories (NDC)', 'Accept if %GRR < 10%, investigate if 10-30%, reject if >30%'],
        tips: '%GRR < 10% = Excellent. NDC ≥ 5 means the gage can distinguish process variation.',
        link: '/tool/msa',
        bookKey: 'msa',
      },
      {
        name: 'Process Capability',
        desc: 'Quantify how well the current process meets specification limits.',
        steps: ['Verify process is in statistical control first (control chart)', 'Collect at least 30-100 data points', 'Define LSL and USL from specifications', 'Calculate Cp, Cpk, and sigma level', 'Benchmark against Cpk ≥ 1.33 target'],
        tips: 'Cp measures potential capability (process spread vs. spec width). Cpk measures actual capability (accounting for centering).',
        link: '/tool/capability',
        bookKey: 'capability',
      },
      {
        name: 'Data Collection Plan',
        desc: 'Structured approach to collecting the right data, at the right time, in the right way.',
        steps: ['Identify what to measure (Y variables and potential Xs)', 'Determine sample size (statistical power)', 'Define operational definitions', 'Design data collection forms', 'Pilot test the plan with small sample'],
        tips: 'Operational definitions are critical — everyone must measure the same thing the same way.',
        bookKey: 'data-collection',
      },
    ],
  },
  {
    phase: 'Analyze',
    color: 'var(--orange)',
    icon: '🔍',
    tools: [
      {
        name: 'Pareto Analysis',
        desc: 'Use the 80/20 rule to identify the vital few causes driving most of your problems.',
        steps: ['Collect defect frequency data by category', 'Sort categories from most to least frequent', 'Calculate cumulative percentage', 'Draw the bar chart with cumulative line', 'Focus improvement on categories below 80% cumulative'],
        tips: 'Always validate Pareto with data. The "vital few" may shift over time as you implement improvements.',
        link: '/tool/pareto',
        bookKey: 'pareto',
      },
      {
        name: 'Fishbone (Ishikawa) Diagram',
        desc: 'Structured brainstorming tool to identify all potential root causes using 6M framework.',
        steps: ['Write the problem (effect) on the right side', 'Draw the spine and 6M bones: Man, Machine, Method, Material, Measurement, Mother Nature', 'Brainstorm causes for each category', 'Ask "Why?" 5 times for each cause', 'Prioritize causes based on data'],
        tips: '5-Why drilling is essential — the first cause you identify is rarely the true root cause.',
        link: '/tool/fishbone',
        bookKey: 'fishbone',
      },
      {
        name: 'Hypothesis Testing',
        desc: 'Statistically validate whether differences between groups are significant or due to random chance.',
        steps: ['State null hypothesis (H₀) and alternative hypothesis (H₁)', 'Choose significance level α = 0.05', 'Select appropriate test (t-test, ANOVA, chi-square)', 'Calculate p-value', 'Reject H₀ if p < α'],
        tips: 'A p-value < 0.05 means there is less than 5% probability the result occurred by chance. It does NOT prove the alternative is true.',
        link: '/hypothesis',
        bookKey: 'hypothesis',
      },
      {
        name: 'Regression Analysis',
        desc: 'Quantify relationships between input variables (Xs) and output variables (Ys).',
        steps: ['Plot scatter diagram to visualize relationship', 'Calculate Pearson correlation coefficient r', 'Fit regression model', 'Assess R² (coefficient of determination)', 'Validate assumptions (residual normality, homoscedasticity)'],
        tips: 'R² tells you what % of Y variation is explained by X. Correlation ≠ causation — always validate with physical reasoning.',
        link: '/tool/scatter',
        bookKey: 'regression',
      },
      {
        name: 'ANOVA',
        desc: 'Compare means across three or more groups to see if at least one is genuinely different.',
        steps: ['State H₀: all group means are equal', 'Check normality per group (Anderson-Darling)', 'Check equal variances (Bartlett\u2019s or Levene\u2019s)', 'Run ANOVA — get F-statistic and p-value', 'If p ≤ α, run a post-hoc test (Tukey\u2019s HSD) to find which groups differ'],
        tips: 'ANOVA tells you at least one mean differs — it does not tell you which one. That requires a post-hoc test.',
        link: '/tool/anova',
        bookKey: 'anova',
      },
    ],
  },
  {
    phase: 'Improve',
    color: 'var(--purple)',
    icon: '⚡',
    tools: [
      {
        name: 'FMEA (Failure Mode & Effects Analysis)',
        desc: 'Proactively identify and prioritize potential failures before implementing solutions.',
        steps: ['List all process steps', 'For each step, brainstorm potential failure modes', 'Identify effects of each failure on the customer', 'Rate Severity (1-10), Occurrence (1-10), Detection (1-10)', 'Calculate RPN = S × O × D', 'Prioritize items with highest RPN or Severity ≥ 9'],
        tips: 'Always address failures with Severity = 9 or 10 regardless of RPN. The RPN alone can be misleading.',
        link: '/tool/fmea',
        bookKey: 'fmea',
      },
      {
        name: 'Design of Experiments (DOE)',
        desc: 'Efficiently test multiple factors simultaneously to find optimal process settings.',
        steps: ['Identify factors (Xs) and their levels', 'Choose design: Full factorial, Fractional factorial, or Taguchi', 'Run experiments in random order', 'Analyze main effects and interactions', 'Confirm optimal settings with validation runs'],
        tips: 'DOE is far more efficient than one-factor-at-a-time (OFAT) testing. A 2³ full factorial tests 3 factors in just 8 runs.',
        link: '/doe',
        bookKey: 'doe',
      },
      {
        name: 'Value Stream Mapping',
        desc: 'Map the flow of material and information to identify and eliminate waste.',
        steps: ['Map the current state door-to-door', 'Calculate process efficiency (VA time / Total lead time)', 'Identify the 8 wastes (TIM WOODS)', 'Design the future state map', 'Create implementation plan'],
        tips: 'Walk the process yourself. Actual process often differs significantly from documented process.',
        link: '/tool/vsm',
        bookKey: 'vsm',
      },
    ],
  },
  {
    phase: 'Control',
    color: 'var(--cyan)',
    icon: '🎛️',
    tools: [
      {
        name: 'Control Charts (SPC)',
        desc: 'Monitor the improved process over time using statistical control limits.',
        steps: ['Determine chart type (X-bar/R, Individuals, p-chart, c-chart)', 'Calculate control limits from initial data (25-30 subgroups minimum)', 'Apply Western Electric rules to detect signals', 'Respond to out-of-control signals with documented reaction plan', 'Update limits when process fundamentally changes'],
        tips: 'Control limits (UCL/LCL) are NOT specification limits. They represent ±3σ of process variation. Never adjust them to specification limits.',
        link: '/tool/control-chart',
        bookKey: 'control-chart',
      },{
        name: 'Control Plan',
        desc: 'Document how to maintain improvements and respond to process signals.',
        steps: ['List all critical process parameters (CTQs)', 'Define control method for each (SPC, visual check, etc.)', 'Set reaction plan for out-of-control conditions', 'Assign ownership and frequency', 'Update process documentation and SOPs'],
        tips: 'A control plan is a living document. Review and update it whenever the process changes.',
        bookKey: 'control-plan',
      },
      {
        name: 'Statistical Process Control Rules',
        desc: 'Western Electric (Nelson) rules for detecting non-random patterns in control charts.',
        steps: [
          'Rule 1: 1 point beyond ±3σ (UCL/LCL)',
          'Rule 2: 9 consecutive points on same side of centerline',
          'Rule 3: 6 consecutive points trending up or down',
          'Rule 4: 14 points alternating up and down',
          'Rule 5: 2 of 3 consecutive points beyond ±2σ',
        ],
        tips: 'Using all rules simultaneously increases false alarm rate. Choose rules appropriate for your detection needs.',
        link: '/tool/control-chart',
        bookKey: 'spc-rules',
      },
    ],
  },
];

const sigmaTable = [
  { sigma: '1σ', dpmo: '691,462', yield: '30.85%', cpk: '0.33' },
  { sigma: '2σ', dpmo: '308,537', yield: '69.15%', cpk: '0.67' },
  { sigma: '3σ', dpmo: '66,807', yield: '93.32%', cpk: '1.00' },
  { sigma: '4σ', dpmo: '6,210', yield: '99.38%', cpk: '1.33' },
  { sigma: '5σ', dpmo: '233', yield: '99.977%', cpk: '1.67' },
  { sigma: '6σ', dpmo: '3.4', yield: '99.9997%', cpk: '2.00' },
];

function BookExcerptBlock({ bookKey }) {
  const [expanded, setExpanded] = useState(false);
  const excerpt = BOOK_EXCERPTS[bookKey];
  if (!excerpt) return null;

  return (
    <div className="resource-book" style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-light)' }}
      >
        📖 From the Book — {excerpt.chapter} {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <div style={{ marginTop: 8, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          {excerpt.text.split('\n\n').map((para, i, arr) => (
            <p key={i} style={{ marginBottom: i < arr.length - 1 ? '0.7rem' : 0 }}>{para}</p>
          ))}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
            Excerpted from The Black Belt Standard by Faraz Ahmed.
          </div>
        </div>
      )}
    </div>
  );
}

export default function Resources() {
  const [activePhase, setActivePhase] = useState('Analyze');

  return (
    <div className="resources-page animate-in">
      <div className="resources-header">
        <div className="section-label">Knowledge Base</div>
        <h1>Six Sigma Resources & Guides</h1>
        <p>Comprehensive reference material for DMAIC methodology. Click any tool card to open the interactive tool.</p>
      </div>

      {/* DMAIC Phase tabs */}
      <div className="phase-tabs">
        {resources.map(r => (
          <button
            key={r.phase}
            className={`phase-tab ${activePhase === r.phase ? 'active' : ''}`}
            style={{ '--phase-color': r.color }}
            onClick={() => setActivePhase(r.phase)}
          >
            {r.icon} {r.phase}
          </button>
        ))}
      </div>

      {/* Phase content */}
      {resources.filter(r => r.phase === activePhase).map(section => (
        <div key={section.phase} className="phase-section">
          <div className="tools-resource-grid">
            {section.tools.map(tool => (
              <div key={tool.name} className="resource-card">
                <div className="resource-card-header" style={{ borderLeftColor: section.color }}>
                  <div className="resource-card-title">{tool.name}</div>
                  <div className="resource-card-desc">{tool.desc}</div>
                </div>
                <div className="resource-steps">
                  <div className="resource-steps-title">How to use:</div>
                  <ol className="steps-list">
                    {tool.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
                {tool.tips && (
                  <div className="resource-tip">
                    <span>💡</span>
                    <span>{tool.tips}</span>
                  </div>
                )}
                {tool.bookKey && <BookExcerptBlock bookKey={tool.bookKey} />}
                {tool.link && (
                  <Link to={tool.link} className="btn btn-outline" style={{ marginTop: 12, display: 'inline-flex' }}>
                    Open Tool →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Sigma Reference Table */}
      <div className="sigma-section">
        <div className="section-label">Reference</div>
        <h2>Sigma Level Benchmarks</h2>
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table className="data-table" style={{ maxWidth: 600 }}>
            <thead>
              <tr><th>Sigma Level</th><th>DPMO</th><th>Yield</th><th>Cpk</th><th>World Class?</th></tr>
            </thead>
            <tbody>
              {sigmaTable.map(row => (
                <tr key={row.sigma} style={row.sigma === '6σ' ? { background: 'rgba(0,229,160,0.06)' } : {}}>
                  <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: row.sigma === '6σ' ? 'var(--green)' : 'inherit' }}>{row.sigma}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.dpmo}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.yield}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{row.cpk}</td>
                  <td>{row.sigma === '6σ' ? '⭐ Six Sigma' : row.sigma === '5σ' ? '✅ Excellent' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

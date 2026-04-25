import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ToolPage.css';

const toolMeta = {
  'control-chart': {
    name: 'Control Chart (X-bar & R)', icon: '📈', category: 'Control', phase: 'Control',
    phaseColor: 'var(--cyan)',
    desc: 'Monitor process stability over time using statistical control limits. Detect special cause variation from common cause variation.',
    formulas: ['UCL = X̄ + 3σ', 'LCL = X̄ − 3σ', 'CL = X̄ (Process Mean)'],
    whenToUse: 'Use when you need to determine if a process is in statistical control over time. Best for ongoing monitoring after process improvements.',
    interpretation: 'Points outside control limits, runs of 8+ points on one side, or trends indicate special cause variation requiring investigation.',
    csvFormat: 'One column of numeric measurements (e.g., "value"). Optional: "subgroup" column for X-bar charts.',
  },
  'run-chart': {
    name: 'Run Chart', icon: '📉', category: 'Control', phase: 'Control',
    phaseColor: 'var(--cyan)',
    desc: 'Simple time-ordered plot to visualize trends, shifts, and patterns. Precursor to control charts.',
    formulas: ['Median line', 'Runs above/below median', 'Trend test: 6+ consecutive increasing/decreasing'],
    whenToUse: 'Use early in a project to understand baseline performance and detect obvious trends before formal control charting.',
    interpretation: 'Look for astronomical points, trends (6+ consecutive moving same direction), or shifts (8+ points on same side of median).',
    csvFormat: 'Columns: "value" (numeric), optional "label" (text for x-axis).',
  },
  'capability': {
    name: 'Process Capability Analysis', icon: '🎯', category: 'Measure', phase: 'Measure',
    phaseColor: 'var(--green)',
    desc: 'Quantify how well a process meets specification limits. Calculate Cp, Cpk, Pp, Ppk, and sigma level.',
    formulas: ['Cp = (USL−LSL) / 6σ', 'Cpk = min[(USL−μ)/3σ, (μ−LSL)/3σ]', 'Sigma Level = Cpk × 3'],
    whenToUse: 'Use after verifying a process is in statistical control. Compare current process to customer specification limits.',
    interpretation: 'Cpk ≥ 1.33 is generally acceptable. Cpk ≥ 1.67 is excellent. Cpk < 1.0 means the process is incapable.',
    csvFormat: 'Column: "value" (numeric measurements). You will enter LSL and USL in the tool.',
  },
  'histogram': {
    name: 'Histogram', icon: '📊', category: 'Analyze', phase: 'Analyze',
    phaseColor: 'var(--orange)',
    desc: 'Visualize the distribution of continuous data. Assess normality, skewness, and identify patterns.',
    formulas: ['Mean = Σx / n', 'Std Dev σ = √(Σ(x−μ)² / n)', 'Skewness & Kurtosis'],
    whenToUse: 'Use to understand the shape and spread of data. Often the first step in data analysis.',
    interpretation: 'Normal bell curve = stable process. Bimodal = two different process streams. Skewed = systematic bias.',
    csvFormat: 'Column: "value" (numeric data to analyze).',
  },
  'pareto': {
    name: 'Pareto Chart', icon: '🏆', category: 'Analyze', phase: 'Analyze',
    phaseColor: 'var(--orange)',
    desc: 'Identify the vital few causes that account for 80% of the problems. Prioritize improvement efforts.',
    formulas: ['Cumulative % = (Cumulative Count / Total) × 100', '80/20 Rule (Pareto Principle)'],
    whenToUse: 'Use when you have categorical defect or problem data and need to prioritize which issues to tackle first.',
    interpretation: 'Focus on the categories left of the 80% cumulative line — these are your "vital few" high-impact issues.',
    csvFormat: 'Columns: "category" (text), "count" (numeric frequency/occurrence).',
  },
  'scatter': {
    name: 'Scatter Plot', icon: '🔵', category: 'Analyze', phase: 'Analyze',
    phaseColor: 'var(--orange)',
    desc: 'Explore the relationship and correlation between two continuous variables.',
    formulas: ['Pearson r = Σ[(x−x̄)(y−ȳ)] / (n−1)sxsy', 'R² = r² (coefficient of determination)'],
    whenToUse: 'Use to test hypotheses about potential X→Y relationships. Part of the Analyze phase to verify root causes.',
    interpretation: 'r near ±1 = strong correlation. r near 0 = no linear relationship. Note: correlation ≠ causation.',
    csvFormat: 'Columns: "x" and "y" (both numeric continuous data).',
  },
  'boxplot': {
    name: 'Box Plot', icon: '📦', category: 'Analyze', phase: 'Analyze',
    phaseColor: 'var(--orange)',
    desc: 'Compare distributions across multiple groups. Identify medians, spreads, and outliers.',
    formulas: ['IQR = Q3 − Q1', 'Outlier fence = Q3 + 1.5×IQR', 'Median = 50th percentile'],
    whenToUse: 'Use to compare process output across different machines, operators, shifts, or time periods.',
    interpretation: 'Boxes that don\'t overlap suggest significant differences between groups. Points beyond whiskers are outliers.',
    csvFormat: 'Columns: "group" (text category), "value" (numeric measurement).',
  },
  'fishbone': {
    name: 'Fishbone (Ishikawa) Diagram', icon: '🐟', category: 'Analyze', phase: 'Analyze',
    phaseColor: 'var(--orange)',
    desc: 'Structured cause-and-effect analysis using the 6M framework to identify root causes.',
    formulas: ['6M: Man, Machine, Method, Material, Measurement, Mother Nature'],
    whenToUse: 'Use in brainstorming sessions during the Analyze phase to systematically explore all possible causes of a problem.',
    interpretation: 'Each branch represents a major cause category. Sub-branches are specific causes. Prioritize with data.',
    csvFormat: 'Interactive tool — enter causes directly. No CSV required.',
  },
  'fmea': {
    name: 'Failure Mode & Effects Analysis', icon: '⚠️', category: 'Improve', phase: 'Improve',
    phaseColor: 'var(--purple)',
    desc: 'Proactively identify failure modes, assess their impact, and prioritize risk mitigation by RPN.',
    formulas: ['RPN = Severity × Occurrence × Detection', 'High Priority: RPN > 100 or Severity ≥ 9'],
    whenToUse: 'Use during Improve phase when designing solutions. Also used for process and design risk assessment.',
    interpretation: 'Focus on highest RPN items first. Always prioritize any failure with Severity = 9 or 10 regardless of RPN.',
    csvFormat: 'Interactive table — enter FMEA data directly. CSV import/export supported.',
  },
  'msa': {
    name: 'Measurement System Analysis', icon: '📏', category: 'Measure', phase: 'Measure',
    phaseColor: 'var(--green)',
    desc: 'Evaluate measurement system bias, linearity, stability, and overall variation contribution.',
    formulas: ['%GRR = (GRR StdDev / Total StdDev) × 100', 'ndc = 1.41 × (PV/GRR)'],
    whenToUse: 'Use before collecting process data to ensure measurements are trustworthy. Critical in the Measure phase.',
    interpretation: '%GRR < 10% = excellent. 10–30% = marginal (may be acceptable). >30% = unacceptable.',
    csvFormat: 'Columns: "part", "operator", "measurement" (repeated measurements by multiple operators).',
  },
  'gage-rr': {
    name: 'Gage R&R Study', icon: '🔬', category: 'Measure', phase: 'Measure',
    phaseColor: 'var(--green)',
    desc: 'Full crossed Gage R&R study separating repeatability and reproducibility using ANOVA method.',
    formulas: ['Repeatability (EV) = Equipment Variation', 'Reproducibility (AV) = Appraiser Variation', '%GRR = √(EV² + AV²) / TV'],
    whenToUse: 'Use when evaluating a measurement system with multiple operators measuring multiple parts. Standard MSA study.',
    interpretation: 'Number of distinct categories ≥ 5 is acceptable. %GRR < 30% to proceed with data collection.',
    csvFormat: 'Columns: "part" (1-10), "operator" (A/B/C), "trial" (1-3), "measurement" (numeric).',
  },
  'vsm': {
    name: 'Value Stream Map', icon: '🗺️', category: 'Improve', phase: 'Improve',
    phaseColor: 'var(--purple)',
    desc: 'Map every step in a process flow from customer demand to delivery. Identify waste and flow time.',
    formulas: ['Process Efficiency = VA Time / Total Lead Time × 100', 'Takt Time = Available Time / Customer Demand'],
    whenToUse: 'Use to identify waste (muda) in a process. Maps current state then designs future state.',
    interpretation: 'Low process efficiency (<25%) indicates significant waste. Target VA steps and eliminate NVA steps.',
    csvFormat: 'Interactive tool — build your VSM by adding process steps. Enter cycle times and inventory.',
  },
};

export default function ToolPage({ tool, children }) {
  const [showInfo, setShowInfo] = useState(false);
  const meta = toolMeta[tool] || {};

  return (
    <div className="tool-page animate-in">
      {/* Tool Header */}
      <div className="tool-header">
        <div className="tool-header-left">
          <Link to="/" className="breadcrumb">← Dashboard</Link>
          <div className="tool-header-title">
            <span className="tool-header-icon">{meta.icon}</span>
            <div>
              <h1>{meta.name}</h1>
              <div className="tool-header-meta">
                <span className="badge badge-cyan" style={{ '--c': meta.phaseColor, background: `${meta.phaseColor}22`, borderColor: `${meta.phaseColor}44`, color: meta.phaseColor }}>
                  {meta.phase} Phase
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{meta.desc}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="tool-header-actions">
          <button
            className={`btn ${showInfo ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowInfo(!showInfo)}
          >
            {showInfo ? '📊 Hide Guide' : '📖 Show Guide'}
          </button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="info-panel animate-in">
          <div className="info-grid">
            <div className="info-block">
              <div className="info-block-title">📋 When to Use</div>
              <p>{meta.whenToUse}</p>
            </div>
            <div className="info-block">
              <div className="info-block-title">🔍 Interpretation</div>
              <p>{meta.interpretation}</p>
            </div>
            <div className="info-block">
              <div className="info-block-title">📁 CSV Format</div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{meta.csvFormat}</p>
            </div>
            <div className="info-block">
              <div className="info-block-title">🧮 Key Formulas</div>
              <div className="formula-list">
                {(meta.formulas || []).map(f => (
                  <div key={f} className="formula">{f}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tool Component */}
      <div className="tool-content">
        {children}
      </div>
    </div>
  );
}

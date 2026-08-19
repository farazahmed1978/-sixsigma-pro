import React from 'react';
import {Link} from 'react-router-dom';
import {computeProjectHealth} from '../foundation/projectHealth';
import HelpButton from './HelpButton';
import {
  HealthBar,
  MilestoneStatusChart,
  CostBurnChart,
  RiskSeverityChart,
  ActionsIssuesDonuts,
  ApprovalsChart,
  BenefitsRealizationBars,
  DocumentCompletionByStageBar,
} from './ProjectHealthCharts';
import './ProjectHealthDashboard.css';

const STATUS_LABEL = {Green: 'On track', Yellow: 'Needs attention', Red: 'At risk'};

function CardLink({link, onOpenTab}) {
  if (link.to.startsWith('tab:')) return <button type="button" className="ph-health-link" onClick={() => onOpenTab?.(link.to.slice(4))}>{link.label} →</button>;
  return <Link className="ph-health-link" to={link.to}>{link.label} →</Link>;
}

// Renders the one chart each card is specified to carry, reading only card.chart / card.metrics —
// never project.documents or any other data source. Which sub-component runs is chosen by
// card.id, which is stable data from computeProjectHealth(), not a UI concern.
function CardChart({card}) {
  const emptyLink = card.links[0];
  switch (card.id) {
    case 'schedule':
      return <MilestoneStatusChart chart={card.chart} hasMilestoneData={card.hasMilestoneData} emptyLink={card.links.find(link => link.label === 'Schedule Baseline') || emptyLink} />;
    case 'cost':
      return <CostBurnChart chart={card.chart} emptyLink={emptyLink} />;
    case 'risk':
      return <RiskSeverityChart counts={card.metrics.counts} emptyLink={emptyLink} />;
    case 'actionsIssues':
      return <ActionsIssuesDonuts actions={card.chart.actions} issues={card.chart.issues} emptyLink={emptyLink} />;
    case 'approvalsDecisions':
      return <ApprovalsChart chart={card.chart} emptyLink={card.links.find(link => link.label === 'Approvals') || emptyLink} />;
    default:
      return null;
  }
}

function HealthCard({card, onOpenTab}) {
  if (!card.hasData) {
    return <article className="ph-health-card no-data">
      <header><h3>{card.title}</h3><span className="ph-health-status status-none">No data yet</span></header>
      <p className="ph-health-summary">Open {card.links[0].label} to start tracking this.</p>
      <footer>{card.links.map(link => <CardLink key={link.label} link={link} onOpenTab={onOpenTab} />)}</footer>
    </article>;
  }
  return <article className={`ph-health-card status-${card.status.toLowerCase()}`}>
    <header><h3>{card.title}</h3><span className={`ph-health-status status-${card.status.toLowerCase()}`}><i /> {STATUS_LABEL[card.status]}</span></header>
    <p className="ph-health-summary">{card.summary}</p>
    <div className="ph-health-chart"><CardChart card={card} /></div>
    <footer>{card.links.map(link => <CardLink key={link.label} link={link} onOpenTab={onOpenTab} />)}</footer>
  </article>;
}

// Suite-aware Project Hub dashboard for PM projects — reads computeProjectHealth(project)
// (src/foundation/projectHealth.js), a pure function of project.documents, and renders it as a
// health bar, five traffic-light health cards (each with a small inline recharts chart), and a
// compact secondary-indicators row. This component owns no health logic and performs no data
// reads of its own; it only renders what the pure function returns, so the AI layer computing the
// same daily-brief data is guaranteed to see the same numbers a user sees here.
export default function ProjectHealthDashboard({project, suiteId, onOpenTab}) {
  const health = computeProjectHealth(project);
  if (!health) return null;
  const {overall, cards, secondary} = health;
  return <section className="ph-health-dashboard" aria-label="Project health">
    <header className="ph-health-header">
      <div className="ph-health-header-text">
        <span>PROJECT HEALTH</span>
        <h2>Overall project health</h2>
        <HealthBar percent={overall.score} label={overall.label} />
        <p>Weighted average of the five health cards below.</p>
      </div>
      <HelpButton surfaceId="project-health-dashboard" suiteId={suiteId} />
    </header>
    <div className="ph-health-grid">
      {Object.values(cards).map(card => <HealthCard key={card.id} card={card} onOpenTab={onOpenTab} />)}
    </div>
    <div className="ph-health-secondary">
      <div>
        <span>Benefits Realization</span>
        <strong>{secondary.benefitsRealization.label}</strong>
        <BenefitsRealizationBars benefits={secondary.benefitsRealization.chart} />
      </div>
      <div>
        <span>Document Completion</span>
        <strong>{secondary.documentCompletion.label}</strong>
        <DocumentCompletionByStageBar stages={secondary.documentCompletion.chart} />
      </div>
      <div><span>Change Activity</span><strong>{secondary.changeActivity.label}</strong></div>
      <div><span>Quality Audit</span><strong>{secondary.qualityAudit.label}</strong></div>
    </div>
  </section>;
}

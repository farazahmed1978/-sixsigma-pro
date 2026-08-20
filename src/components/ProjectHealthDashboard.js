import React from 'react';
import {computeProjectHealth} from '../foundation/projectHealth';
import HelpButton from './HelpButton';
import {
  HealthBar,
  HealthLink,
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

// Renders the one chart each card is specified to carry, reading only card.chart / card.metrics —
// never project.documents or any other data source. Which sub-component runs is chosen by
// card.id, which is stable data from computeProjectHealth(), not a UI concern. onOpenTab is
// threaded through so a chart's own empty state can offer a working tab-switch link (e.g.
// Approvals) via the same HealthLink every other link on the dashboard uses.
function CardChart({card, onOpenTab}) {
  const emptyLink = card.links[0];
  switch (card.id) {
    case 'schedule':
      return <MilestoneStatusChart chart={card.chart} hasMilestoneData={card.hasMilestoneData} emptyLink={card.links.find(link => link.label === 'Schedule Baseline') || emptyLink} onOpenTab={onOpenTab} />;
    case 'cost':
      return <CostBurnChart chart={card.chart} costStatus={card.status} emptyLink={emptyLink} onOpenTab={onOpenTab} />;
    case 'risk':
      return <RiskSeverityChart counts={card.metrics.counts} emptyLink={emptyLink} onOpenTab={onOpenTab} />;
    case 'actionsIssues':
      return <ActionsIssuesDonuts actions={card.chart.actions} issues={card.chart.issues} emptyLink={emptyLink} onOpenTab={onOpenTab} />;
    case 'approvalsDecisions':
      return <ApprovalsChart chart={card.chart} emptyLink={card.links.find(link => link.label === 'Approvals') || emptyLink} onOpenTab={onOpenTab} />;
    default:
      return null;
  }
}

function HealthCard({card, onOpenTab}) {
  if (!card.hasData) {
    return <article className="ph-health-card no-data">
      <header><h3>{card.title}</h3><span className="ph-health-status status-none">No data yet</span></header>
      <p className="ph-health-summary">Open {card.links[0].label} to start tracking this.</p>
      <footer>{card.links.map(link => <HealthLink key={link.label} link={link} onOpenTab={onOpenTab} />)}</footer>
    </article>;
  }
  // Schedule's zero-state (a Milestone Report exists but has no rows) is fully explained by
  // card.summary above and linked from the footer below, both of which already render for every
  // card — showing the chart's own empty state on top of that repeated the same sentence and the
  // same Schedule Baseline link a second time (QA Fix 1). Every other card's populated/empty chart
  // states stay chart-specific enough (different wording, or an actual chart once there is data)
  // that they don't hit this same duplication, so the skip is scoped to this one case rather than
  // applied blanket-wide.
  const skipChart = card.id === 'schedule' && !card.hasMilestoneData;
  return <article className={`ph-health-card status-${card.status.toLowerCase()}`}>
    <header><h3>{card.title}</h3><span className={`ph-health-status status-${card.status.toLowerCase()}`}><i /> {STATUS_LABEL[card.status]}</span></header>
    <p className="ph-health-summary">{card.summary}</p>
    {!skipChart && <div className="ph-health-chart"><CardChart card={card} onOpenTab={onOpenTab} /></div>}
    <footer>{card.links.map(link => <HealthLink key={link.label} link={link} onOpenTab={onOpenTab} />)}</footer>
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
      {health.guidedProgress && (
        <div><span>Guided Setup</span><strong>{health.guidedProgress.isComplete ? 'Complete' : `${health.guidedProgress.completed}/${health.guidedProgress.total} mandatory docs`}</strong></div>
      )}
    </div>
  </section>;
}

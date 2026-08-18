import React from 'react';
import {Link} from 'react-router-dom';
import {computeProjectHealth} from '../foundation/projectHealth';
import HelpButton from './HelpButton';
import './ProjectHealthDashboard.css';

const STATUS_LABEL = {Green: 'On track', Yellow: 'Needs attention', Red: 'At risk'};

function Sparkline({values}) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${100 - ((value - min) / range) * 100}`).join(' ');
  return <svg className="ph-health-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" /></svg>;
}

function CardLink({link, onOpenTab}) {
  if (link.to.startsWith('tab:')) return <button type="button" className="ph-health-link" onClick={() => onOpenTab?.(link.to.slice(4))}>{link.label} →</button>;
  return <Link className="ph-health-link" to={link.to}>{link.label} →</Link>;
}

function HealthCard({card, onOpenTab}) {
  if (!card.hasData) {
    return <article className={`ph-health-card no-data`}>
      <header><h3>{card.title}</h3><span className="ph-health-status status-none">No data yet</span></header>
      <p className="ph-health-summary">Open {card.links[0].label} to start tracking this.</p>
      <footer>{card.links.map(link => <CardLink key={link.label} link={link} onOpenTab={onOpenTab} />)}</footer>
    </article>;
  }
  return <article className={`ph-health-card status-${card.status.toLowerCase()}`}>
    <header><h3>{card.title}</h3><span className={`ph-health-status status-${card.status.toLowerCase()}`}><i /> {STATUS_LABEL[card.status]}</span></header>
    <p className="ph-health-summary">{card.summary}</p>
    {card.trend && <Sparkline values={card.trend} />}
    <footer>{card.links.map(link => <CardLink key={link.label} link={link} onOpenTab={onOpenTab} />)}</footer>
  </article>;
}

// Suite-aware Project Hub dashboard for PM projects — reads computeProjectHealth(project)
// (src/foundation/projectHealth.js), a pure function of project.documents, and renders it as five
// traffic-light health cards plus a compact secondary-indicators row and an overall score ring.
// This component owns no health logic itself; it only renders what the pure function returns, so
// the AI layer computing the same daily-brief data is guaranteed to see the same numbers a user
// sees here.
export default function ProjectHealthDashboard({project, onOpenTab}) {
  const health = computeProjectHealth(project);
  if (!health) return null;
  const {overall, cards, secondary} = health;
  return <section className="ph-health-dashboard" aria-label="Project health">
    <header className="ph-health-header">
      <div className={`ph-health-ring ${overall.score === null ? 'status-none' : `status-${overall.label.toLowerCase()}`}`} style={{'--ph-health-ring-percent': `${overall.score ?? 0}%`}}>
        <strong>{overall.score === null ? '—' : `${overall.score}%`}</strong>
        <span>{overall.label}</span>
      </div>
      <div>
        <span>PROJECT HEALTH</span>
        <h2>Overall project health</h2>
        <p>Weighted average of the five health cards below.</p>
      </div>
      <HelpButton surfaceId="project-health-dashboard" suiteId="project-management" />
    </header>
    <div className="ph-health-grid">
      {Object.values(cards).map(card => <HealthCard key={card.id} card={card} onOpenTab={onOpenTab} />)}
    </div>
    <div className="ph-health-secondary">
      <div><span>Benefits Realization</span><strong>{secondary.benefitsRealization.label}</strong></div>
      <div><span>Document Completion</span><strong>{secondary.documentCompletion.label}</strong></div>
      <div><span>Change Activity</span><strong>{secondary.changeActivity.label}</strong></div>
      <div><span>Quality Audit</span><strong>{secondary.qualityAudit.label}</strong></div>
    </div>
  </section>;
}

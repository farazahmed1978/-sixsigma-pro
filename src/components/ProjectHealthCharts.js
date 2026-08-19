import React from 'react';
import {Link} from 'react-router-dom';
import {BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine} from 'recharts';
import './ProjectHealthCharts.css';

// Every component in this file renders strictly from the props it is given — none of them read
// project.documents, call computeProjectHealth(), or touch any other data source. The caller
// (ProjectHealthDashboard.js) is the only place that reads foundation/projectHealth.js's output;
// these components exist purely to draw it, which is what keeps them individually testable with
// plain prop fixtures and keeps the data an AI reads identical to what a user sees rendered.
export const COLOR = {green: '#10b981', yellow: '#f59e0b', red: '#ef4444', orange: '#f97316', gray: '#94a3b8', accent: '#6366f1'};

// ── Overall health bar (Change 1) ───────────────────────────────────────────────────────────────
// Green 80-100, Yellow 60-79, Red 0-59 — exported so the color decision is independently testable
// without rendering, and so foundation/projectHealth.js's own overall-label thresholds (which use
// the same bands) can be cross-checked against it.
export const healthBarColor = percent => {
  if (percent === null || percent === undefined) return 'none';
  if (percent >= 80) return 'green';
  if (percent >= 60) return 'yellow';
  return 'red';
};

export function HealthBar({percent, label}) {
  const color = healthBarColor(percent);
  const clamped = percent === null || percent === undefined ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div className={`ph-health-bar-wrap status-${color}`}>
      <div className="ph-health-bar-headline">
        <strong>{percent === null || percent === undefined ? 'No data yet' : `${percent}%`}</strong>
        {percent !== null && percent !== undefined && <span className={`ph-health-bar-status-label status-${color}`}>{String(label || '').toUpperCase()}</span>}
      </div>
      <div className="ph-health-bar-track" role="img" aria-label={percent === null || percent === undefined ? 'No health data yet' : `Project health ${percent} percent, ${label}`}>
        <div className="ph-health-bar-fill" style={{width: `${clamped}%`}} />
        <span className="ph-health-bar-tick" style={{left: '60%'}} aria-hidden="true" />
        <span className="ph-health-bar-tick" style={{left: '80%'}} aria-hidden="true" />
      </div>
    </div>
  );
}

// ── Shared link renderer ────────────────────────────────────────────────────────────────────────
// The single place a card/chart link is turned into markup — a real route becomes a react-router
// <Link>, a 'tab:' sentinel (pointing at a Project Hub tab rather than a document, e.g. Approvals)
// becomes a button that calls onOpenTab. Both render "Label →" identically. This used to be
// duplicated between ProjectHealthDashboard.js's footer links and EmptyChartState below, and the
// two copies had drifted — EmptyChartState's tab-link branch rendered inert, arrow-less text
// instead of a working button (QA Fix 3). One shared component means there is only one place left
// for that kind of drift to happen.
export function HealthLink({link, onOpenTab}) {
  if (link.to.startsWith('tab:')) return <button type="button" className="ph-health-link" onClick={() => onOpenTab?.(link.to.slice(4))}>{link.label} →</button>;
  return <Link className="ph-health-link" to={link.to}>{link.label} →</Link>;
}

// ── Shared empty state ──────────────────────────────────────────────────────────────────────────
export function EmptyChartState({message, link, onOpenTab}) {
  return (
    <div className="ph-chart-empty">
      <p>{message}</p>
      {link && <HealthLink link={link} onOpenTab={onOpenTab} />}
    </div>
  );
}

// ── Schedule Health: milestone status stacked bar ───────────────────────────────────────────────
export function MilestoneStatusChart({chart, hasMilestoneData, emptyLink, onOpenTab}) {
  if (!hasMilestoneData) return <EmptyChartState message="No milestone data yet — add milestones in Schedule Baseline." link={emptyLink} onOpenTab={onOpenTab} />;
  const data = [{name: 'Milestones', onTrack: chart.onTrack, atRisk: chart.atRisk, delayed: chart.delayed, notStarted: chart.notStarted}];
  return (
    <ResponsiveContainer width="100%" height={64}>
      <BarChart data={data} layout="vertical" margin={{top: 4, right: 8, left: 8, bottom: 4}}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip />
        <Bar dataKey="onTrack" stackId="milestones" fill={COLOR.green} name="On Track" />
        <Bar dataKey="atRisk" stackId="milestones" fill={COLOR.yellow} name="At Risk" />
        <Bar dataKey="delayed" stackId="milestones" fill={COLOR.red} name="Delayed" />
        <Bar dataKey="notStarted" stackId="milestones" fill={COLOR.gray} name="Not Started" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Cost Health: budget burn bar + CPI gauge ────────────────────────────────────────────────────
// Both bars are colored by a status string ('Green'/'Yellow'/'Red') rather than by re-deriving
// thresholds here: the CPI gauge reuses costStatus, which is the exact status foundation/
// projectHealth.js's costHealth() already computed for the card header; the budget-burn bar reuses
// chart.budgetBurnStatus, which that same function computes from BUDGET_BURN_THRESHOLDS. Neither
// bar hardcodes a threshold number — this component only maps an already-decided status to a color.
// Exported so the status->color mapping is independently testable (and independently readable by
// an AI layer) without rendering an SVG chart and inspecting its fill attributes.
export const STATUS_FILL = {Green: COLOR.green, Yellow: COLOR.yellow, Red: COLOR.red};
export function CostBurnChart({chart, emptyLink, costStatus, onOpenTab}) {
  const {budgetBurnedPercent, cpi, budgetBurnStatus} = chart || {};
  if (cpi === null || cpi === undefined) return <EmptyChartState message="No EVM data yet — open EVM Dashboard to enter values." link={emptyLink} onOpenTab={onOpenTab} />;
  const burnDomainMax = Math.max(120, (budgetBurnedPercent || 0) + 10);
  return (
    <div className="ph-cost-chart">
      <div className="ph-cost-chart-row">
        <span className="ph-cost-chart-label">Budget burned</span>
        {budgetBurnedPercent === null ? <span className="ph-chart-empty-inline">Not available</span> : (
          <ResponsiveContainer width="100%" height={28}>
            <BarChart data={[{name: 'Budget', value: budgetBurnedPercent}]} layout="vertical" margin={{top: 2, right: 8, left: 8, bottom: 2}}>
              <XAxis type="number" domain={[0, burnDomainMax]} hide />
              <YAxis type="category" dataKey="name" hide />
              <ReferenceLine x={100} stroke={COLOR.gray} strokeDasharray="3 3" />
              <Bar dataKey="value" fill={STATUS_FILL[budgetBurnStatus] || COLOR.gray} radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="ph-cost-chart-row">
        <span className="ph-cost-chart-label">CPI</span>
        <ResponsiveContainer width="100%" height={28}>
          <BarChart data={[{name: 'CPI', value: cpi}]} layout="vertical" margin={{top: 2, right: 8, left: 8, bottom: 2}}>
            <XAxis type="number" domain={[0, 1.5]} hide />
            <YAxis type="category" dataKey="name" hide />
            <ReferenceLine x={1} stroke={COLOR.gray} strokeDasharray="3 3" />
            <Bar dataKey="value" fill={STATUS_FILL[costStatus] || COLOR.gray} radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Risk Exposure: severity bar chart ───────────────────────────────────────────────────────────
export function RiskSeverityChart({counts, emptyLink, onOpenTab}) {
  const total = Object.values(counts || {}).reduce((sum, value) => sum + (value || 0), 0);
  if (!total) return <EmptyChartState message="No open risks recorded." link={emptyLink} onOpenTab={onOpenTab} />;
  const data = [
    {name: 'Critical', value: counts.Critical || 0, color: COLOR.red},
    {name: 'High', value: counts.High || 0, color: COLOR.orange},
    {name: 'Medium', value: counts.Medium || 0, color: COLOR.yellow},
    {name: 'Low', value: counts.Low || 0, color: COLOR.green},
  ];
  return (
    <ResponsiveContainer width="100%" height={96}>
      <BarChart data={data} layout="vertical" margin={{top: 4, right: 16, left: 4, bottom: 4}}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis type="category" dataKey="name" width={54} tick={{fontSize: 10}} />
        <Tooltip />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Actions and Issues: two side-by-side donuts ─────────────────────────────────────────────────
export function ActionsIssuesDonuts({actions, issues, emptyLink, onOpenTab}) {
  const actionsTotal = Object.values(actions || {}).reduce((sum, value) => sum + (value || 0), 0);
  const issuesTotal = Object.values(issues || {}).reduce((sum, value) => sum + (value || 0), 0);
  if (!actionsTotal && !issuesTotal) return <EmptyChartState message="No actions or issues recorded." link={emptyLink} onOpenTab={onOpenTab} />;
  const actionsData = [
    {name: 'Complete', value: actions?.complete || 0, color: COLOR.green},
    {name: 'In Progress', value: actions?.inProgress || 0, color: COLOR.accent},
    {name: 'Blocked', value: actions?.blocked || 0, color: COLOR.red},
    {name: 'Not Started', value: actions?.notStarted || 0, color: COLOR.gray},
  ].filter(entry => entry.value > 0);
  const issuesData = [
    {name: 'Open', value: issues?.open || 0, color: COLOR.accent},
    {name: 'In Progress', value: issues?.inProgress || 0, color: COLOR.yellow},
    {name: 'Escalated', value: issues?.escalated || 0, color: COLOR.red},
    {name: 'Resolved', value: issues?.resolved || 0, color: COLOR.green},
  ].filter(entry => entry.value > 0);
  return (
    <div className="ph-donut-row">
      <div className="ph-donut">
        <span>Actions</span>
        {actionsTotal ? (
          <ResponsiveContainer width="100%" height={92}>
            <PieChart>
              <Pie data={actionsData} dataKey="value" nameKey="name" innerRadius={22} outerRadius={36}>
                {actionsData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : <p className="ph-chart-empty-inline">No actions recorded</p>}
      </div>
      <div className="ph-donut">
        <span>Issues</span>
        {issuesTotal ? (
          <ResponsiveContainer width="100%" height={92}>
            <PieChart>
              <Pie data={issuesData} dataKey="value" nameKey="name" innerRadius={22} outerRadius={36}>
                {issuesData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : <p className="ph-chart-empty-inline">No issues recorded</p>}
      </div>
    </div>
  );
}

// ── Approvals and Decisions: pending/approved/rejected bar + decisions-needed note ────────────────
export function ApprovalsChart({chart, emptyLink, onOpenTab}) {
  const {pending = 0, approved = 0, rejected = 0, decisionsNeededCount = 0, pendingOver7DaysCount = 0} = chart || {};
  const total = pending + approved + rejected;
  if (!total && !decisionsNeededCount) return <EmptyChartState message="No approvals or decisions recorded." link={emptyLink} onOpenTab={onOpenTab} />;
  const data = [
    {name: 'Pending', value: pending, color: COLOR.yellow},
    {name: 'Approved', value: approved, color: COLOR.green},
    {name: 'Rejected', value: rejected, color: COLOR.red},
  ];
  return (
    <div className="ph-approvals-chart">
      {total ? (
        <ResponsiveContainer width="100%" height={56}>
          <BarChart data={data} layout="vertical" margin={{top: 2, right: 8, left: 4, bottom: 2}}>
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis type="category" dataKey="name" width={54} tick={{fontSize: 10}} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <p className="ph-chart-empty-inline">No approvals recorded</p>}
      <p className="ph-chart-note">
        {decisionsNeededCount} decision{decisionsNeededCount === 1 ? '' : 's'} needed
        {pendingOver7DaysCount > 0 ? ` · ${pendingOver7DaysCount} pending approval${pendingOver7DaysCount === 1 ? '' : 's'} over 7 days old` : ''}.
      </p>
    </div>
  );
}

// ── Secondary: Benefits Realization — baseline/target/current per benefit ─────────────────────────
// Plain CSS bars, not recharts: the task asks specifically for "simple progress bars" here, distinct
// from the recharts-based charts on the five primary cards above.
export function BenefitsRealizationBars({benefits}) {
  if (!benefits || !benefits.length) return <p className="ph-chart-empty-inline">No data yet</p>;
  return (
    <div className="ph-benefit-bars">
      {benefits.map(benefit => {
        const max = Math.max(benefit.baseline || 0, benefit.target || 0, benefit.current || 0, 1);
        return (
          <div key={benefit.name} className="ph-benefit-bar">
            <span className="ph-benefit-bar-label">{benefit.name}</span>
            <div className="ph-benefit-bar-track">
              {benefit.current !== null && <div className="ph-benefit-fill" style={{width: `${(benefit.current / max) * 100}%`}} />}
              {benefit.baseline !== null && <span className="ph-benefit-mark baseline" style={{left: `${(benefit.baseline / max) * 100}%`}} title={`Baseline: ${benefit.baseline}`} />}
              {benefit.target !== null && <span className="ph-benefit-mark target" style={{left: `${(benefit.target / max) * 100}%`}} title={`Target: ${benefit.target}`} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Secondary: Document Completion by PM stage — segmented step bar ───────────────────────────────
// Pills render stage.shortLabel (a fixed, always-fits abbreviation computed alongside the full
// label in foundation/projectHealth.js's PM_STAGES — not truncated here with CSS ellipsis, which
// was cutting "Monitoring and Controlling" down to unreadable fragments like "MONITO"). The full
// label is still available in the title tooltip.
export function DocumentCompletionByStageBar({stages}) {
  if (!stages || !stages.some(stage => stage.documentCount > 0)) return <p className="ph-chart-empty-inline">No data yet</p>;
  return (
    <div className="ph-stage-bar">
      {stages.map(stage => (
        <div
          key={stage.stage}
          className={`ph-stage-segment status-${stage.status}`}
          title={`${stage.stage}: ${stage.status === 'not-started' ? 'Not started' : stage.status === 'complete' ? 'Complete' : 'In progress'}${stage.documentCount ? ` (${stage.completionPercent}% avg, ${stage.documentCount} document${stage.documentCount === 1 ? '' : 's'})` : ''}`}
        >
          <span>{stage.shortLabel || stage.stage}</span>
        </div>
      ))}
    </div>
  );
}

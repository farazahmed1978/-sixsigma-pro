import {documentIdFor} from '../utils/documentModel';
import {projectDocumentRoute} from '../utils/defineSequence';

// Phase 3, Part 3 (+ dashboard follow-up) — a pure, side-effect-free read of a project's existing
// document records into a structured health snapshot. No new data storage: every number here is
// derived from project.documents (the same records DocumentWorkspace already saves), plus
// project.approvals when the caller has it available (see the note on approvalsAndDecisionsHealth
// below). This is the single function both the dashboard UI and the AI daily-brief reasoning layer
// call — it takes nothing but the project object and returns nothing but data, so either caller
// gets the same answer without depending on React, routing, or any UI state.
//
// Every card also carries a `chart` object — the exact, pre-shaped data its dashboard chart
// renders from. Components must never derive chart data by re-reading project.documents or by
// parsing another part of the returned object; they read card.chart (or, where a metrics field is
// already exactly the chart's shape, that same metrics field) directly. This keeps the chart layer
// a pure "render what you were given" step, and keeps every number an AI caller sees identical to
// what a user sees.
const docRecord = (project, templateId) => project?.documents?.[documentIdFor(templateId)] || null;
const docValues = (project, templateId) => docRecord(project, templateId)?.values || null;
const docExists = (project, templateId) => Boolean(docRecord(project, templateId));
const toNumber = value => { if (value === undefined || value === null || value === '') return null; const stripped = String(value).replace(/[^0-9.-]/g, ''); if (!stripped || stripped === '-' || stripped === '.') return null; const n = Number(stripped); return Number.isFinite(n) ? n : null; };
const round = (n, decimals = 0) => { const f = 10 ** decimals; return Math.round(n * f) / f; };
const STATUS_SCORE = {Green: 100, Yellow: 60, Red: 0};

// Schedule Health — schedule-baseline + milestone-report, with SPI surfaced from EVM Dashboard
// when it has been entered. Status: Green (all on track), Yellow (1-2 milestones At Risk),
// Red (any milestone Delayed, or SPI < 0.9).
//
// hasData reflects whether either source document has ever been opened (the generic "No data yet"
// card state). hasMilestoneData is narrower and drives the chart/summary zero-state specifically:
// a Milestone Report can exist with zero rows (nobody has entered a milestone yet), and in that
// case showing "0 on track, 0 at risk, 0 delayed" reads as real (if boring) data when it is
// actually the absence of any — the zero-state message replaces it instead.
const scheduleHealth = project => {
  const milestoneReport = docValues(project, 'milestone-report');
  const scheduleBaseline = docValues(project, 'schedule-baseline');
  const evm = docValues(project, 'evm-dashboard');
  const hasData = docExists(project, 'milestone-report') || docExists(project, 'schedule-baseline');
  const rows = milestoneReport?.milestoneStatusRows || [];
  const hasMilestoneData = rows.length > 0;
  const onTrackCount = rows.filter(row => ['On Track', 'Complete'].includes(row.status)).length;
  const atRiskCount = rows.filter(row => row.status === 'At Risk').length;
  const delayedCount = rows.filter(row => row.status === 'Delayed').length;
  const notStartedCount = rows.filter(row => row.status === 'Not Started').length;
  const spi = toNumber(evm?.SPI);

  const dated = list => list.map(item => ({...item, sortDate: item.date && !Number.isNaN(new Date(item.date).getTime()) ? new Date(item.date) : null})).filter(item => item.sortDate).sort((a, b) => a.sortDate - b.sortDate);
  const fromMilestoneReport = dated(rows.filter(row => row.status !== 'Complete').map(row => ({name: row.milestoneDescription, date: row.actualForecastDate || row.plannedDate})))[0];
  const fromBaseline = dated((scheduleBaseline?.scheduleRows || []).filter(row => row.status !== 'Complete').map(row => ({name: row.milestone, date: row.finish || row.start})))[0];
  const next = fromMilestoneReport || fromBaseline || null;

  let status = 'Green';
  if (delayedCount > 0 || (spi !== null && spi < 0.9)) status = 'Red';
  else if (atRiskCount > 0) status = 'Yellow';

  return {
    id: 'schedule', title: 'Schedule Health', hasData, hasMilestoneData, status,
    metrics: {
      spi, onTrackCount, atRiskCount, delayedCount, notStartedCount,
      nextMilestone: next ? {name: next.name || 'Unnamed milestone', date: next.date} : null,
    },
    summary: !hasData
      ? 'No schedule data yet.'
      : !hasMilestoneData
        ? 'No milestone data yet — add milestones in Schedule Baseline.'
        : `${onTrackCount} on track, ${atRiskCount} at risk, ${delayedCount} delayed${spi !== null ? `; SPI ${spi}` : ''}.`,
    chart: {onTrack: onTrackCount, atRisk: atRiskCount, delayed: delayedCount, notStarted: notStartedCount},
    links: [
      {label: 'Milestone Report', to: projectDocumentRoute(project.id, 'milestone-report')},
      {label: 'Schedule Baseline', to: projectDocumentRoute(project.id, 'schedule-baseline')},
    ],
  };
};

// Cost Health — evm-dashboard + cost-baseline. Status: Green (CPI >= 1.0), Yellow (0.9 <= CPI < 1.0),
// Red (CPI < 0.9 OR no CPI has been entered yet — cost performance with no EVM data is treated as a
// real gap, not a neutral unknown, which is why this differs from the generic hasData/"No data yet"
// placeholder: hasData reflects whether the EVM Dashboard or Cost Baseline has ever been opened,
// while status (and the chart's own empty state, gated on cpi === null rather than hasData) can
// still be Red/empty on a project whose EVM Dashboard exists but has no CPI entered yet.
const costHealth = project => {
  const evm = docValues(project, 'evm-dashboard');
  const costBaseline = docValues(project, 'cost-baseline');
  const hasData = docExists(project, 'evm-dashboard') || docExists(project, 'cost-baseline');
  const cpi = toNumber(evm?.CPI);
  const ac = toNumber(evm?.ac);
  const bac = toNumber(evm?.bac);
  const eac = toNumber(evm?.EAC);
  const budgetBurnedPercent = (ac !== null && bac) ? round((ac / bac) * 100, 1) : null;
  const eacVsBacVariance = (eac !== null && bac !== null) ? round(eac - bac, 2) : null;

  let status;
  if (cpi === null) status = 'Red';
  else if (cpi >= 1) status = 'Green';
  else if (cpi >= 0.9) status = 'Yellow';
  else status = 'Red';

  return {
    id: 'cost', title: 'Cost Health', hasData, status,
    metrics: {cpi, budgetBurnedPercent, eac, bac, eacVsBacVariance, phaseCount: (costBaseline?.costByPhaseRows || []).length},
    summary: cpi !== null ? `CPI ${cpi}${budgetBurnedPercent !== null ? `, ${budgetBurnedPercent}% of budget burned` : ''}${eacVsBacVariance !== null ? `, EAC vs BAC ${eacVsBacVariance >= 0 ? '+' : ''}${eacVsBacVariance}` : ''}.` : 'No EVM data entered yet.',
    chart: {budgetBurnedPercent, cpi},
    links: [{label: 'EVM Dashboard', to: projectDocumentRoute(project.id, 'evm-dashboard')}],
  };
};

// Risk Exposure — risk-register. Severity bands on the calculated exposure (probability x impact,
// typically scored 1-5 each, so exposure runs roughly 1-25): Critical >= 15, High >= 10, Medium >= 5,
// Low < 5. These thresholds aren't specified by any fixed standard — they're this project's own
// scoring convention (matching the Risk Register's own guidance text) and are named constants below
// so they can be tuned in one place. Status: Green (no High/Critical), Yellow (1-2 High),
// Red (any Critical, or 3+ High).
const RISK_SEVERITY_THRESHOLDS = {Critical: 15, High: 10, Medium: 5};
const severityForExposure = exposure => {
  if (exposure === null) return null;
  if (exposure >= RISK_SEVERITY_THRESHOLDS.Critical) return 'Critical';
  if (exposure >= RISK_SEVERITY_THRESHOLDS.High) return 'High';
  if (exposure >= RISK_SEVERITY_THRESHOLDS.Medium) return 'Medium';
  return 'Low';
};
const riskExposure = project => {
  const riskRegister = docValues(project, 'risk-register');
  const hasData = docExists(project, 'risk-register');
  const openRows = (riskRegister?.riskRows || []).filter(row => row.status !== 'Closed');
  const scored = openRows.map(row => ({...row, exposureNumber: toNumber(row.exposure)})).map(row => ({...row, severity: severityForExposure(row.exposureNumber)}));
  const counts = {Critical: 0, High: 0, Medium: 0, Low: 0};
  scored.forEach(row => { if (row.severity) counts[row.severity] += 1; });
  const ranked = scored.filter(row => row.exposureNumber !== null).sort((a, b) => b.exposureNumber - a.exposureNumber);
  const top = ranked[0] || null;

  let status = 'Green';
  if (counts.Critical > 0 || counts.High >= 3) status = 'Red';
  else if (counts.High >= 1) status = 'Yellow';

  return {
    id: 'risk', title: 'Risk Exposure', hasData, status,
    metrics: {
      openRiskCount: openRows.length, counts,
      topRisk: top ? {risk: top.risk || top.riskId, exposure: top.exposureNumber, owner: top.owner || ''} : null,
    },
    summary: openRows.length ? `${openRows.length} open risk${openRows.length === 1 ? '' : 's'} — ${counts.Critical} critical, ${counts.High} high.` : 'No open risks recorded.',
    // Same shape as metrics.counts — kept as its own `chart` key too so every card exposes its
    // chart data at the same predictable location, even where (as here) it is identical to an
    // existing metrics field.
    chart: {...counts},
    links: [{label: 'Risk Register', to: projectDocumentRoute(project.id, 'risk-register')}],
  };
};

// Actions and Issues — action-item-log + issue-log. Status: Green (nothing overdue or escalated),
// Yellow (1-2 overdue actions), Red (3+ overdue actions, or any escalated issue).
const actionsAndIssuesHealth = project => {
  const actionLog = docValues(project, 'action-item-log');
  const issueLog = docValues(project, 'issue-log');
  const hasData = docExists(project, 'action-item-log') || docExists(project, 'issue-log');
  const now = new Date();
  const actionRows = actionLog?.actionItemRows || [];
  const issueRows = issueLog?.issueRows || [];
  const openActions = actionRows.filter(row => row.status !== 'Complete');
  const overdueActions = openActions.filter(row => row.dueDate && new Date(row.dueDate) < now);
  const openIssues = issueRows.filter(row => !['Resolved', 'Closed'].includes(row.status));
  const escalatedIssues = issueRows.filter(row => row.status === 'Escalated');

  let status = 'Green';
  if (overdueActions.length >= 3 || escalatedIssues.length > 0) status = 'Red';
  else if (overdueActions.length >= 1) status = 'Yellow';

  const countBy = (rows, key, values) => values.reduce((totals, value) => ({...totals, [value]: rows.filter(row => row[key] === value).length}), {});
  const actionsByStatus = countBy(actionRows, 'status', ['Complete', 'In Progress', 'Blocked', 'Not Started']);
  // issue-log's status enum also has 'Closed' (distinct from 'Resolved') — folded into Resolved for
  // this 4-bucket donut, matching the spec's Open/In Progress/Escalated/Resolved categories.
  const issuesByStatus = countBy(issueRows, 'status', ['Open', 'In Progress', 'Escalated', 'Resolved']);
  issuesByStatus.Resolved += issueRows.filter(row => row.status === 'Closed').length;

  return {
    id: 'actionsIssues', title: 'Actions and Issues', hasData, status,
    metrics: {openActionsCount: openActions.length, overdueActionsCount: overdueActions.length, openIssuesCount: openIssues.length, escalatedIssuesCount: escalatedIssues.length},
    summary: `${openActions.length} open action${openActions.length === 1 ? '' : 's'} (${overdueActions.length} overdue), ${openIssues.length} open issue${openIssues.length === 1 ? '' : 's'} (${escalatedIssues.length} escalated).`,
    chart: {
      actions: {complete: actionsByStatus.Complete, inProgress: actionsByStatus['In Progress'], blocked: actionsByStatus.Blocked, notStarted: actionsByStatus['Not Started']},
      issues: {open: issuesByStatus.Open, inProgress: issuesByStatus['In Progress'], escalated: issuesByStatus.Escalated, resolved: issuesByStatus.Resolved},
    },
    links: [{label: 'Action Item Log', to: projectDocumentRoute(project.id, 'action-item-log')}, {label: 'Issue Log', to: projectDocumentRoute(project.id, 'issue-log')}],
  };
};

// Approvals and Decisions — pending approvals come from the Approvals tab, which is backed by
// pmRepository (a Supabase-persisted table fetched live by ProjectApprovals, not a
// project.documents record). Nothing in this codebase currently copies that data onto the project
// object, so this card reads project.approvals if the caller has already attached it (e.g. a
// dashboard component that fetched pmRepository.approvals.list() and merged it in before calling
// this function) — expected shape per pmRepository row: {status, created_at, ...}. When
// project.approvals is absent, this card falls back to decision-log and the Status Report's own
// last-saved date, exactly as it would for any other document-only card.
const approvalsAndDecisionsHealth = project => {
  const decisionLog = docValues(project, 'decision-log');
  const executiveDashboard = docValues(project, 'executive-dashboard');
  const statusReport = docRecord(project, 'status-report');
  const approvals = Array.isArray(project?.approvals) ? project.approvals : null;
  const hasData = docExists(project, 'decision-log') || approvals !== null || Boolean(statusReport);

  const now = new Date();
  const statusOf = item => item.status || item.content?.status || 'Pending';
  const pendingApprovals = (approvals || []).filter(item => statusOf(item) === 'Pending');
  const approvedApprovals = (approvals || []).filter(item => statusOf(item) === 'Approved');
  const rejectedApprovals = (approvals || []).filter(item => statusOf(item) === 'Rejected');
  const pendingAgeDays = pendingApprovals
    .map(item => item.created_at || item.createdAt)
    .filter(Boolean)
    .map(value => Math.floor((now - new Date(value)) / 86400000))
    .filter(days => Number.isFinite(days));
  const maxPendingDays = pendingAgeDays.length ? Math.max(...pendingAgeDays) : null;
  const pendingOver7DaysCount = pendingAgeDays.filter(days => days > 7).length;
  const decisionsNeededCount = (executiveDashboard?.decisionsRequiredRows || []).length;

  let status = 'Green';
  if (maxPendingDays !== null) {
    if (maxPendingDays > 14) status = 'Red';
    else if (maxPendingDays >= 7) status = 'Yellow';
  }

  return {
    id: 'approvalsDecisions', title: 'Approvals and Decisions', hasData, status,
    metrics: {
      pendingApprovalsCount: pendingApprovals.length, maxPendingDays, decisionsNeededCount, pendingOver7DaysCount,
      decisionCount: (decisionLog?.decisionRows || []).length,
      lastStatusReportDate: statusReport?.updatedAt || null,
    },
    summary: approvals !== null
      ? `${pendingApprovals.length} pending approval${pendingApprovals.length === 1 ? '' : 's'}${maxPendingDays !== null ? ` (oldest ${maxPendingDays}d)` : ''}, ${decisionsNeededCount} decision${decisionsNeededCount === 1 ? '' : 's'} needed.`
      : `${decisionsNeededCount} decision${decisionsNeededCount === 1 ? '' : 's'} needed. Approvals data not attached to this project object.`,
    chart: {pending: pendingApprovals.length, approved: approvedApprovals.length, rejected: rejectedApprovals.length, decisionsNeededCount, pendingOver7DaysCount},
    // 'tab:approvals' is not a document route — it points at the Project Hub's own Approvals tab
    // (id 'approvals' in ProjectDetail.js TAB_DEFINITIONS). A dashboard rendering this should
    // switch tabs for a link whose `to` starts with 'tab:' instead of navigating to it as a URL.
    links: [{label: 'Approvals', to: 'tab:approvals'}, {label: 'Decision Log', to: projectDocumentRoute(project.id, 'decision-log')}],
  };
};

// The 5 PM Focus Area stages, in lifecycle order, for the Document Completion secondary
// indicator's segmented bar. `key` matches the exact phase string documents are persisted with
// (pmpTemplates.js's lifecycle group names — see DocumentWorkspace.js's persist(), which stores
// `phase: template.phase`); `label` is the human-readable form the task asked for ("Monitoring and
// Controlling", not the internal "Monitoring & Controlling").
const PM_STAGES = [
  {key: 'Initiation', label: 'Initiation'},
  {key: 'Planning', label: 'Planning'},
  {key: 'Execution', label: 'Execution'},
  {key: 'Monitoring & Controlling', label: 'Monitoring and Controlling'},
  {key: 'Closing', label: 'Closing'},
];

const documentCompletionByStage = documents => PM_STAGES.map(({key, label}) => {
  const inStage = documents.filter(document => document.phase === key);
  const documentCount = inStage.length;
  const completionPercent = documentCount ? round(inStage.reduce((total, document) => total + (Number(document.completion) || 0), 0) / documentCount) : null;
  const status = documentCount === 0 ? 'not-started' : inStage.every(document => Number(document.completion) === 100) ? 'complete' : 'in-progress';
  return {stage: label, status, completionPercent, documentCount};
});

const secondaryIndicators = project => {
  const benefitsTracking = docValues(project, 'benefits-tracking-register');
  const benefitRows = benefitsTracking?.benefitRows || [];
  const benefitsRealizationPercent = benefitRows.length ? round((benefitRows.filter(row => ['Tracking', 'Realized'].includes(row.status)).length / benefitRows.length) * 100) : null;
  const benefitsChart = benefitRows
    .map(row => ({name: row.benefitDescription || row.benefitId || 'Benefit', baseline: toNumber(row.baselineValue), target: toNumber(row.targetValue), current: toNumber(row.currentValue)}))
    .filter(row => row.baseline !== null || row.target !== null || row.current !== null);

  const documents = Object.values(project.documents || {});
  const documentCompletionPercent = documents.length ? round((documents.filter(document => Number(document.completion) === 100).length / documents.length) * 100) : null;
  const documentCompletionChart = documentCompletionByStage(documents);

  const changeLog = docValues(project, 'change-log');
  const changeActivityCount = (changeLog?.changeRegisterRows || []).filter(row => row.status === 'Approved').length;

  const qualityAudit = docValues(project, 'quality-audit');
  const qualityAuditConclusion = qualityAudit?.overallAuditConclusion || null;

  return {
    benefitsRealization: {percent: benefitsRealizationPercent, label: benefitsRealizationPercent === null ? 'No data yet' : `${benefitsRealizationPercent}% tracking or realized`, chart: benefitsChart},
    documentCompletion: {percent: documentCompletionPercent, label: documentCompletionPercent === null ? 'No data yet' : `${documentCompletionPercent}% of documents complete`, chart: documentCompletionChart},
    changeActivity: {count: changeActivityCount, label: `${changeActivityCount} approved change${changeActivityCount === 1 ? '' : 's'}`},
    qualityAudit: {conclusion: qualityAuditConclusion, label: qualityAuditConclusion || 'No data yet'},
  };
};

// Thresholds match the health bar's own color bands (Change 1): Green 80-100, Yellow 60-79,
// Red 0-59 — kept as one source of truth so the ring/bar color and the overall label never
// disagree with each other.
const overallHealth = cards => {
  const scored = cards.filter(card => card.hasData);
  if (!scored.length) return {score: null, label: 'No data yet', ring: 0};
  const average = round(scored.reduce((total, card) => total + STATUS_SCORE[card.status], 0) / scored.length);
  const label = average >= 80 ? 'Green' : average >= 60 ? 'Yellow' : 'Red';
  return {score: average, label, ring: average};
};

// The single entry point — a pure function of the project object, safe to call from the dashboard
// UI or from an AI daily-brief job with no other setup. Returns null only when there is no project
// to read (the caller's own missing-project handling, not a health state).
export const computeProjectHealth = project => {
  if (!project) return null;
  const cards = {
    schedule: scheduleHealth(project),
    cost: costHealth(project),
    risk: riskExposure(project),
    actionsIssues: actionsAndIssuesHealth(project),
    approvalsDecisions: approvalsAndDecisionsHealth(project),
  };
  return {
    projectId: project.id,
    computedAt: new Date().toISOString(),
    overall: overallHealth(Object.values(cards)),
    cards,
    secondary: secondaryIndicators(project),
  };
};

export const RISK_SEVERITY_THRESHOLDS_FOR_TESTING = RISK_SEVERITY_THRESHOLDS;
export const PM_STAGES_FOR_TESTING = PM_STAGES;

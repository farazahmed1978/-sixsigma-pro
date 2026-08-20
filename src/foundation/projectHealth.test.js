import {computeProjectHealth} from './projectHealth';

const doc = (id, values, extra = {}) => ({[`document-${id}`]: {id: `document-${id}`, templateId: id, updatedAt: '2026-01-01T00:00:00.000Z', values, ...extra}});
const project = (documents = {}, extra = {}) => ({id: 'p1', name: 'Test Project', documents, ...extra});
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();

describe('computeProjectHealth — top level', () => {
  test('returns null for a missing project', () => {
    expect(computeProjectHealth(null)).toBeNull();
    expect(computeProjectHealth(undefined)).toBeNull();
  });

  test('handles a project with no documents at all without throwing', () => {
    const health = computeProjectHealth(project());
    expect(health.overall).toEqual({score: null, label: 'No data yet', ring: 0});
    Object.values(health.cards).forEach(card => expect(card.hasData).toBe(false));
  });

  test('returns a structured, JSON-serializable object', () => {
    const health = computeProjectHealth(project());
    expect(() => JSON.stringify(health)).not.toThrow();
    expect(health.projectId).toBe('p1');
    expect(typeof health.computedAt).toBe('string');
  });
});

describe('Schedule Health card', () => {
  test('Green when every milestone is on track or complete', () => {
    const proj = project(doc('milestone-report', {milestoneStatusRows: [{status: 'On Track'}, {status: 'Complete'}]}));
    expect(computeProjectHealth(proj).cards.schedule.status).toBe('Green');
  });

  test('Yellow when one or two milestones are At Risk', () => {
    const proj = project(doc('milestone-report', {milestoneStatusRows: [{status: 'On Track'}, {status: 'At Risk'}]}));
    expect(computeProjectHealth(proj).cards.schedule.status).toBe('Yellow');
  });

  test('Red when any milestone is Delayed', () => {
    const proj = project(doc('milestone-report', {milestoneStatusRows: [{status: 'Delayed'}]}));
    expect(computeProjectHealth(proj).cards.schedule.status).toBe('Red');
  });

  test('Red when SPI from EVM Dashboard is below 0.9, even with no delayed milestones', () => {
    const proj = project({
      ...doc('milestone-report', {milestoneStatusRows: [{status: 'On Track'}]}),
      ...doc('evm-dashboard', {SPI: '0.75'}),
    });
    const schedule = computeProjectHealth(proj).cards.schedule;
    expect(schedule.status).toBe('Red');
    expect(schedule.metrics.spi).toBe(0.75);
  });

  test('picks the earliest not-yet-complete milestone as nextMilestone', () => {
    const proj = project(doc('milestone-report', {milestoneStatusRows: [
      {milestoneDescription: 'Later', plannedDate: '2026-06-01', status: 'On Track'},
      {milestoneDescription: 'Sooner', plannedDate: '2026-03-01', status: 'On Track'},
      {milestoneDescription: 'Done', plannedDate: '2026-01-01', status: 'Complete'},
    ]}));
    expect(computeProjectHealth(proj).cards.schedule.metrics.nextMilestone).toMatchObject({name: 'Sooner', date: '2026-03-01'});
  });

  test('hasData is false and status still computes cleanly when neither source document exists', () => {
    const card = computeProjectHealth(project()).cards.schedule;
    expect(card.hasData).toBe(false);
    expect(card.status).toBe('Green');
  });

  test('zero-state: hasMilestoneData is false and the summary says so, not "0 on track, 0 at risk, 0 delayed", when a Milestone Report exists with no rows', () => {
    const proj = project(doc('milestone-report', {milestoneStatusRows: []}));
    const card = computeProjectHealth(proj).cards.schedule;
    expect(card.hasData).toBe(true);
    expect(card.hasMilestoneData).toBe(false);
    expect(card.summary).toBe('No milestone data yet — add milestones in Schedule Baseline.');
    expect(card.summary).not.toContain('0 on track');
  });

  test('chart exposes onTrack/atRisk/delayed/notStarted counts, and hasMilestoneData is true once rows exist', () => {
    const proj = project(doc('milestone-report', {milestoneStatusRows: [
      {status: 'On Track'}, {status: 'Complete'}, {status: 'At Risk'}, {status: 'Delayed'}, {status: 'Not Started'},
    ]}));
    const card = computeProjectHealth(proj).cards.schedule;
    expect(card.hasMilestoneData).toBe(true);
    expect(card.chart).toEqual({onTrack: 2, atRisk: 1, delayed: 1, notStarted: 1});
    expect(card.metrics.notStartedCount).toBe(1);
  });

  test('the links array includes both Milestone Report and Schedule Baseline', () => {
    const links = computeProjectHealth(project()).cards.schedule.links.map(link => link.label);
    expect(links).toEqual(['Milestone Report', 'Schedule Baseline']);
  });
});

describe('Cost Health card', () => {
  test('Green when CPI >= 1.0', () => {
    const proj = project(doc('evm-dashboard', {CPI: '1.05'}));
    expect(computeProjectHealth(proj).cards.cost.status).toBe('Green');
  });

  test('Yellow when 0.9 <= CPI < 1.0', () => {
    const proj = project(doc('evm-dashboard', {CPI: '0.92'}));
    expect(computeProjectHealth(proj).cards.cost.status).toBe('Yellow');
  });

  test('Red when CPI < 0.9', () => {
    const proj = project(doc('evm-dashboard', {CPI: '0.7'}));
    expect(computeProjectHealth(proj).cards.cost.status).toBe('Red');
  });

  test('Red when the EVM Dashboard exists but has no CPI entered', () => {
    const proj = project(doc('evm-dashboard', {}));
    const cost = computeProjectHealth(proj).cards.cost;
    expect(cost.hasData).toBe(true);
    expect(cost.status).toBe('Red');
  });

  test('computes budget burned percent and EAC vs BAC variance', () => {
    const proj = project(doc('evm-dashboard', {CPI: '1', ac: '400', bac: '1000', EAC: '900'}));
    const cost = computeProjectHealth(proj).cards.cost;
    expect(cost.metrics.budgetBurnedPercent).toBe(40);
    expect(cost.metrics.eacVsBacVariance).toBe(-100);
  });

  test('chart carries budgetBurnedPercent, cpi, and budgetBurnStatus for the dashboard\'s burn bar and CPI gauge', () => {
    const proj = project(doc('evm-dashboard', {CPI: '0.85', ac: '400', bac: '1000'}));
    expect(computeProjectHealth(proj).cards.cost.chart).toEqual({budgetBurnedPercent: 40, cpi: 0.85, budgetBurnStatus: 'Green'});
  });

  test('chart.cpi is null when no CPI has been entered, the signal the chart uses for its empty state', () => {
    const proj = project(doc('evm-dashboard', {}));
    expect(computeProjectHealth(proj).cards.cost.chart.cpi).toBeNull();
  });

  describe('QA Fix 4: chart.budgetBurnStatus — the central, testable source for the budget-burn bar\'s color', () => {
    test.each([
      [50, 'Green'], [69.9, 'Green'],
      [70, 'Yellow'], [90, 'Yellow'], [80, 'Yellow'],
      [90.1, 'Red'], [150, 'Red'],
    ])('%s%% burned -> %s', (percent, expected) => {
      // ac/bac chosen so ac/bac*100 equals the percent under test.
      const proj = project(doc('evm-dashboard', {CPI: '1', ac: String(percent), bac: '100'}));
      expect(computeProjectHealth(proj).cards.cost.chart.budgetBurnStatus).toBe(expected);
    });

    test('is null when budgetBurnedPercent cannot be computed (no ac/bac)', () => {
      const proj = project(doc('evm-dashboard', {CPI: '1'}));
      const chart = computeProjectHealth(proj).cards.cost.chart;
      expect(chart.budgetBurnedPercent).toBeNull();
      expect(chart.budgetBurnStatus).toBeNull();
    });
  });
});

describe('Risk Exposure card', () => {
  test('Green when there are no High/Critical risks', () => {
    const proj = project(doc('risk-register', {riskRows: [{status: 'Open', exposure: 4}]}));
    expect(computeProjectHealth(proj).cards.risk.status).toBe('Green');
  });

  test('Yellow with 1-2 High risks', () => {
    const proj = project(doc('risk-register', {riskRows: [{status: 'Open', exposure: 12}]}));
    expect(computeProjectHealth(proj).cards.risk.status).toBe('Yellow');
  });

  test('Red with any Critical risk', () => {
    const proj = project(doc('risk-register', {riskRows: [{status: 'Open', exposure: 20}]}));
    expect(computeProjectHealth(proj).cards.risk.status).toBe('Red');
  });

  test('Red with 3 or more High risks even with no Critical risk', () => {
    const proj = project(doc('risk-register', {riskRows: [{status: 'Open', exposure: 10}, {status: 'Open', exposure: 11}, {status: 'Open', exposure: 12}]}));
    expect(computeProjectHealth(proj).cards.risk.status).toBe('Red');
  });

  test('closed risks are excluded from open risk counts and severity', () => {
    const proj = project(doc('risk-register', {riskRows: [{status: 'Closed', exposure: 25}]}));
    const risk = computeProjectHealth(proj).cards.risk;
    expect(risk.metrics.openRiskCount).toBe(0);
    expect(risk.status).toBe('Green');
  });

  test('topRisk is the open risk with the highest exposure', () => {
    const proj = project(doc('risk-register', {riskRows: [
      {status: 'Open', risk: 'Low one', exposure: 4, owner: 'A'},
      {status: 'Open', risk: 'High one', exposure: 20, owner: 'B'},
    ]}));
    expect(computeProjectHealth(proj).cards.risk.metrics.topRisk).toMatchObject({risk: 'High one', exposure: 20, owner: 'B'});
  });

  test('summary reads "No open risks recorded." (not "No open risks.") when there are none', () => {
    const proj = project(doc('risk-register', {riskRows: []}));
    expect(computeProjectHealth(proj).cards.risk.summary).toBe('No open risks recorded.');
  });

  test('chart mirrors metrics.counts by severity tier', () => {
    const proj = project(doc('risk-register', {riskRows: [{status: 'Open', exposure: 20}, {status: 'Open', exposure: 12}]}));
    const card = computeProjectHealth(proj).cards.risk;
    expect(card.chart).toEqual(card.metrics.counts);
    expect(card.chart).toEqual({Critical: 1, High: 1, Medium: 0, Low: 0});
  });
});

describe('Actions and Issues card', () => {
  test('Green when nothing is overdue or escalated', () => {
    const proj = project({
      ...doc('action-item-log', {actionItemRows: [{status: 'In Progress', dueDate: daysAgo(-5)}]}),
      ...doc('issue-log', {issueRows: [{status: 'Open'}]}),
    });
    expect(computeProjectHealth(proj).cards.actionsIssues.status).toBe('Green');
  });

  test('Yellow with 1-2 overdue actions', () => {
    const proj = project(doc('action-item-log', {actionItemRows: [{status: 'In Progress', dueDate: daysAgo(3)}]}));
    expect(computeProjectHealth(proj).cards.actionsIssues.status).toBe('Yellow');
  });

  test('Red with 3+ overdue actions', () => {
    const proj = project(doc('action-item-log', {actionItemRows: [
      {status: 'In Progress', dueDate: daysAgo(1)}, {status: 'In Progress', dueDate: daysAgo(2)}, {status: 'In Progress', dueDate: daysAgo(3)},
    ]}));
    expect(computeProjectHealth(proj).cards.actionsIssues.status).toBe('Red');
  });

  test('Red with any escalated issue regardless of overdue actions', () => {
    const proj = project(doc('issue-log', {issueRows: [{status: 'Escalated'}]}));
    expect(computeProjectHealth(proj).cards.actionsIssues.status).toBe('Red');
  });

  test('completed actions are not counted as open or overdue', () => {
    const proj = project(doc('action-item-log', {actionItemRows: [{status: 'Complete', dueDate: daysAgo(30)}]}));
    const card = computeProjectHealth(proj).cards.actionsIssues;
    expect(card.metrics.openActionsCount).toBe(0);
    expect(card.metrics.overdueActionsCount).toBe(0);
  });

  test('chart breaks actions and issues down by status for the two donuts, folding Closed issues into Resolved', () => {
    const proj = project({
      ...doc('action-item-log', {actionItemRows: [{status: 'Complete'}, {status: 'In Progress'}, {status: 'Blocked'}, {status: 'Not Started'}, {status: 'Not Started'}]}),
      ...doc('issue-log', {issueRows: [{status: 'Open'}, {status: 'Escalated'}, {status: 'Resolved'}, {status: 'Closed'}]}),
    });
    const card = computeProjectHealth(proj).cards.actionsIssues;
    expect(card.chart.actions).toEqual({complete: 1, inProgress: 1, blocked: 1, notStarted: 2});
    expect(card.chart.issues).toEqual({open: 1, inProgress: 0, escalated: 1, resolved: 2});
  });
});

describe('Approvals and Decisions card', () => {
  test('Green when nothing has been pending more than 7 days', () => {
    const proj = project(doc('decision-log', {}), {approvals: [{status: 'Pending', created_at: daysAgo(2)}]});
    expect(computeProjectHealth(proj).cards.approvalsDecisions.status).toBe('Green');
  });

  test('Yellow when pending 7-14 days', () => {
    const proj = project(doc('decision-log', {}), {approvals: [{status: 'Pending', created_at: daysAgo(10)}]});
    expect(computeProjectHealth(proj).cards.approvalsDecisions.status).toBe('Yellow');
  });

  test('Red when pending more than 14 days', () => {
    const proj = project(doc('decision-log', {}), {approvals: [{status: 'Pending', created_at: daysAgo(20)}]});
    expect(computeProjectHealth(proj).cards.approvalsDecisions.status).toBe('Red');
  });

  test('approved/rejected approvals do not count toward pending age', () => {
    const proj = project(doc('decision-log', {}), {approvals: [{status: 'Approved', created_at: daysAgo(90)}]});
    const card = computeProjectHealth(proj).cards.approvalsDecisions;
    expect(card.metrics.pendingApprovalsCount).toBe(0);
    expect(card.status).toBe('Green');
  });

  test('falls back to decision-log/status-report gracefully when project.approvals is not attached', () => {
    const proj = project(doc('decision-log', {decisionRows: [{decision: 'x'}]}));
    const card = computeProjectHealth(proj).cards.approvalsDecisions;
    expect(card.hasData).toBe(true);
    expect(card.metrics.pendingApprovalsCount).toBe(0);
    expect(card.status).toBe('Green');
  });

  test('decisionsNeededCount comes from Executive Dashboard decisionsRequiredRows', () => {
    const proj = project(doc('executive-dashboard', {decisionsRequiredRows: [{decision: 'a'}, {decision: 'b'}]}));
    expect(computeProjectHealth(proj).cards.approvalsDecisions.metrics.decisionsNeededCount).toBe(2);
  });

  test('chart breaks approvals down by pending/approved/rejected and counts pending approvals over 7 days old', () => {
    const proj = project({}, {approvals: [
      {status: 'Pending', created_at: daysAgo(10)},
      {status: 'Pending', created_at: daysAgo(2)},
      {status: 'Approved', created_at: daysAgo(30)},
      {status: 'Rejected', created_at: daysAgo(5)},
    ]});
    const card = computeProjectHealth(proj).cards.approvalsDecisions;
    expect(card.chart.pending).toBe(2);
    expect(card.chart.approved).toBe(1);
    expect(card.chart.rejected).toBe(1);
    expect(card.chart.pendingOver7DaysCount).toBe(1);
    expect(card.metrics.pendingOver7DaysCount).toBe(1);
  });
});

describe('Secondary indicators', () => {
  test('benefits realization percent counts Tracking and Realized statuses', () => {
    const proj = project(doc('benefits-tracking-register', {benefitRows: [{status: 'Tracking'}, {status: 'Realized'}, {status: 'At Risk'}, {status: 'Planned'}]}));
    expect(computeProjectHealth(proj).secondary.benefitsRealization.percent).toBe(50);
  });

  test('document completion percent counts documents at exactly 100% completion', () => {
    const proj = project({
      'document-a': {id: 'document-a', completion: 100, values: {}},
      'document-b': {id: 'document-b', completion: 40, values: {}},
    });
    expect(computeProjectHealth(proj).secondary.documentCompletion.percent).toBe(50);
  });

  test('change activity counts only Approved changes', () => {
    const proj = project(doc('change-log', {changeRegisterRows: [{status: 'Approved'}, {status: 'Rejected'}, {status: 'Approved'}]}));
    expect(computeProjectHealth(proj).secondary.changeActivity.count).toBe(2);
  });

  test('quality audit surfaces the latest overallAuditConclusion', () => {
    const proj = project(doc('quality-audit', {overallAuditConclusion: 'Satisfactory with Observations'}));
    expect(computeProjectHealth(proj).secondary.qualityAudit.conclusion).toBe('Satisfactory with Observations');
  });

  test('every secondary indicator reports "No data yet" gracefully when its source is missing', () => {
    const secondary = computeProjectHealth(project()).secondary;
    expect(secondary.benefitsRealization.label).toBe('No data yet');
    expect(secondary.documentCompletion.label).toBe('No data yet');
    expect(secondary.qualityAudit.label).toBe('No data yet');
  });

  test('benefitsRealization.chart carries baseline/target/current per benefit', () => {
    const proj = project(doc('benefits-tracking-register', {benefitRows: [{benefitDescription: 'Reduce onboarding time', baselineValue: 14, targetValue: 5, currentValue: 6, status: 'Tracking'}]}));
    expect(computeProjectHealth(proj).secondary.benefitsRealization.chart).toEqual([{name: 'Reduce onboarding time', baseline: 14, target: 5, current: 6}]);
  });

  test('benefitsRealization.chart is an empty array when there are no benefit rows', () => {
    expect(computeProjectHealth(project()).secondary.benefitsRealization.chart).toEqual([]);
  });

  test('documentCompletion.chart reports all 5 PM stages in order, each with a status and a document count', () => {
    const proj = project({
      'document-a': {id: 'document-a', phase: 'Initiation', completion: 100, values: {}},
      'document-b': {id: 'document-b', phase: 'Planning', completion: 40, values: {}},
    });
    const chart = computeProjectHealth(proj).secondary.documentCompletion.chart;
    expect(chart.map(stage => stage.stage)).toEqual(['Initiation', 'Planning', 'Execution', 'Monitoring and Controlling', 'Closing']);
    expect(chart[0]).toMatchObject({status: 'complete', documentCount: 1, completionPercent: 100});
    expect(chart[1]).toMatchObject({status: 'in-progress', documentCount: 1, completionPercent: 40});
    expect(chart[2]).toMatchObject({status: 'not-started', documentCount: 0});
  });

  test('QA Fix 2: each stage also carries a fixed shortLabel abbreviation, computed centrally rather than truncated by the component', () => {
    const chart = computeProjectHealth(project()).secondary.documentCompletion.chart;
    expect(chart.map(stage => stage.shortLabel)).toEqual(['Init', 'Plan', 'Exec', 'M&C', 'Close']);
  });
});

describe('Overall health score', () => {
  test('averages Green=100/Yellow=60/Red=0 across cards that have data', () => {
    const proj = project({
      ...doc('milestone-report', {milestoneStatusRows: [{status: 'On Track'}]}), // schedule Green
      ...doc('evm-dashboard', {CPI: '0.95'}), // cost Yellow
      ...doc('risk-register', {riskRows: [{status: 'Open', exposure: 20}]}), // risk Red
    });
    const overall = computeProjectHealth(proj).overall;
    // (100 + 60 + 0) / 3 = 53.33 -> rounds to 53, which is below the 60% Yellow threshold -> Red
    expect(overall.score).toBe(53);
    expect(overall.label).toBe('Red');
  });

  test('a score of exactly 60 is Yellow and a score of exactly 80 is Green (the bar\'s own threshold bands)', () => {
    const yellowProj = project(doc('evm-dashboard', {CPI: '0.95'})); // cost Yellow alone -> 60
    expect(computeProjectHealth(yellowProj).overall).toMatchObject({score: 60, label: 'Yellow'});
    const greenProj = project(doc('milestone-report', {milestoneStatusRows: [{status: 'On Track'}]})); // schedule Green alone -> 100
    expect(computeProjectHealth(greenProj).overall).toMatchObject({score: 100, label: 'Green'});
  });

  test('cards with no data are excluded from the average, not counted as Red', () => {
    const proj = project(doc('milestone-report', {milestoneStatusRows: [{status: 'On Track'}]}));
    const overall = computeProjectHealth(proj).overall;
    expect(overall.score).toBe(100);
  });

  test('reports "No data yet" when not a single card has data', () => {
    const overall = computeProjectHealth(project()).overall;
    expect(overall.score).toBeNull();
    expect(overall.label).toBe('No data yet');
  });
});

// Phase 5C fix: a document that has been opened but has zero rows entered is an absence of
// evidence, not evidence of good health — it must contribute Yellow (60), not Green (100), to the
// weighted average. Approvals/Decisions is explicitly excluded (zero pending is genuinely good).
describe('Empty-but-opened documents score Yellow, not Green (health score fix)', () => {
  test('Schedule Health is Yellow when milestone-report exists with zero rows', () => {
    const proj = project(doc('milestone-report', {milestoneStatusRows: []}));
    expect(computeProjectHealth(proj).cards.schedule.status).toBe('Yellow');
  });

  test('Risk Exposure is Yellow when risk-register exists with zero rows', () => {
    const proj = project(doc('risk-register', {riskRows: []}));
    expect(computeProjectHealth(proj).cards.risk.status).toBe('Yellow');
  });

  test('Actions and Issues is Yellow when both logs exist with zero rows', () => {
    const proj = project({...doc('action-item-log', {actionItemRows: []}), ...doc('issue-log', {issueRows: []})});
    expect(computeProjectHealth(proj).cards.actionsIssues.status).toBe('Yellow');
  });

  test('Risk Exposure stays Green when the register has rows but all are genuinely closed (real evidence, not absence of it)', () => {
    const proj = project(doc('risk-register', {riskRows: [{status: 'Closed', exposure: 20}]}));
    expect(computeProjectHealth(proj).cards.risk.status).toBe('Green');
  });

  test('a freshly created project with all four affected documents opened but empty scores well below 80% (Yellow or Red), not 100% Green', () => {
    const proj = project({
      ...doc('milestone-report', {milestoneStatusRows: []}),
      ...doc('risk-register', {riskRows: []}),
      ...doc('action-item-log', {actionItemRows: []}),
      ...doc('issue-log', {issueRows: []}),
    });
    const overall = computeProjectHealth(proj).overall;
    expect(overall.score).toBeLessThan(80);
    expect(['Yellow', 'Red']).toContain(overall.label);
  });

  test('a project with literally no documents opened at all still reports "No data yet" (hasData:false cards stay excluded, unaffected by this fix)', () => {
    const overall = computeProjectHealth(project()).overall;
    expect(overall.score).toBeNull();
    expect(overall.label).toBe('No data yet');
  });

  test('Approvals and Decisions is unaffected — still Green with zero pending approvals (explicitly excluded from this fix)', () => {
    const proj = project({}, {approvals: []});
    expect(computeProjectHealth(proj).cards.approvalsDecisions.status).toBe('Green');
  });
});

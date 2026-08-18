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
});

describe('Overall health score', () => {
  test('averages Green=100/Yellow=60/Red=0 across cards that have data', () => {
    const proj = project({
      ...doc('milestone-report', {milestoneStatusRows: [{status: 'On Track'}]}), // schedule Green
      ...doc('evm-dashboard', {CPI: '0.95'}), // cost Yellow
      ...doc('risk-register', {riskRows: [{status: 'Open', exposure: 20}]}), // risk Red
    });
    const overall = computeProjectHealth(proj).overall;
    // (100 + 60 + 0) / 3 = 53.33 -> rounds to 53
    expect(overall.score).toBe(53);
    expect(overall.label).toBe('Yellow');
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

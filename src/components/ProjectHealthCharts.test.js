import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {
  healthBarColor,
  HealthBar,
  MilestoneStatusChart,
  CostBurnChart,
  RiskSeverityChart,
  ActionsIssuesDonuts,
  ApprovalsChart,
  BenefitsRealizationBars,
  DocumentCompletionByStageBar,
} from './ProjectHealthCharts';

const mount = async element => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<MemoryRouter>{element}</MemoryRouter>));
  return {
    host,
    unmount: async () => { await act(async () => root.unmount()); host.remove(); },
  };
};

describe('healthBarColor — the bar\'s color threshold logic', () => {
  test.each([
    [100, 'green'], [80, 'green'],
    [79, 'yellow'], [60, 'yellow'],
    [59, 'red'], [0, 'red'],
  ])('%i%% -> %s', (percent, expected) => {
    expect(healthBarColor(percent)).toBe(expected);
  });

  test('null/undefined -> "none" (no data yet)', () => {
    expect(healthBarColor(null)).toBe('none');
    expect(healthBarColor(undefined)).toBe('none');
  });
});

describe('HealthBar', () => {
  test('shows the percent and uppercased status label, and colors the wrapper by threshold', async () => {
    const {host, unmount} = await mount(<HealthBar percent={72} label="Yellow" />);
    expect(host.querySelector('.ph-health-bar-wrap').className).toContain('status-yellow');
    expect(host.querySelector('.ph-health-bar-headline strong').textContent).toBe('72%');
    expect(host.querySelector('.ph-health-bar-status-label').textContent).toBe('YELLOW');
    await unmount();
  });

  test('renders two tick marks at 60% and 80%', async () => {
    const {host, unmount} = await mount(<HealthBar percent={50} label="Red" />);
    const ticks = [...host.querySelectorAll('.ph-health-bar-tick')];
    expect(ticks).toHaveLength(2);
    expect(ticks[0].style.left).toBe('60%');
    expect(ticks[1].style.left).toBe('80%');
    await unmount();
  });

  test('shows "No data yet" and no status label when percent is null', async () => {
    const {host, unmount} = await mount(<HealthBar percent={null} label="No data yet" />);
    expect(host.querySelector('.ph-health-bar-headline').textContent).toBe('No data yet');
    expect(host.querySelector('.ph-health-bar-status-label')).toBeNull();
    expect(host.querySelector('.ph-health-bar-wrap').className).toContain('status-none');
    await unmount();
  });
});

const link = {label: 'Open It', to: '/projects/p1/documents/some-doc'};

describe('MilestoneStatusChart empty state', () => {
  test('shows the Schedule Health zero-state message and a link when hasMilestoneData is false', async () => {
    const {host, unmount} = await mount(<MilestoneStatusChart chart={{onTrack: 0, atRisk: 0, delayed: 0, notStarted: 0}} hasMilestoneData={false} emptyLink={link} />);
    expect(host.textContent).toContain('No milestone data yet — add milestones in Schedule Baseline.');
    expect(host.textContent).not.toContain('0 on track');
    expect(host.querySelector('a').getAttribute('href')).toBe(link.to);
    await unmount();
  });

  test('renders the chart (no empty message) when milestone data exists', async () => {
    const {host, unmount} = await mount(<MilestoneStatusChart chart={{onTrack: 2, atRisk: 1, delayed: 0, notStarted: 0}} hasMilestoneData={true} emptyLink={link} />);
    expect(host.textContent).not.toContain('No milestone data yet');
    await unmount();
  });
});

describe('CostBurnChart empty state', () => {
  test('shows "No EVM data yet" when cpi is null', async () => {
    const {host, unmount} = await mount(<CostBurnChart chart={{budgetBurnedPercent: null, cpi: null}} emptyLink={link} />);
    expect(host.textContent).toContain('No EVM data yet — open EVM Dashboard to enter values.');
    await unmount();
  });

  test('renders the burn bar and CPI gauge when cpi is present', async () => {
    const {host, unmount} = await mount(<CostBurnChart chart={{budgetBurnedPercent: 40, cpi: 0.95}} emptyLink={link} />);
    expect(host.textContent).not.toContain('No EVM data yet');
    expect(host.textContent).toContain('Budget burned');
    expect(host.textContent).toContain('CPI');
    await unmount();
  });
});

describe('RiskSeverityChart empty state', () => {
  test('shows "No open risks recorded." (not "No open risks.") when every count is zero', async () => {
    const {host, unmount} = await mount(<RiskSeverityChart counts={{Critical: 0, High: 0, Medium: 0, Low: 0}} emptyLink={link} />);
    expect(host.textContent).toContain('No open risks recorded.');
    await unmount();
  });

  test('renders the severity bars when there is at least one open risk', async () => {
    const {host, unmount} = await mount(<RiskSeverityChart counts={{Critical: 1, High: 0, Medium: 0, Low: 2}} emptyLink={link} />);
    expect(host.textContent).not.toContain('No open risks recorded');
    await unmount();
  });
});

describe('ActionsIssuesDonuts empty state', () => {
  test('shows a combined empty message when there are no actions and no issues at all', async () => {
    const {host, unmount} = await mount(<ActionsIssuesDonuts actions={{complete: 0, inProgress: 0, blocked: 0, notStarted: 0}} issues={{open: 0, inProgress: 0, escalated: 0, resolved: 0}} emptyLink={link} />);
    expect(host.textContent).toContain('No actions or issues recorded.');
    await unmount();
  });

  test('shows a per-donut empty message when only one side has data', async () => {
    const {host, unmount} = await mount(<ActionsIssuesDonuts actions={{complete: 1, inProgress: 0, blocked: 0, notStarted: 0}} issues={{open: 0, inProgress: 0, escalated: 0, resolved: 0}} emptyLink={link} />);
    expect(host.textContent).not.toContain('No actions or issues recorded.');
    expect(host.textContent).toContain('No issues recorded');
    await unmount();
  });
});

describe('ApprovalsChart empty state', () => {
  test('shows a combined empty message when there are no approvals and no decisions needed', async () => {
    const {host, unmount} = await mount(<ApprovalsChart chart={{pending: 0, approved: 0, rejected: 0, decisionsNeededCount: 0, pendingOver7DaysCount: 0}} emptyLink={link} />);
    expect(host.textContent).toContain('No approvals or decisions recorded.');
    await unmount();
  });

  test('shows decisions-needed and age-over-7-days text when there are approvals', async () => {
    const {host, unmount} = await mount(<ApprovalsChart chart={{pending: 2, approved: 1, rejected: 0, decisionsNeededCount: 3, pendingOver7DaysCount: 1}} emptyLink={link} />);
    expect(host.textContent).not.toContain('No approvals or decisions recorded.');
    expect(host.textContent).toContain('3 decisions needed');
    expect(host.textContent).toContain('1 pending approval over 7 days old');
    await unmount();
  });
});

describe('BenefitsRealizationBars', () => {
  test('shows "No data yet" when there are no benefits', async () => {
    const {host, unmount} = await mount(<BenefitsRealizationBars benefits={[]} />);
    expect(host.textContent).toContain('No data yet');
    await unmount();
  });

  test('renders one bar per benefit with baseline/target/current marks', async () => {
    const {host, unmount} = await mount(<BenefitsRealizationBars benefits={[{name: 'Reduce onboarding time', baseline: 14, target: 5, current: 6}]} />);
    expect(host.textContent).toContain('Reduce onboarding time');
    expect(host.querySelector('.ph-benefit-fill')).toBeTruthy();
    expect(host.querySelectorAll('.ph-benefit-mark')).toHaveLength(2);
    await unmount();
  });
});

describe('DocumentCompletionByStageBar', () => {
  test('shows "No data yet" when no stage has any document', async () => {
    const stages = ['Initiation', 'Planning', 'Execution', 'Monitoring and Controlling', 'Closing'].map(stage => ({stage, status: 'not-started', completionPercent: null, documentCount: 0}));
    const {host, unmount} = await mount(<DocumentCompletionByStageBar stages={stages} />);
    expect(host.textContent).toContain('No data yet');
    await unmount();
  });

  test('renders a segment per stage once at least one stage has documents', async () => {
    const stages = [
      {stage: 'Initiation', status: 'complete', completionPercent: 100, documentCount: 1},
      {stage: 'Planning', status: 'in-progress', completionPercent: 40, documentCount: 2},
      {stage: 'Execution', status: 'not-started', completionPercent: null, documentCount: 0},
      {stage: 'Monitoring and Controlling', status: 'not-started', completionPercent: null, documentCount: 0},
      {stage: 'Closing', status: 'not-started', completionPercent: null, documentCount: 0},
    ];
    const {host, unmount} = await mount(<DocumentCompletionByStageBar stages={stages} />);
    const segments = [...host.querySelectorAll('.ph-stage-segment')];
    expect(segments).toHaveLength(5);
    expect(segments[0].className).toContain('status-complete');
    expect(segments[1].className).toContain('status-in-progress');
    expect(segments[2].className).toContain('status-not-started');
    await unmount();
  });
});

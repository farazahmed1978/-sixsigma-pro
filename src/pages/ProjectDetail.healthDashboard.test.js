import {readFileSync} from 'fs';
import path from 'path';

const source = readFileSync(path.join(__dirname, 'ProjectDetail.js'), 'utf8');

test('ProjectDetail imports and renders ProjectHealthDashboard for PM projects on Project Home', () => {
  expect(source).toContain(`import ProjectHealthDashboard from "../components/ProjectHealthDashboard";`);
  expect(source).toContain('suiteId === "project-management" ? (\n            <ProjectHealthDashboard');
});

test('the OE fallback dashboard (ph-intelligence + Phase workspaces) is preserved exactly once, not duplicated', () => {
  expect(source.match(/ph-intelligence/g)).toHaveLength(1);
  expect(source.match(/Phase workspaces/g)).toHaveLength(1);
});

test('ph-dashboard-grid (Recent Activity / Upcoming Tasks) renders for both suites, outside the suite-conditional block', () => {
  const dashboardGridIndex = source.indexOf('className="ph-dashboard-grid"');
  const conditionalCloseIndex = source.indexOf(')}\n          <div className="ph-dashboard-grid"');
  expect(dashboardGridIndex).toBeGreaterThan(-1);
  expect(conditionalCloseIndex).toBeGreaterThan(-1);
});

test('onOpenTab resolves a tab id to its label via tabDefinitions before calling setTab (Approvals link routing)', () => {
  expect(source).toContain('tabDefinitions.find((item) => item.id === tabId)');
  expect(source).toContain('if (target) setTab(target.label);');
});

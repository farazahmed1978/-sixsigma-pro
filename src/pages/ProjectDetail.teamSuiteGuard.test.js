import {readFileSync} from 'fs';
import path from 'path';

// PM regression check (Finding A): the Team tab's "Tollgate reviewer" column and eligibility
// badge are OE-only concepts that were added to a table shared by both suites. A PM project's
// Team tab must render exactly as it did before that OE addition — no tollgate column, no
// eligibility badges, and the original single "Email" column preserved.
const source = readFileSync(path.join(__dirname, 'ProjectDetail.js'), 'utf8');
const teamTabStart = source.indexOf('if (tab === "Team")');
const teamTabEnd = source.indexOf('if (tab === "Timeline")');
const teamTabSource = source.slice(teamTabStart, teamTabEnd);

test('the Team tab section is found and non-empty', () => {
  expect(teamTabStart).toBeGreaterThan(-1);
  expect(teamTabEnd).toBeGreaterThan(teamTabStart);
});

test('the tollgate-reviewer header column and eligibility badge exist, gated behind the OE suite check', () => {
  expect(teamTabSource).toContain('<th>Tollgate reviewer</th>');
  expect(teamTabSource).toContain('tollgateReviewerEligibility(member,user)');
  expect(teamTabSource).toContain('suiteId === "operational-excellence"');
});

test('a PM-suite project keeps the original plain "Email" column with no tollgate column alongside it', () => {
  expect(teamTabSource).toContain('<th>Email</th>');
});

test('the eligibility badge cell is wrapped by the OE suite guard immediately above it, not unconditional', () => {
  const badgeIndex = teamTabSource.indexOf('tollgateReviewerEligibility(member,user)');
  const precedingSlice = teamTabSource.slice(0, badgeIndex);
  const lastGuardIndex = precedingSlice.lastIndexOf('suiteId === "operational-excellence"');
  const lastClosedCellBeforeGuard = precedingSlice.lastIndexOf('</td>');
  expect(lastGuardIndex).toBeGreaterThan(-1);
  expect(lastGuardIndex).toBeGreaterThan(lastClosedCellBeforeGuard);
});

test('the header\'s OE-only two-column block sits behind the same suite check as the Email fallback', () => {
  const headerIndex = teamTabSource.indexOf('<th>Account email *</th>');
  const emailIndex = teamTabSource.indexOf('<th>Email</th>');
  const guardIndex = teamTabSource.lastIndexOf('suiteId === "operational-excellence" ? (', headerIndex);
  expect(headerIndex).toBeGreaterThan(-1);
  expect(emailIndex).toBeGreaterThan(headerIndex);
  expect(guardIndex).toBeGreaterThan(-1);
  expect(guardIndex).toBeLessThan(headerIndex);
});

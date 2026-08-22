import {readFileSync} from 'fs';
import path from 'path';

// PM regression check (Finding B, part 2): Worksheet.js's "Recommended analyses" / "Recently
// used" tool links must not inherit an OE workflow context (phase='Measure', origin, a
// completionTarget on an OE-only document route) when the active project is a PM project.
// toolWorkflow must resolve to null for any non-OE project, so analysisRoute() never encodes
// OE-only params onto a PM user's tool links.
const source = readFileSync(path.join(__dirname, 'Worksheet.js'), 'utf8');

test('Worksheet.js imports isSuite to gate the OE workflow-context fallback', () => {
  expect(source).toContain("import {isSuite} from '../foundation/lifecycle';");
});

test('toolWorkflow only builds an OE workflow context when the active project is OE; otherwise it is null', () => {
  const match = source.match(/toolWorkflow=([^;]+);/);
  expect(match).not.toBeNull();
  const expression = match[1];
  expect(expression).toContain("isSuite(activeProject,'operational-excellence')");
  expect(expression.trim().endsWith(':null')).toBe(true);
});

test('the OE workflow-context construction is the true branch of the isSuite ternary, not unconditional', () => {
  const match = source.match(/toolWorkflow=(activeProject&&isSuite\(activeProject,'operational-excellence'\)\?)(.*):null;/);
  expect(match).not.toBeNull();
  expect(match[2]).toContain('createOEWorkflowContext');
});

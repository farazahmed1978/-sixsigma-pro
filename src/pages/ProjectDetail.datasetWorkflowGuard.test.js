import {readFileSync} from 'fs';
import path from 'path';

// PM regression check (Finding B, part 1): the Datasets tab's "+ Add Dataset" / "Open" /
// "Open Worksheet" links must only carry the OE workflow-context (phase, origin,
// completionTarget pointing at an OE-only document route) for OE projects. A PM project must
// get a plain worksheet link with no OE workflow-context params, so Worksheet's own back-label
// resolves to the ordinary Project Hub breadcrumb instead of an OE phase name.
const source = readFileSync(path.join(__dirname, 'ProjectDetail.js'), 'utf8');
const datasetsTabStart = source.indexOf('if (tab === "Datasets")');
const datasetsTabEnd = source.indexOf('if (tab === "Analyses")');
const datasetsTabSource = source.slice(datasetsTabStart, datasetsTabEnd);

test('the Datasets tab section is found and non-empty', () => {
  expect(datasetsTabStart).toBeGreaterThan(-1);
  expect(datasetsTabEnd).toBeGreaterThan(datasetsTabStart);
});

test('every datasetWorkflowContext(project) call in the Datasets tab is gated by the OE suite check', () => {
  const contextCalls = datasetsTabSource.match(/datasetWorkflowContext\(project\)/g) || [];
  const suiteGuards = datasetsTabSource.match(/suiteId === "operational-excellence" \?/g) || [];
  expect(contextCalls.length).toBeGreaterThan(0);
  expect(suiteGuards.length).toBe(contextCalls.length);
});

test('a PM-suite project falls back to plain worksheet locations, not the OE workflow context', () => {
  expect(datasetsTabSource).toContain('newDatasetLocation(id)');
  expect(datasetsTabSource).toContain('worksheetDatasetLocation(id,dataset.id)');
});

test('the PM fallback never itself calls datasetWorkflowContext', () => {
  expect(/newDatasetLocation\(id\)\s*:\s*datasetWorkflowContext/.test(datasetsTabSource)).toBe(false);
  expect(/worksheetDatasetLocation\(id,dataset\.id\)\s*:\s*datasetWorkflowContext/.test(datasetsTabSource)).toBe(false);
});

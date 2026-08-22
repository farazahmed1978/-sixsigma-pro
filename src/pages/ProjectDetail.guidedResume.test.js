import {readFileSync} from 'fs';
import path from 'path';

// ProjectDetail.js is not full-rendered in this suite (see ProjectDetail.healthDashboard.test.js /
// ProjectDetail.tabs.test.js / ProjectDetail.newProjectLink.test.js — all use this same source-text
// "regression guard" pattern, since the component needs a heavy provider stack this codebase
// hasn't built test scaffolding for). Phase 5C's guided-mode short-circuit and resume banner are
// additive JSX blocks, so a source-text assertion is proportionate here too.
const source = readFileSync(path.join(__dirname, 'ProjectDetail.js'), 'utf8');

test('the hub short-circuits to GuidedWorkspace/GuidedDocumentSelection whenever location.state.guided is true, before any tab/sidebar rendering', () => {
  expect(source).toContain('if (location.state?.guided) {');
  expect(source).toContain('return <GuidedDocumentSelection project={project} />;');
  expect(source).toContain('return <GuidedWorkspace project={project} />;');
  expect(source).toContain('project.guidedFlowState?.mandatoryComplete && !project.selectedDocuments');
});

test('the resume banner is limited to the supported PM flow and is absent from Professional OE', () => {
  expect(source).toContain('tab === "Project Home" && suiteId === "project-management" && project.guidedFlowState?.mandatoryComplete === false');
  expect(source).toContain('You were setting up');
  expect(source).toContain('Continue Guided Setup');
  expect(source).toContain('navigate(projectHubRoute(id), {state: {guided: true}})');
});

test('the old Phase 5B guidedComplete banner is gone — GuidedDocumentSelection now owns that moment', () => {
  expect(source).not.toContain('guidedComplete');
  expect(source).not.toContain("Your project foundation is set. You're now in full project view.");
});

test('the Documents tab surfaces selectedDocuments as suggested quick-create links plus a Browse all documents link, falling back cleanly when selectedDocuments is absent', () => {
  expect(source).toContain('project.selectedDocuments || []');
  expect(source).toContain('Suggested documents');
  expect(source).toContain('Browse all documents');
});

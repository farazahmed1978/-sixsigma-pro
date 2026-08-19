import {readFileSync} from 'fs';
import path from 'path';

// ProjectDetail.js is not full-rendered in this suite (see ProjectDetail.healthDashboard.test.js /
// ProjectDetail.tabs.test.js — both use this same source-text "regression guard" pattern instead,
// since the component needs a heavy provider stack this codebase hasn't built test scaffolding
// for). Phase 5A's "Start a new project" link is a single additive line inside the existing
// .ph-breadcrumb block, so a source-text assertion is proportionate here too.
const source = readFileSync(path.join(__dirname, 'ProjectDetail.js'), 'utf8');

test('the Project Hub breadcrumb includes a "Start a new project" link that opens the guided entry card via ProjectsHome', () => {
  expect(source).toContain('Start a new project');
  expect(source).toContain(`navigate('/projects', {state: {openEntry: true}})`);
});

test('the existing breadcrumb (Projects link + project name) is preserved, not replaced', () => {
  expect(source).toContain('<Link to="/projects">Projects</Link>');
  expect(source).toContain('<strong>{project.name}</strong>');
});

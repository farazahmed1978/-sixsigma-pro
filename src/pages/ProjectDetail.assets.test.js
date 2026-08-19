import {TAB_DEFINITIONS, tabsForSuite} from './ProjectDetail';

test('Files and Assets is a tab for both suites, positioned right after Evidence Library', () => {
  ['operational-excellence', 'project-management'].forEach(suiteId => {
    const ids = tabsForSuite(suiteId).map(item => item.id);
    expect(ids).toContain('files-assets');
    expect(ids.indexOf('files-assets')).toBe(ids.indexOf('evidence-library') + 1);
  });
});

test('Files and Assets is declared once in TAB_DEFINITIONS with the expected label', () => {
  const matches = TAB_DEFINITIONS.filter(item => item.id === 'files-assets');
  expect(matches).toHaveLength(1);
  expect(matches[0].label).toBe('Files and Assets');
  expect(matches[0].suites).toEqual(expect.arrayContaining(['operational-excellence', 'project-management']));
});

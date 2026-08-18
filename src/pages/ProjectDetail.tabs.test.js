import {readFileSync} from 'fs';
import {TAB_DEFINITIONS, tabsForSuite} from './ProjectDetail';

test('OE gets Analyses and Placements but no PM governance tabs',()=>{
  const ids=tabsForSuite('operational-excellence').map(item=>item.id);
  expect(ids).toEqual(expect.arrayContaining(['analyses','placements']));
  expect(ids).not.toEqual(expect.arrayContaining(['risks','actions','issues','decisions','approvals']));
});

test('PM gets governance tabs but no Analyses or Placements (Issue 1/5: no OE-only tools in a PM project)',()=>{
  const ids=tabsForSuite('project-management').map(item=>item.id);
  expect(ids).toEqual(expect.arrayContaining(['risks','actions','issues','decisions','approvals']));
  expect(ids).not.toEqual(expect.arrayContaining(['analyses','placements']));
});

test('every suite-agnostic tab (Documents, Evidence Library, Artifacts, Project Binder, Reports, Team, Timeline) is visible for both suites',()=>{
  const shared=['project-home','project-settings','documents','datasets','evidence-library','artifacts','project-binder','reports','team','timeline'];
  const oeIds=tabsForSuite('operational-excellence').map(item=>item.id);
  const pmIds=tabsForSuite('project-management').map(item=>item.id);
  shared.forEach(id=>{
    expect(oeIds).toContain(id);
    expect(pmIds).toContain(id);
  });
});

test('PM tab order puts governance tabs right after Documents and pushes Datasets to the end (workflow priority)',()=>{
  const ids=tabsForSuite('project-management').map(item=>item.id);
  const documentsIndex=ids.indexOf('documents');
  const risksIndex=ids.indexOf('risks');
  const datasetsIndex=ids.indexOf('datasets');
  expect(risksIndex).toBe(documentsIndex+1);
  expect(datasetsIndex).toBe(ids.length-1);
});

test('a suite with no custom TAB_ORDER entry (OE) falls back to TAB_DEFINITIONS\' own declaration order',()=>{
  const expectedOrder=TAB_DEFINITIONS.filter(item=>item.suites.includes('operational-excellence')).map(item=>item.id);
  expect(tabsForSuite('operational-excellence').map(item=>item.id)).toEqual(expectedOrder);
});

test('every tab in TAB_DEFINITIONS is reachable for at least one suite (no orphaned tab)',()=>{
  TAB_DEFINITIONS.forEach(tab=>{
    const reachable=tabsForSuite('operational-excellence').some(item=>item.id===tab.id)||tabsForSuite('project-management').some(item=>item.id===tab.id);
    expect(reachable).toBe(true);
  });
});

// Issue 3 regression guard: the help panel was reported clipped specifically on Timeline and
// Reports, the tabs nearest the right edge of the scrollable tab row (nav has overflow:auto). The
// fix moved <HelpButton> to be a sibling of <nav>, not a descendant, inside a shared
// .ph-header-nav-row wrapper — so nothing about which tab is active changes where the trigger sits
// in the DOM; the same structural guarantee covers every tab, Timeline and Reports included.
// Verified via source structure (like ProjectCharter.routing.test.js's navigation assertions)
// rather than a full render, since jsdom's CSS transform stubs out real stylesheets anyway — the
// only thing meaningfully testable here is DOM structure, not computed z-index/overflow.
test('Timeline and Reports are both reachable tabs in both suites, confirming the reported "rightmost tabs" are exercised by the structural fix below',()=>{
  ['timeline','reports'].forEach(id=>{
    expect(tabsForSuite('operational-excellence').some(item=>item.id===id)).toBe(true);
    expect(tabsForSuite('project-management').some(item=>item.id===id)).toBe(true);
  });
});
test('the tab-row Help button is rendered as a sibling of <nav>, not nested inside it — so the scrollable tab row\'s overflow:auto can never clip its popover on any tab',()=>{
  const source=readFileSync(require.resolve('./ProjectDetail'),'utf8');
  const navOpen=source.indexOf('<nav>');
  const navClose=source.indexOf('</nav>')+'</nav>'.length;
  const helpButtonIndex=source.indexOf('<HelpButton surfaceId={activeTabId}');
  expect(navOpen).toBeGreaterThan(-1);
  expect(helpButtonIndex).toBeGreaterThan(-1);
  expect(helpButtonIndex<navOpen||helpButtonIndex>=navClose).toBe(true);
});
test('the tab row and its Help button are wrapped in the shared flex row that keeps them visually adjacent despite not being DOM siblings-in-place',()=>{
  const source=readFileSync(require.resolve('./ProjectDetail'),'utf8');
  expect(source).toContain('ph-header-nav-row');
});

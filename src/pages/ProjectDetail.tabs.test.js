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

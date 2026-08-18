import {createLifecycleRegistry,isSuite,lifecycleForProject,lifecycleStageLabels,resolveLifecycleStage,sortByLifecycle} from './lifecycle';
test('OE remains ordered DMAIC',()=>expect(lifecycleStageLabels(lifecycleForProject({methodology:'lean-six-sigma'}))).toEqual(['Define','Measure','Analyze','Improve','Control']));
test('PM resolves its native lifecycle',()=>expect(lifecycleStageLabels(lifecycleForProject({suiteId:'project-management'}))).toEqual(['Initiation','Planning','Execution','Monitoring & Controlling','Closing']));
test('future suite registers without changing shared consumers',()=>{const registry=createLifecycleRegistry().register({id:'supply-chain',label:'Supply Chain',stages:[{id:'plan',label:'Plan'},{id:'source',label:'Source'},{id:'deliver',label:'Deliver'}]});const lifecycle=registry.get('supply-chain');expect(sortByLifecycle([{phase:'Deliver'},{phase:'Plan'},{phase:'Source'}],lifecycle).map(x=>x.phase)).toEqual(['Plan','Source','Deliver'])});
test('legacy fields resolve and unknown historical values are preserved',()=>{const lifecycle=lifecycleForProject({methodology:'dmaic'});expect(resolveLifecycleStage({dmaic_phase:'Measure'},lifecycle).label).toBe('Measure');expect(resolveLifecycleStage({phase:'Custom Gate'},lifecycle)).toMatchObject({label:'Custom Gate',unresolved:true})});

// isSuite is the single central suite-membership check every suite-aware surface (Project Hub
// tabs, AnalysisLauncher, ReportBuilder, Evidence Library copy) is meant to call instead of each
// independently re-deriving or hardcoding a suite comparison — these tests pin its contract.
test('isSuite matches a project to its own suite and rejects the other suite',()=>{
  const pmProject={suiteId:'project-management'},oeProject={methodology:'lean-six-sigma'};
  expect(isSuite(pmProject,'project-management')).toBe(true);
  expect(isSuite(pmProject,'operational-excellence')).toBe(false);
  expect(isSuite(oeProject,'operational-excellence')).toBe(true);
  expect(isSuite(oeProject,'project-management')).toBe(false);
});
test('isSuite recognizes every legacy suite alias the same way resolveProjectSuiteId does',()=>{
  expect(isSuite({methodology:'pmp'},'project-management')).toBe(true);
  expect(isSuite({methodology:'hybrid'},'operational-excellence')).toBe(true);
  expect(isSuite({methodology:'dmaic'},'operational-excellence')).toBe(true);
});
test('isSuite defaults an unrecognized or missing suite to operational-excellence, matching lifecycleForProject\'s own fallback',()=>{
  expect(isSuite({},'operational-excellence')).toBe(true);
  expect(isSuite(undefined,'operational-excellence')).toBe(true);
});

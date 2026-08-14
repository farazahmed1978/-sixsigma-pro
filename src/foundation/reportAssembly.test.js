import {assembleReportModel,REPORT_PHASES} from './reportAssembly';
import {reportIdentity} from '../context/ReportContext';

const fixture=[
 {id:'define-doc',documentId:'charter',title:'Define document',phase:'Define',documentSnapshot:{values:{summary:'Defined'}}},
 {id:'measure-capability',analysisId:'cap-1',title:'Capability',toolId:'capability-analysis',statsSummary:{Cpk:1.4}},
 {id:'analyze-regression',analysisId:'reg-1',title:'Regression',toolId:'regression',chartImage:'data:image/jpeg;base64,x'},
 {id:'analyze-anova',analysisId:'anova-1',title:'ANOVA',toolId:'anova',rawData:[{group:'A',mean:1}]},
 {id:'improve-doe',analysisId:'doe-1',title:'DOE',toolId:'doe-rsm',interpretation:'Model result'},
 {id:'control-chart',analysisId:'spc-1',title:'Control Chart',toolId:'control-chart'}
];

test('complete report assembly contains every mixed item in DMAIC order',()=>{const model=assembleReportModel(fixture);expect(model.items.map(item=>item.id)).toEqual(fixture.map(item=>item.id));expect(model.sections.map(section=>section.phase)).toEqual(REPORT_PHASES);expect(model.items).toHaveLength(6)});
test('multiple same-phase items and explicit reorder are preserved',()=>{const reordered=[fixture[0],fixture[1],fixture[3],fixture[2],fixture[4],fixture[5]],model=assembleReportModel(reordered);expect(model.sections.find(section=>section.phase==='Analyze').items.map(item=>item.id)).toEqual(['analyze-anova','analyze-regression'])});
test('empty phases remain deterministic and malformed legacy items are skipped safely',()=>{const model=assembleReportModel([fixture[2],null,{id:'broken'},fixture[5]]);expect(model.items.map(item=>item.id)).toEqual(['analyze-regression','control-chart']);expect(model.sections.find(section=>section.phase==='Measure').items).toEqual([]);expect(model.diagnostics).toHaveLength(2)});
test('long and legacy report content remains in the model',()=>{const long='Long interpretation '.repeat(1000),model=assembleReportModel([{id:'legacy',title:'Legacy item',interpretation:long},{id:'new',title:'Report-only',analysisId:'canonical',toolId:'regression',reportKey:'p:regression:Report-only'}]);expect(model.items[0].interpretation).toBe(long);expect(model.items.map(item=>item.id)).toEqual(['legacy','new'])});
test('canonical report identity deduplicates report-only and project-plus-report records',()=>{const reportOnly={projectId:'p1',analysisId:'a1'},projectAndReport={projectId:'p1',analysisId:'a1',placementId:'placement-1'};expect(reportIdentity(reportOnly)).toBe(reportIdentity(projectAndReport))});
test('PM report sections use native stages without DMAIC relabeling',()=>{const project={suiteId:'project-management',methodology:'project-management'},model=assembleReportModel([{id:'close',title:'Closure',phase:'Closing'},{id:'plan',title:'Plan',lifecyclePhase:'Planning'},{id:'execute',title:'Execution',phase:'Execution'}],project);expect(model.sections.map(section=>section.phase)).toEqual(['Initiation','Planning','Execution','Monitoring & Controlling','Closing']);expect(model.items.map(item=>item.phase)).toEqual(['Planning','Execution','Closing']);expect(model.items.some(item=>REPORT_PHASES.includes(item.phase))).toBe(false)});
test('unproven historical phase is preserved rather than invented',()=>{const model=assembleReportModel([{id:'old',title:'Old record',phase:'Gate X'}],{suiteId:'project-management'});expect(model.items[0].phase).toBe('Gate X');expect(model.sections.at(-1).phase).toBe('Gate X')});

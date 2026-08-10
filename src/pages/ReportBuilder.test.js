import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {assembleReportModel} from '../foundation/reportAssembly';
import {allPrintArtifactIds,createPrintModel,PRINT_MODES} from '../foundation/reportPrint';
import {inspectReportPrintDom,ReportPrintDocument} from './ReportPrintDocument';

const chart='data:image/jpeg;base64,chart';
const fixture=[
 {id:'define-charter',title:'Project Charter',phase:'Define',documentId:'charter'},
 {id:'define-voc',title:'VOC Summary',phase:'Define',reportKey:'report-only-voc'},
 {id:'measure-msa',title:'Gage R&R',phase:'Measure',analysisId:'msa-1',toolId:'msa'},
 {id:'measure-capability',title:'Capability Analysis',phase:'Measure',analysisId:'cap-1',toolId:'capability-analysis'},
 {id:'analyze-anova',title:'ANOVA',phase:'Analyze',analysisId:'anova-1',toolId:'anova',rawData:[{group:'A',mean:2.4}],includeRawData:true},
 {id:'analyze-regression',title:'Regression Analysis',phase:'Analyze',analysisId:'reg-1',toolId:'regression',chartImage:chart,statsSummary:{rSquared:.91}},
 {id:'analyze-distribution',title:'Distribution Analysis',phase:'Analyze',analysisId:'dist-1',toolId:'distribution-analysis',chartImage:chart},
 {id:'analyze-legacy',title:'Legacy Finding',phase:'Analyze',interpretation:'Long legacy content '.repeat(300)},
 {id:'improve-doe',title:'DOE / RSM',phase:'Improve',analysisId:'doe-1',toolId:'doe-rsm',chartImage:chart},
 {id:'improve-plan',title:'Improvement Plan',phase:'Improve',documentId:'improvement-plan'},
 {id:'control-chart',title:'Control Chart',phase:'Control',analysisId:'spc-1',toolId:'control-chart',chartImage:chart},
 {id:'control-plan',title:'Control Plan',phase:'Control',documentId:'control-plan'}
];

const renderPrintDom=reportModel=>{const host=document.createElement('div');host.innerHTML=renderToStaticMarkup(<ReportPrintDocument reportTitle="Regression report" preparedBy="QA" project={{name:'Print QA'}} reportModel={reportModel}/>);return host};

test('entire report selects and renders all 12 artifacts in canonical DMAIC order',()=>{const report=assembleReportModel([...fixture,{title:'Malformed without id'},null]),print=createPrintModel(report,PRINT_MODES.ENTIRE),diagnostics=inspectReportPrintDom(renderPrintDom(print));expect(report.items).toHaveLength(12);expect(report.diagnostics).toHaveLength(2);expect(allPrintArtifactIds(report)).toEqual(fixture.map(item=>item.id));expect(print.items).toHaveLength(12);expect(diagnostics).toMatchObject({artifactCount:12,artifactIds:fixture.map(item=>item.id),phaseCount:5,phases:['Define','Measure','Analyze','Improve','Control'],duplicateIds:[]})});

test('selected items 2, 5, 6, and 11 render exactly once in report-relative order',()=>{const report=assembleReportModel(fixture),selected=[fixture[10].id,fixture[5].id,fixture[1].id,fixture[4].id],print=createPrintModel(report,PRINT_MODES.SELECTED,selected),diagnostics=inspectReportPrintDom(renderPrintDom(print));expect(diagnostics.artifactIds).toEqual([fixture[1].id,fixture[4].id,fixture[5].id,fixture[10].id]);expect(diagnostics.artifactCount).toBe(4)});

test('select all, clear all, same-phase, legacy, and placement variants are handled without mutation',()=>{const source=fixture.map(item=>({...item})),before=JSON.stringify(source),report=assembleReportModel(source),all=createPrintModel(report,PRINT_MODES.SELECTED,allPrintArtifactIds(report)),clear=createPrintModel(report,PRINT_MODES.SELECTED,[]),analyze=createPrintModel(report,PRINT_MODES.SELECTED,['analyze-anova','analyze-regression','analyze-legacy']);expect(all.items).toHaveLength(12);expect(clear.items).toHaveLength(0);expect(analyze.items.map(item=>item.id)).toEqual(['analyze-anova','analyze-regression','analyze-legacy']);expect(all.items.some(item=>item.reportKey)).toBe(true);expect(all.items.some(item=>item.documentId)).toBe(true);expect(all.items.some(item=>item.id==='analyze-legacy')).toBe(true);expect(JSON.stringify(source)).toBe(before)});

test('dedicated document contains saved charts, printable table, stats, and long content',()=>{const print=createPrintModel(assembleReportModel(fixture),PRINT_MODES.ENTIRE),host=renderPrintDom(print);expect(host.querySelectorAll('.report-print-chart')).toHaveLength(4);expect(host.querySelectorAll('.report-print-table')).toHaveLength(1);expect(host.querySelector('.report-print-stat').textContent).toContain('0.91');expect(host.textContent).toContain('Long legacy content');expect(host.querySelector('.report-print-table th').textContent).toBe('Group')});

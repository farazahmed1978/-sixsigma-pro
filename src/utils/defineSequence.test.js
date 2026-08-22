import {DEFINE_TEMPLATES} from '../config/defineTemplates';
import {defineAdvanceState,defineTollgateRoute,dmaicSequence,nextDefineArtifact,phaseTollgateRoute,previousDmaicArtifact,projectDocumentRoute} from './defineSequence';

const template=id=>DEFINE_TEMPLATES.find(item=>item.id===id);
const completeValues=artifact=>Object.fromEntries(artifact.sections.flatMap(section=>section.fields).filter(field=>field.required!==false).map(field=>[field.id,field.type==='table'?[{id:'row'}]:'complete value']));

test('Professional Define preserves the established governed sequence',()=>{
  expect(nextDefineArtifact('charter')).toEqual(expect.objectContaining({id:'sipoc',phase:'Define'}));
  expect(nextDefineArtifact('sipoc')).toEqual(expect.objectContaining({id:'stakeholder-register',phase:'Define'}));
  expect(nextDefineArtifact('stakeholder-register')).toEqual(expect.objectContaining({id:'business-case',phase:'Define'}));
  expect(nextDefineArtifact('business-case')).toEqual(expect.objectContaining({id:'voc',phase:'Define'}));
});

test('Professional Define ends at its Tollgate and never advances directly to Measure',()=>{
  const artifact=template('voc');
  const state=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:completeValues(artifact)});
  expect(state.next).toBeNull();
  expect(nextDefineArtifact('voc')).toBeNull();
  expect(defineTollgateRoute('project-1')).toBe('/projects/project-1?tab=tollgates&phase=Define');
});

test('Define routes are project-qualified professional workspaces',()=>{
  ['sipoc','voc','ctq-tree'].forEach(id=>expect(projectDocumentRoute('project-1',id)).toBe(`/projects/project-1/documents/${id}`));
  expect(projectDocumentRoute('project-1','voc')).not.toContain('guided');
});

test('incomplete Define artifact reports exact required blockers',()=>{
  const artifact=template('voc');
  const state=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:{}});
  expect(state.missing).toEqual(expect.arrayContaining(artifact.sections.flatMap(section=>section.fields).filter(field=>field.required!==false).map(field=>field.label)));
});

test('Measure uses its core cadence and ends at its Tollgate',()=>{
  expect(nextDefineArtifact('data-collection-plan')).toEqual(expect.objectContaining({id:'operational-definitions'}));
  expect(nextDefineArtifact('measurement-plan')).toBeNull();
  expect(nextDefineArtifact('operational-definitions')).toEqual(expect.objectContaining({id:'project-dataset',kind:'action'}));
  expect(nextDefineArtifact('baseline-metrics')).toBeNull();
  expect(phaseTollgateRoute('p1','Measure')).toBe('/projects/p1?tab=tollgates&phase=Measure');
});

test('every remaining phase is bounded and reverse navigation stays within its cadence',()=>{
  expect(nextDefineArtifact('statistical-analysis-summary')).toBeNull();
  expect(nextDefineArtifact('action-plan')).toBeNull();
  expect(previousDmaicArtifact('operational-definitions')).toEqual(expect.objectContaining({id:'data-collection-plan'}));
  expect(nextDefineArtifact('lessons-learned')).toBeNull();
  expect(dmaicSequence().at(-1).id).toBe('lessons-learned');
});

test('SIPOC successor route opens the canonical Stakeholder Register record',()=>{
  expect(projectDocumentRoute('project-1',nextDefineArtifact('sipoc').id)).toBe('/projects/project-1/documents/stakeholder-register');
});

test('Business Case successor exposes the professional Voice of Customer label',()=>{
  expect(nextDefineArtifact('business-case').sequenceLabel).toBe('Voice of Customer');
});

test('CTQ remains available without changing the governed Define boundary',()=>{
  expect(previousDmaicArtifact('ctq-tree')).toBeNull();
  expect(nextDefineArtifact('ctq-tree')).toBeNull();
});

test('Project Charter has no preceding professional Define document',()=>{
  expect(previousDmaicArtifact('charter')).toBeNull();
});

test('Define Tollgate routing preserves the active project identifier',()=>{
  expect(defineTollgateRoute('project-with-spaces')).toContain('/projects/project-with-spaces');
});

test('the first Measure document does not provide a previous cross-phase shortcut',()=>{
  expect(previousDmaicArtifact('data-collection-plan')).toBeNull();
  expect(nextDefineArtifact('voc')).toBeNull();
});

test('Business Case remains in Define without becoming a Measure shortcut',()=>{
  expect(template('business-case')).toEqual(expect.objectContaining({phase:'Define'}));
  expect(nextDefineArtifact('business-case')).toEqual(expect.objectContaining({id:'voc'}));
});

test('Stakeholder Register remains in Define without becoming a Measure shortcut',()=>{
  expect(template('stakeholder-register')).toEqual(expect.objectContaining({phase:'Define'}));
  expect(nextDefineArtifact('stakeholder-register')).toEqual(expect.objectContaining({id:'business-case'}));
});

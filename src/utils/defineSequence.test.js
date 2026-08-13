import {DEFINE_TEMPLATES} from '../config/defineTemplates';
import {createDocument,documentIdFor} from './documentModel';
import {defineAdvanceState,dmaicSequence,nextDefineArtifact,projectDocumentRoute} from './defineSequence';

const template=id=>DEFINE_TEMPLATES.find(item=>item.id===id);
const completeValues=artifact=>Object.fromEntries(artifact.sections.flatMap(section=>section.fields).filter(field=>field.required!==false).map(field=>[field.id,field.type==='table'?[{id:'row'}]:'complete value']));

test('Charter names SIPOC as its next configured artifact',()=>{
  expect(nextDefineArtifact('charter').name).toBe('SIPOC');
});

test('SIPOC names and routes directly to Stakeholder Register',()=>{
  const artifact=template('sipoc');
  const state=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:completeValues(artifact)});
  expect(state.label).toBe('Stakeholder Register');
  expect(projectDocumentRoute('project-1',state.next.id)).toBe('/projects/project-1/documents/stakeholder-register');
});

test('completed Stakeholder Register advances directly to Business Case',()=>{
  const artifact=template('stakeholder-register');
  const state=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:completeValues(artifact)});
  expect(state.missing).toEqual([]);
  expect(state.next.name).toBe('Business Case');
  expect(projectDocumentRoute('project-1',state.next.id)).toBe('/projects/project-1/documents/business-case');
});

test('successor route is stable so an existing saved document is reopened',()=>{
  const successor=nextDefineArtifact('sipoc');
  const existing={id:documentIdFor(successor.id),projectId:'project-1',templateId:successor.id,values:{processName:'Saved SIPOC successor'}};
  expect(projectDocumentRoute('project-1',successor.id)).toBe('/projects/project-1/documents/stakeholder-register');
  expect(createDocument(successor,'project-1',existing).id).toBe(existing.id);
  expect(createDocument(successor,'project-1',existing).values.processName).toBe('Saved SIPOC successor');
});

test('incomplete artifact reports the exact required blockers',()=>{
  const artifact=template('stakeholder-register');
  const state=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:{}});
  expect(state.missing.length).toBeGreaterThan(0);
  expect(state.missing).toEqual(expect.arrayContaining(artifact.sections.flatMap(section=>section.fields).filter(field=>field.required!==false).map(field=>field.label)));
});

test('end of Define sequence advances to the canonical first Measure artifact',()=>{
  const artifact=template('ctq-tree');
  const state=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:completeValues(artifact)});
  expect(state.next).toEqual(expect.objectContaining({id:'data-collection-plan',name:'Data Collection Plan',phase:'Measure'}));
  expect(state.label).toBe('Data Collection Plan');
  expect(state.label).not.toBe('Next document');
});

test('Business Case routes to the registered VOC workspace and reuses its canonical identity',()=>{
  const successor=nextDefineArtifact('business-case');
  const existing={id:documentIdFor('voc'),projectId:'project-1',templateId:'voc',values:{researchOwner:'Saved owner'}};
  expect(successor.id).toBe('voc');
  expect(successor.sequenceLabel).toBe('Voice of Customer');
  expect(projectDocumentRoute('project-1',successor.id)).toBe('/projects/project-1/documents/voc');
  expect(createDocument(successor,'project-1',existing)).toEqual(expect.objectContaining({id:'document-voc',templateId:'voc',values:{researchOwner:'Saved owner'}}));
});

test('VOC advances to CTQ Tree and CTQ Tree ends the sequence',()=>{
  const voc=template('voc');
  const vocState=defineAdvanceState({template:voc,activeIndex:voc.sections.length-1,values:completeValues(voc)});
  expect(vocState.label).toBe('CTQ Tree');
  expect(projectDocumentRoute('project-1',vocState.next.id)).toBe('/projects/project-1/documents/ctq-tree');
  expect(nextDefineArtifact('ctq-tree').id).toBe('data-collection-plan');
});

test('guided progression describes incomplete status without changing document values',()=>{
  const artifact=template('business-case'),values={executiveSummary:'Work in progress'};
  const state=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values});
  expect(state.completion).toBeLessThan(100);
  expect(state.missingDetails.length).toBe(state.missing.length);
  expect(state.missingDetails[0]).toEqual(expect.objectContaining({section:expect.any(String),field:expect.any(String)}));
  expect(values).toEqual({executiveSummary:'Work in progress'});
});

test('all DMAIC phase boundaries resolve through the configured template registries',()=>{
  expect(nextDefineArtifact('measurement-plan')).toEqual(expect.objectContaining({id:'hypothesis-plan',phase:'Analyze'}));
  expect(nextDefineArtifact('statistical-analysis-summary')).toEqual(expect.objectContaining({id:'factorial-plan',phase:'Improve'}));
  expect(nextDefineArtifact('action-plan')).toEqual(expect.objectContaining({id:'control-plan',phase:'Control'}));
  expect(nextDefineArtifact('project-closure')).toBeNull();
  expect(dmaicSequence().at(-1).id).toBe('project-closure');
});

test('incomplete CTQ Tree exposes guided status while retaining its Measure successor',()=>{
  const artifact=template('ctq-tree'),state=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:{}});
  expect(state.completion).toBeLessThan(100);
  expect(state.missingDetails.length).toBeGreaterThan(0);
  expect(projectDocumentRoute('project-1',state.next.id)).toBe('/projects/project-1/documents/data-collection-plan');
});

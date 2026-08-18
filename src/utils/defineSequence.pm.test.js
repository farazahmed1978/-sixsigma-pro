import {PMP_TEMPLATES} from '../config/pmpTemplates';
import {defineAdvanceState,nextDmaicArtifact,previousDmaicArtifact,sequenceForProject} from './defineSequence';

const pmProject={id:'pm-project-1',methodology:'pmp'};
const oeProject={id:'oe-project-1',methodology:'lean-six-sigma'};
const template=id=>PMP_TEMPLATES.find(item=>item.id===id);
const completeValues=artifact=>Object.fromEntries(artifact.sections.flatMap(section=>section.fields).filter(field=>field.required!==false).map(field=>[field.id,field.type==='table'?[{id:'row'}]:'complete value']));

test('a PM project resolves a non-empty document sequence spanning all five PMBOK stages plus the shared lead-in, distinct from the DMAIC sequence',()=>{
  const sequence=sequenceForProject(pmProject);
  expect(sequence.length).toBe(PMP_TEMPLATES.length+3);
  expect(sequence.map(item=>item.pmpLifecycle).filter(Boolean)).toEqual(expect.arrayContaining(['Initiation','Planning','Execution','Monitoring & Controlling','Closing']));
  expect(sequence.some(item=>item.id==='data-collection-plan')).toBe(false);
});

test('Charter, Stakeholder Register, and Business Case lead PM\'s sequence, same as they lead OE\'s, ahead of the PMP_TEMPLATES catalog',()=>{
  const sequence=sequenceForProject(pmProject);
  expect(sequence.slice(0,3).map(item=>item.id)).toEqual(['charter','stakeholder-register','business-case']);
  expect(sequence[3].id).toBe('benefits-management-plan');
});

test('without a project argument, the sequence functions default to the OE sequence (backward compatible)',()=>{
  expect(nextDmaicArtifact('assumption-log')).toBeNull();
  expect(previousDmaicArtifact('project-management-plan')).toBeNull();
});

test('a PM document at the start of the sequence has no previous artifact',()=>{
  expect(previousDmaicArtifact('charter',pmProject)).toBeNull();
});

test('opening Project Charter under a PM project advances into the shared lead-in, not OE\'s SIPOC',()=>{
  expect(nextDmaicArtifact('charter',pmProject)).toEqual(expect.objectContaining({id:'stakeholder-register'}));
  expect(nextDmaicArtifact('stakeholder-register',pmProject)).toEqual(expect.objectContaining({id:'business-case'}));
  expect(nextDmaicArtifact('business-case',pmProject)).toEqual(expect.objectContaining({id:'benefits-management-plan',pmpLifecycle:'Initiation'}));
  expect(previousDmaicArtifact('benefits-management-plan',pmProject)).toEqual(expect.objectContaining({id:'business-case'}));
});

test('opening Project Charter under an OE project is unaffected and still advances to SIPOC (regression)',()=>{
  expect(nextDmaicArtifact('charter',oeProject)).toEqual(expect.objectContaining({id:'sipoc'}));
});

test('a PM document at the end of the sequence has no next artifact',()=>{
  expect(nextDmaicArtifact('archive-checklist',pmProject)).toBeNull();
});

test('PM documents advance within a stage and across the Initiation -> Planning boundary',()=>{
  expect(nextDmaicArtifact('benefits-management-plan',pmProject)).toEqual(expect.objectContaining({id:'assumption-log'}));
  expect(nextDmaicArtifact('assumption-log',pmProject)).toEqual(expect.objectContaining({id:'project-management-plan',pmpLifecycle:'Planning'}));
  expect(previousDmaicArtifact('project-management-plan',pmProject)).toEqual(expect.objectContaining({id:'assumption-log',pmpLifecycle:'Initiation'}));
});

test('PM documents cross the Planning -> Execution -> Monitoring & Controlling -> Closing boundaries in both directions',()=>{
  [['change-management-plan','issue-log'],['team-performance-reviews','status-report'],['kpi-dashboard','final-project-report']].forEach(([from,to])=>{
    expect(nextDmaicArtifact(from,pmProject)).toEqual(expect.objectContaining({id:to}));
    expect(previousDmaicArtifact(to,pmProject)).toEqual(expect.objectContaining({id:from}));
  });
});

test('a PM document opened without project context (e.g. under an OE project) gets no sequence neighbors, not a crash',()=>{
  expect(nextDmaicArtifact('assumption-log',oeProject)).toBeNull();
  expect(previousDmaicArtifact('project-management-plan',oeProject)).toBeNull();
});

test('the completeness gate (progressionWarning) works for a PM document at the end of its section list, same as OE',()=>{
  const artifact=template('assumption-log');
  const incomplete=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:{},project:pmProject});
  expect(incomplete.missing.length).toBeGreaterThan(0);
  expect(incomplete.next).toEqual(expect.objectContaining({id:'project-management-plan'}));
  const complete=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:completeValues(artifact),project:pmProject});
  expect(complete.missing).toEqual([]);
  expect(complete.next).toEqual(expect.objectContaining({id:'project-management-plan'}));
  expect(complete.label).toBe(complete.next.sequenceLabel);
});

test('the last PM document in the sequence reports no further next artifact',()=>{
  const artifact=template('archive-checklist');
  const state=defineAdvanceState({template:artifact,activeIndex:artifact.sections.length-1,values:completeValues(artifact),project:pmProject});
  expect(state.next).toBeNull();
});

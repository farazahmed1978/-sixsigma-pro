import {buildProjectReviewModel} from './ProjectBinder';

const pmProject={id:'pm-1',suiteId:'project-management',methodology:'pmp',name:'PM Project'};

// Charter, Business Case, and Stakeholder Register are shared documents saved with a static
// Define-phase template.phase (the same convention DocumentWorkspace.js and utils/projectReport.js
// already follow). Before the resolvePhase fix, that phase matched no PM lifecycle stage, so these
// three vanished from every PM stage's phaseItems() — this test locks in that they now resolve to
// the PM suite's first stage (Initiation), the same way the per-document Print button's displayPhase
// already does.
test('Charter, Business Case, and Stakeholder Register resolve to the PM suite\'s first stage, not nowhere',()=>{
  const model=buildProjectReviewModel(
    {...pmProject,charter:{projectSummary:'Reduce cycle time.'}},
    {documents:[
      {id:'document-business-case',templateId:'business-case',title:'Business Case',phase:'Define',values:{businessCase:'Customers wait too long.'}},
      {id:'document-stakeholder-register',templateId:'stakeholder-register',title:'Stakeholder Register',phase:'Define',values:{items:[{id:'r1',name:'Sponsor'}]}},
    ]},
  );
  const charterItem=model.items.find(item=>item.templateId==='charter');
  const businessCaseItem=model.items.find(item=>item.templateId==='business-case');
  const stakeholderItem=model.items.find(item=>item.templateId==='stakeholder-register');
  expect(charterItem.phase).toBe('Initiation');
  expect(businessCaseItem.phase).toBe('Initiation');
  expect(stakeholderItem.phase).toBe('Initiation');
});

test('a generic PM document keeps resolving by its own template.phase, unaffected by the shared-document fix',()=>{
  const model=buildProjectReviewModel(pmProject,{documents:[{id:'document-wbs',templateId:'wbs',title:'WBS',phase:'Planning',values:{}}]});
  expect(model.items.find(item=>item.templateId==='wbs').phase).toBe('Planning');
});

test('an OE project\'s Charter still resolves to Define, unaffected by the PM-only fix (regression)',()=>{
  const model=buildProjectReviewModel({id:'oe-1',suiteId:'operational-excellence',charter:{projectSummary:'x'}},{documents:[]});
  expect(model.items.find(item=>item.templateId==='charter').phase).toBe('Define');
});

// PM stage-readiness checks: requiredDocs previously had no PM entries at all, so PM stage
// readiness always reported "complete" regardless of what existed. Each PM stage now requires a
// minimum SET of documents (all of them, not just one) to read complete.
test('PM stage readiness requires every minimum document for a stage, not just one of them',()=>{
  const withOnlyCharter=buildProjectReviewModel(
    {...pmProject,charter:{projectSummary:'x'}},
    {documents:[]},
  );
  const initiationCheck=withOnlyCharter.checks.find(check=>check.id==='stage-Initiation');
  expect(initiationCheck.status).toBe('missing');
  expect(initiationCheck.action).toContain('Business case');

  const withBoth=buildProjectReviewModel(
    {...pmProject,charter:{projectSummary:'x'}},
    {documents:[{id:'document-business-case',templateId:'business-case',title:'Business Case',phase:'Define',values:{}}]},
  );
  const initiationCheckComplete=withBoth.checks.find(check=>check.id==='stage-Initiation');
  expect(initiationCheckComplete.status).not.toBe('missing');
});

test('a PM project with no documents at all reports every PM stage as missing its required documents',()=>{
  const model=buildProjectReviewModel(pmProject,{documents:[]});
  ['stage-Initiation','stage-Planning','stage-Execution','stage-Monitoring & Controlling','stage-Closing'].forEach(id=>{
    expect(model.checks.find(check=>check.id===id).status).toBe('missing');
  });
});

test('a PM project with every required document present reports every PM stage as ready',()=>{
  const requiredTemplateIds=['business-case','wbs','risk-register','schedule-baseline','issue-log','action-item-log','status-report','evm-dashboard','project-closure-report','lessons-learned-report'];
  const documents=requiredTemplateIds.map(templateId=>({id:`document-${templateId}`,templateId,title:templateId,phase:'Planning',values:{}}));
  const model=buildProjectReviewModel({...pmProject,charter:{projectSummary:'x'}},{documents});
  ['stage-Initiation','stage-Planning','stage-Execution','stage-Monitoring & Controlling','stage-Closing'].forEach(id=>{
    expect(model.checks.find(check=>check.id===id).status).not.toBe('missing');
  });
});

// An OE project's requiredDocs (a single id per phase) must behave identically to before — the
// .some()->.every() change is a no-op for single-element arrays.
test('OE stage readiness is unaffected by the PM requiredDocs additions (regression)',()=>{
  const model=buildProjectReviewModel({id:'oe-1',suiteId:'operational-excellence'},{documents:[{id:'document-charter',templateId:'charter',title:'Charter',phase:'Define',values:{}}]});
  expect(model.checks.find(check=>check.id==='stage-Define').status).not.toBe('missing');
  expect(model.checks.find(check=>check.id==='stage-Measure').status).toBe('missing');
});

// Purpose-built PM narratives: a PM project must get its own summaries object (keyed by the 5
// Focus Areas), not the generic "connected asset(s)" placeholder every PM stage got before.
test('a PM project gets purpose-built Focus Area narratives, not the generic connected-assets placeholder',()=>{
  const model=buildProjectReviewModel(pmProject,{documents:[]});
  expect(Object.keys(model.summaries)).toEqual(['Initiation','Planning','Execution','Monitoring & Controlling','Closing']);
  const labels=model.summaries.Initiation.map(([label])=>label);
  expect(labels).toEqual(['Mandate and business case','Benefits and value case','Stakeholders identified']);
  expect(JSON.stringify(model.summaries)).not.toContain('connected asset');
});

test('an OE project keeps its own DMAIC narratives, unaffected by the PM narrative addition (regression)',()=>{
  const model=buildProjectReviewModel({id:'oe-1',suiteId:'operational-excellence'},{documents:[]});
  expect(Object.keys(model.summaries)).toEqual(['Define','Measure','Analyze','Improve','Control']);
});

export const SHARED_FIELD_REGISTRY=Object.freeze({
  projectName:{targets:['projectName']},sponsor:{targets:['sponsor','projectSponsor']},owner:{targets:['owner','projectOwner','projectManager']},processOwner:{targets:['processOwner']},startDate:{targets:['startDate']},targetDate:{targets:['targetDate','endDate']},status:{targets:['status']},budget:{targets:['budget']},businessCaseSummary:{targets:['businessCase','businessCaseSummary','executiveSummary'],source:'Project Charter'},goalSummary:{targets:['goal','goalStatement'],source:'Project Charter'},scopeSummary:{targets:['scope','scopeSummary'],source:'Project Charter'},financialImpact:{targets:['financialImpact'],source:'Project Charter'},stakeholders:{targets:['stakeholders'],source:'Project Charter'},
});

export const ARTIFACT_KIND_RULES=Object.freeze({
  document:{cardinality:'singleton'},charter:{cardinality:'singleton'},analysis:{cardinality:'repeatable'},toolOutput:{cardinality:'repeatable'},dataset:{cardinality:'repeatable'},report:{cardinality:'singleton'},
});

export const sharedFieldForTarget=target=>Object.entries(SHARED_FIELD_REGISTRY).find(([,rule])=>rule.targets.includes(target))?.[0]||null;
export const artifactDefinition=({kind='document',template})=>({kind,canonicalType:template?.id||kind,title:template?.name||kind,phase:template?.phase||'',cardinality:ARTIFACT_KIND_RULES[template?.id]||ARTIFACT_KIND_RULES[kind]||{cardinality:'repeatable'}});
export const matchingSharedFields=(template,shared={})=>template.sections.flatMap(section=>section.fields).map(field=>({field,sharedKey:sharedFieldForTarget(field.id)})).filter(item=>item.sharedKey&&shared[item.sharedKey]!==undefined&&String(shared[item.sharedKey]??'').trim()).map(item=>({source:SHARED_FIELD_REGISTRY[item.sharedKey].source||'Project',sharedKey:item.sharedKey,targetField:item.field.id,label:item.field.label,value:shared[item.sharedKey]}));
export const existingProjectArtifact=({definition,project})=>definition.cardinality.cardinality==='singleton'?(definition.canonicalType==='charter'?project.charter:project.documents?.[`document-${definition.canonicalType}`])||null:null;
export const artifactContextDecision=({mode,projectId='',instanceId=''})=>({mode,projectId:mode==='project'?projectId:'',instanceId,chosenAt:new Date().toISOString()});

// ── Phase 3, Part 2: cross-document data connectivity ──────────────────────────────────────────
// A plain data registry describing which PM documents feed data forward into which other PM
// documents within the same project, so a user who has already entered something once doesn't
// have to retype it. This is deliberately data, not component logic — src/utils/documentConnections.js
// is the pure engine that reads this registry and a project's documents and computes what to
// pre-populate; DocumentWorkspace only calls that engine and renders its result. Keeping the
// registry here (not inline in a component) is what makes it something an AI reasoning layer can
// enumerate and reason against directly, per the architecture note.
//
// Each connection is one of four kinds:
//  - 'table': maps one row array field on the source document onto a row array field on the
//    target, via fieldMap (source column key -> target column key, or {to,transform} for a value
//    transform). Populates by row position: if the target row array is empty, new rows are
//    created; if a target row already exists at the same index (e.g. because an earlier
//    connection already created it), only the still-blank mapped cells on that row are filled —
//    this is what lets two different source documents progressively enrich the same target row
//    (see the two benefits-realization-review connections) without a real cross-document primary
//    key to join on, and without ever overwriting something the user already typed.
//  - 'aggregate': reduces a source table column to a single number (via reduce) and copies it
//    into one scalar target field.
//  - 'narrative': builds a short prose string from one or more scalar source fields and copies it
//    into one scalar/narrative target field.
//  - 'conditional-scalar-row': the source is a single-instance document's own scalar values (not
//    a table — Change Request is one document per project, not a repeatable list); when
//    condition(values) is true, its mapped fields become one row appended to the target table,
//    deduplicated by matchKey so re-opening the target document doesn't create a duplicate row
//    every time.
// A fieldMap value transform receives (sourceValue, sourceValues) and returns the value to write.
export const DOCUMENT_CONNECTIONS=Object.freeze([
  {id:'benefits-management-plan.benefitRows->benefits-tracking-register.benefitRows',kind:'table',
    sourceDocId:'benefits-management-plan',sourceField:'benefitRows',
    targetDocId:'benefits-tracking-register',targetField:'benefitRows',
    fieldMap:{benefit:'benefitDescription',metric:'metric',baseline:'baselineValue',target:'targetValue',owner:'owner',realizationDate:'realizationDate'}},
  {id:'benefits-management-plan.benefitRows->benefits-realization-review.benefitsAssessmentRows',kind:'table',
    sourceDocId:'benefits-management-plan',sourceField:'benefitRows',
    targetDocId:'benefits-realization-review',targetField:'benefitsAssessmentRows',
    fieldMap:{benefit:'benefit',metric:'metric',baseline:'baseline',target:'target'}},
  {id:'assumption-log.assumptionRows->raid-log.raidAssumptionRows',kind:'table',
    sourceDocId:'assumption-log',sourceField:'assumptionRows',
    targetDocId:'raid-log',targetField:'raidAssumptionRows',
    fieldMap:{assumption:'assumption',basis:'basis',owner:'owner',validationDate:'validationDate',status:'status',impact:'notes'}},
  {id:'stakeholder-register.stakeholderRows->communications-management-plan.communicationMatrixRows',kind:'table',
    sourceDocId:'stakeholder-register',sourceField:'stakeholderRows',
    targetDocId:'communications-management-plan',targetField:'communicationMatrixRows',
    fieldMap:{name:'stakeholderGroup'}},
  {id:'stakeholder-register.stakeholderRows->stakeholder-engagement-plan.engagementActionRows',kind:'table',
    sourceDocId:'stakeholder-register',sourceField:'stakeholderRows',
    targetDocId:'stakeholder-engagement-plan',targetField:'engagementActionRows',
    fieldMap:{name:'stakeholderName'}},
  {id:'risk-register.riskRows->raid-log.raidRiskRows',kind:'table',
    sourceDocId:'risk-register',sourceField:'riskRows',
    targetDocId:'raid-log',targetField:'raidRiskRows',
    fieldMap:{riskId:'id',risk:'description',probability:'probability',impact:'impact',owner:'owner',response:'response',status:'status'}},
  {id:'risk-register.riskRows->risk-report.topRiskRows',kind:'table',
    sourceDocId:'risk-register',sourceField:'riskRows',
    targetDocId:'risk-report',targetField:'topRiskRows',
    fieldMap:{riskId:'riskId',risk:'riskDescription',probability:'probability',impact:'impact',exposure:'exposure',owner:'owner'}},
  {id:'schedule-baseline.scheduleRows->milestone-report.milestoneStatusRows',kind:'table',
    sourceDocId:'schedule-baseline',sourceField:'scheduleRows',
    targetDocId:'milestone-report',targetField:'milestoneStatusRows',
    fieldMap:{milestone:'milestoneDescription',start:'plannedDate',owner:'owner'}},
  {id:'schedule-baseline.scheduleRows->variance-report.scheduleVarianceRows',kind:'table',
    sourceDocId:'schedule-baseline',sourceField:'scheduleRows',
    targetDocId:'variance-report',targetField:'scheduleVarianceRows',
    fieldMap:{milestone:'milestoneDeliverable',start:'baselineDate',owner:'owner'}},
  {id:'cost-baseline.costByPhaseRows->variance-report.costVarianceRows',kind:'table',
    sourceDocId:'cost-baseline',sourceField:'costByPhaseRows',
    targetDocId:'variance-report',targetField:'costVarianceRows',
    fieldMap:{phase:'workPackage',total:'budget'}},
  {id:'cost-baseline.costByPhaseRows.total->evm-dashboard.bac',kind:'aggregate',
    sourceDocId:'cost-baseline',sourceField:'costByPhaseRows',sourceColumn:'total',
    targetDocId:'evm-dashboard',targetField:'bac'},
  {id:'resource-calendar.resourceAvailabilityRows->team-performance-reviews.teamAssessmentRows',kind:'table',
    sourceDocId:'resource-calendar',sourceField:'resourceAvailabilityRows',
    targetDocId:'team-performance-reviews',targetField:'teamAssessmentRows',
    fieldMap:{resourceName:'teamMember',role:'role'}},
  {id:'quality-management-plan.qualityMetricRows->kpi-dashboard.kpiPerformanceRows',kind:'table',
    sourceDocId:'quality-management-plan',sourceField:'qualityMetricRows',
    targetDocId:'kpi-dashboard',targetField:'kpiPerformanceRows',
    fieldMap:{metric:'kpiName',target:'target',owner:'owner'}},
  {id:'risk-register.riskRows->risk-review.riskUpdateRows',kind:'table',
    sourceDocId:'risk-register',sourceField:'riskRows',
    targetDocId:'risk-review',targetField:'riskUpdateRows',
    fieldMap:{riskId:'riskId',risk:'description',owner:'owner',status:'previousStatus'}},
  {id:'decision-log.decisionRows->final-project-report.keyDecisionRows',kind:'table',
    sourceDocId:'decision-log',sourceField:'decisionRows',
    targetDocId:'final-project-report',targetField:'keyDecisionRows',
    fieldMap:{decision:'decision',date:'date',impact:'impact'}},
  {id:'change-request->change-log.changeRegisterRows',kind:'conditional-scalar-row',
    sourceDocId:'change-request',
    targetDocId:'change-log',targetField:'changeRegisterRows',
    condition:values=>values?.recommendation==='Approve',
    matchKey:'changeId',
    fieldMap:{changeRequestId:'changeId',changeTitle:'title',requestor:'requestor',dateSubmitted:'dateSubmitted',recommendation:{to:'status',transform:()=>'Approved'}}},
  {id:'lessons-learned-register.lessonRows->lessons-learned-report.lessonsByPhaseRows',kind:'table',
    sourceDocId:'lessons-learned-register',sourceField:'lessonRows',
    targetDocId:'lessons-learned-report',targetField:'lessonsByPhaseRows',
    fieldMap:{phase:'phase',category:'category',whatWasLearned:'lessonLearned',recommendation:'recommendation'}},
  {id:'benefits-tracking-register.benefitRows->benefits-realization-review.benefitsAssessmentRows',kind:'table',
    sourceDocId:'benefits-tracking-register',sourceField:'benefitRows',
    targetDocId:'benefits-realization-review',targetField:'benefitsAssessmentRows',
    fieldMap:{currentValue:'actual',variance:'variance',status:'realizationStatus'}},
  {id:'evm-dashboard.cost->final-project-report.costPerformanceSummary',kind:'narrative',
    sourceDocId:'evm-dashboard',sourceFields:['CPI','EAC','VAC'],
    targetDocId:'final-project-report',targetField:'costPerformanceSummary',
    narrate:values=>{const parts=[];if(textish(values.CPI))parts.push(`CPI is ${values.CPI}`);if(textish(values.EAC))parts.push(`EAC is ${values.EAC}`);if(textish(values.VAC))parts.push(`VAC is ${values.VAC}`);return parts.length?`From the EVM Dashboard: ${parts.join(', ')}.`:'';}},
  {id:'evm-dashboard.schedule->final-project-report.schedulePerformanceSummary',kind:'narrative',
    sourceDocId:'evm-dashboard',sourceFields:['SPI'],
    targetDocId:'final-project-report',targetField:'schedulePerformanceSummary',
    narrate:values=>textish(values.SPI)?`From the EVM Dashboard: SPI is ${values.SPI}.`:''},
  {id:'project-closure-report.deliverableAcceptanceRows->acceptance-signoff.deliverableSignoffRows',kind:'table',
    sourceDocId:'project-closure-report',sourceField:'deliverableAcceptanceRows',
    targetDocId:'acceptance-signoff',targetField:'deliverableSignoffRows',
    fieldMap:{deliverable:'deliverable',owner:'acceptedBy'}},
]);
const textish=value=>value!==undefined&&value!==null&&String(value).trim()!=='';
export const connectionsForTarget=targetDocId=>DOCUMENT_CONNECTIONS.filter(connection=>connection.targetDocId===targetDocId);
export const connectionsForSource=sourceDocId=>DOCUMENT_CONNECTIONS.filter(connection=>connection.sourceDocId===sourceDocId);

const STANDALONE_KEY='aureqin_standalone_artifacts';
export const loadStandaloneArtifacts=()=>{try{return JSON.parse(localStorage.getItem(STANDALONE_KEY)||'{}')}catch{return{}}};
export const saveStandaloneArtifact=record=>{const all=loadStandaloneArtifacts();all[record.id]=record;localStorage.setItem(STANDALONE_KEY,JSON.stringify(all));return record};
export const getStandaloneArtifact=id=>loadStandaloneArtifacts()[id]||null;

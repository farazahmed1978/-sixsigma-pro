import {PMP_TEMPLATES} from './pmpTemplates';
import {NAVIGATION} from './navigation';

const template=id=>PMP_TEMPLATES.find(item=>item.id===id);
const fieldIds=tpl=>tpl.sections.flatMap(section=>section.fields.map(field=>field.id));
const pmGroups=NAVIGATION.find(section=>section.suiteId==='project-management').groups;
const docIdsInCluster=(stageId,clusterId)=>{
  const stage=pmGroups.find(group=>group.id===stageId);
  const cluster=stage.clusters.find(item=>item.id===clusterId);
  return cluster.items.filter(item=>item.id.startsWith('doc-')).map(item=>item.id.replace(/^doc-/,''));
};

// The 5 new PMBOK 8 artifacts must exist as real, purpose-built templates (not generic
// placeholders) with every field the spec called for, and must be reachable through the PM
// suite's Document Library / navigation the same way every other PM document is.
test.each([
  ['project-governance-framework',['governanceStructure','sponsorResponsibilities','decisionAuthorityRows','escalationPath','reportingCadence','steeringCommitteeRows']],
  ['value-realization-plan',['purpose','approach','valueRows','reviewNotes']],
  ['benefits-tracking-register',['purpose','approach','benefitRows','reviewNotes']],
  ['ai-and-automation-impact-assessment',['aiToolRows','automationOpportunities','aiRisks','ethicalConsiderations','dataGovernanceRequirements','humanOversightPlan','humanJudgmentDecisionPoints']],
  ['sustainability-impact-assessment',['environmentalImpact','socialImpact','economicSustainability','sustainabilityGoals','mitigationActionRows','reportingRequirements']],
])('%s exists as a purpose-built template with its specified fields, not a generic placeholder',(id,expectedFieldIds)=>{
  const tpl=template(id);
  expect(tpl).toBeTruthy();
  expect(fieldIds(tpl)).toEqual(expect.arrayContaining(expectedFieldIds));
});

test('the five new PMBOK 8 documents are reachable through PM_GROUPS navigation, not just PMP_TEMPLATES',()=>{
  const ids=['project-governance-framework','value-realization-plan','benefits-tracking-register','ai-and-automation-impact-assessment','sustainability-impact-assessment'];
  const navDocIds=new Set(pmGroups.flatMap(group=>group.clusters.flatMap(cluster=>cluster.items.filter(item=>item.id.startsWith('doc-')).map(item=>item.id.replace(/^doc-/,'')))));
  ids.forEach(id=>expect(navDocIds.has(id)).toBe(true));
});

test('Decision Log is upgraded from the generic single-table register to the PMBOK 8 decision-record schema',()=>{
  const decisionLog=template('decision-log');
  expect(fieldIds(decisionLog)).toEqual(expect.arrayContaining(['decisionRows']));
  const decisionsField=decisionLog.sections.flatMap(section=>section.fields).find(field=>field.id==='decisionRows');
  const columnKeys=decisionsField.columns.map(column=>column.key);
  expect(columnKeys).toEqual(expect.arrayContaining(['decisionId','decision','rationale','authorityLevel','alternatives','date','owner','impact']));
});

// Spot-check the Performance Domain clustering: Governance (replacing Integration Management)
// picks up Charter/Business Case in Initiation and the PM Plan/Config/Change plans plus the new
// Governance Framework in Planning; Uncertainty carries the Risk trio; Value Delivery threads
// Benefits Management Plan (Initiation) through Benefits Tracking Register (Monitoring &
// Controlling) to Benefits Realization Review (Closing).
test('PM_GROUPS clusters documents under PMBOK 8 Performance Domains, not the old Knowledge Area groupings',()=>{
  expect(docIdsInCluster('initiation','governance')).toEqual(expect.arrayContaining(['charter','business-case']));
  expect(docIdsInCluster('planning','governance')).toEqual(expect.arrayContaining(['project-management-plan','configuration-management-plan','change-management-plan','project-governance-framework']));
  expect(docIdsInCluster('planning','uncertainty')).toEqual(expect.arrayContaining(['risk-management-plan','risk-register','risk-report']));
  expect(docIdsInCluster('execution','governance')).toEqual(expect.arrayContaining(['decision-log']));
  expect(docIdsInCluster('monitoring-controlling','uncertainty')).toEqual(expect.arrayContaining(['risk-review']));
  expect(docIdsInCluster('initiation','value-delivery')).toEqual(['benefits-management-plan']);
  expect(docIdsInCluster('planning','value-delivery')).toEqual(['value-realization-plan']);
  expect(docIdsInCluster('monitoring-controlling','value-delivery')).toEqual(['benefits-tracking-register']);
  expect(docIdsInCluster('closing','value-delivery')).toEqual(['benefits-realization-review']);
});

test('every pre-existing PM document still has exactly one PM_GROUPS placement after the PMBOK 8 restructure',()=>{
  const navDocIds=pmGroups.flatMap(group=>group.clusters.flatMap(cluster=>cluster.items.filter(item=>item.id.startsWith('doc-')).map(item=>item.id.replace(/^doc-/,''))));
  const counts=navDocIds.reduce((map,id)=>({...map,[id]:(map[id]||0)+1}),{});
  PMP_TEMPLATES.forEach(tpl=>expect(counts[tpl.id]).toBe(1));
});

// The 5 Focus Areas (Process Groups renamed) must be untouched by the PMBOK 8 domain reclustering
// — every document keeps the same stage/pmpLifecycle it always had.
test('the 5 Focus Area stages and their document-to-stage assignments are unchanged by the domain reclustering',()=>{
  expect(pmGroups.map(group=>group.id)).toEqual(['initiation','planning','execution','monitoring-controlling','closing']);
  expect(template('wbs').pmpLifecycle).toBe('Planning');
  expect(template('issue-log').pmpLifecycle).toBe('Execution');
  expect(template('status-report').pmpLifecycle).toBe('Monitoring & Controlling');
  expect(template('final-project-report').pmpLifecycle).toBe('Closing');
});

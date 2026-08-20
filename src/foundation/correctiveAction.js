export const CORRECTIVE_ACTION_TYPE='oe-corrective-action';
export const CORRECTIVE_ACTION_STATUSES=['Open','Containment','Root Cause','Action in Progress','Pending Effectiveness','Verified / Closed'];
export const EFFECTIVENESS_RESULTS=['Not evaluated','Effective','Ineffective','Inconclusive'];
const text=value=>String(value||'').trim();
const complete=value=>Boolean(text(value));
const closed=status=>status==='Verified / Closed';

export const correctiveActionDetail=row=>({
 ...(row||{}),...(row?.content||{}),
 id:row?.id||'',projectId:row?.project_id||row?.projectId||'',organizationId:row?.organization_id||row?.organizationId||'',createdBy:row?.created_by||row?.createdBy||'',createdAt:row?.created_at||row?.createdAt||'',updatedAt:row?.updated_at||row?.updatedAt||'',version:row?.version,
 title:row?.title||'',status:row?.status||'Open',severity:row?.priority||row?.severity||row?.content?.severity||'Medium',
});

export function closureReadiness(input){
 const action=correctiveActionDetail(input),requirements=[
  ['problem','Problem statement',complete(action.problemStatement)],
  ['root-cause','Validated root cause',complete(action.validatedRootCause)&&complete(action.rootCauseReferenceId)],
  ['action','Corrective action',complete(action.actionDescription)&&complete(action.actionOwner)&&complete(action.dueDate)],
  ['completion','Action completion',action.actionStatus==='Complete'&&complete(action.completionDate)],
  ['effectiveness-plan','Effectiveness plan',complete(action.effectivenessCriteria)&&complete(action.verificationMethod)],
  ['effectiveness-result','Effectiveness verification',action.effectivenessResult==='Effective'&&complete(action.verifiedBy)&&complete(action.verificationDate)],
  ['closure','Closure authorization',complete(action.closureDecision)&&complete(action.closureNotes)&&complete(action.closedBy)&&complete(action.closureDate)],
 ];
 const blockers=requirements.filter(([,label,done])=>!done).map(([code,label])=>({code,label}));
 const warnings=[];
 if(!complete(action.sourceFindingId))warnings.push({code:'source-finding',label:'No source finding is linked'});
 if(!complete(action.evidenceNotes))warnings.push({code:'evidence',label:'No evidence note is recorded'});
 return{readyToClose:blockers.length===0,blockers,warnings,completedRequirements:requirements.filter(([, ,done])=>done).map(([code,label])=>({code,label}))};
}

export const isCorrectiveAction=row=>row?.content?.item_type===CORRECTIVE_ACTION_TYPE;
export const isCorrectiveActionOverdue=(input,now=new Date())=>{const action=correctiveActionDetail(input);if(!action.dueDate||action.actionStatus==='Complete'||closed(action.status))return false;const due=new Date(`${action.dueDate}T23:59:59.999`);return !Number.isNaN(due.getTime())&&due<now};
export const canTransitionCorrectiveAction=(input,nextStatus)=>nextStatus!=='Verified / Closed'||closureReadiness(input).readyToClose;
export const reopenCorrectiveAction=input=>({...correctiveActionDetail(input),status:'Action in Progress',closureDecision:'',closureNotes:'',closedBy:'',closureDate:''});

export function correctiveActionContext(rows,now=new Date()){
 const actions=rows.map(correctiveActionDetail),open=actions.filter(item=>!closed(item.status)),overdue=open.filter(item=>isCorrectiveActionOverdue(item,now)),blockedClosure=open.filter(item=>item.status==='Pending Effectiveness'&&!closureReadiness(item).readyToClose),pendingEffectiveness=open.filter(item=>item.status==='Pending Effectiveness'),recentThreshold=new Date(now);recentThreshold.setDate(recentThreshold.getDate()-30);
 return{open,overdue,blockedClosure,pendingEffectiveness,recentlyClosed:actions.filter(item=>closed(item.status)&&new Date(item.closureDate||item.updatedAt)>=recentThreshold),sourceFindings:[...new Set(actions.map(item=>item.sourceFindingId).filter(Boolean))],owners:[...new Set(open.map(item=>item.actionOwner).filter(Boolean))].sort()};
}

export const correctiveActionReportItem=(input,project)=>{const action=correctiveActionDetail(input),readiness=closureReadiness(action);return{assetType:'corrective-action',reportKey:`${project.id}:corrective-action:${action.id}`,projectId:project.id,organizationId:action.organizationId,title:`Corrective Action — ${action.title}`,toolId:'corrective-action',phase:action.lifecyclePhase||'Improve',timestamp:action.updatedAt||new Date().toISOString(),statsSummary:{Status:action.status,Severity:action.severity,Owner:action.actionOwner||'Unassigned','Due date':action.dueDate||'Not set','Closure readiness':readiness.readyToClose?'Ready':'Blocked'},interpretation:[action.problemStatement,action.actionDescription,action.effectivenessResult&&`Effectiveness: ${action.effectivenessResult}`].filter(Boolean).join(' · '),structuredOutput:{sourceFinding:{id:action.sourceFindingId||'',title:action.sourceFindingTitle||''},rootCauseReference:{id:action.rootCauseReferenceId||'',title:action.rootCauseReferenceTitle||''},closure:{decision:action.closureDecision||'',date:action.closureDate||''}}};};

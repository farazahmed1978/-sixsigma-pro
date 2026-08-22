import {
  correctiveActionDetail,
  isCorrectiveActionOverdue,
} from "./correctiveAction";
import {
  charterCompletionState,
  charterQualityState,
} from "../config/charterTemplate";
import {
  MEASURE_BASELINE_ANALYSIS_IDS,
  MEASURE_CAPABILITY_ANALYSIS_IDS,
  MEASURE_MSA_ANALYSIS_IDS,
} from "../config/measureCadence";
import { projectHubDeepLink } from "../utils/projectHub";
export const TOLLGATE_TYPE = "oe-dmaic-tollgate";
export const TOLLGATE_PHASES = [
  "Define",
  "Measure",
  "Analyze",
  "Improve",
  "Control",
];
export const TOLLGATE_STATUSES = {
  SUBMITTED: "Submitted",
  IN_REVIEW: "In Review",
  RETURNED: "Returned for Revision",
  CONDITIONAL: "Conditionally Approved",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
const text = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const identity = (item) =>
  String(item?.templateId || item?.toolId || item?.id || "").replace(
    /^document-/,
    "",
  );
const hasIdentity = (items, ids) =>
  items.some((item) => ids.includes(identity(item)));
const action = (actionLabel, destination) => ({ actionLabel, destination });
const requirement = (
  code,
  label,
  done,
  severity = "blocker",
  actions = [],
) => ({ code, label, done, severity, actions });
const documentAction = (projectId, templateId, label) =>
  action(
    label || `Open ${templateId}`,
    `/projects/${projectId}/documents/${templateId}`,
  );
const uniqueById = (items) => [
  ...new Map(
    items
      .filter(Boolean)
      .map((item) => [item.id || item.templateId || item.title, item]),
  ).values(),
];
export const tollgateDestination = (projectId, phase) =>
  projectHubDeepLink(projectId, "tollgates", { phase });
export const tollgateReviewDestination=(projectId,phase,attempt)=>projectHubDeepLink(projectId,"tollgates",{phase,attempt});
export const defineRemediationDestinations = (projectId) => ({
  charter: `/projects/${projectId}/charter`,
  owner: projectHubDeepLink(projectId, "project-settings", { focus: "owner" }),
  sponsor: projectHubDeepLink(projectId, "project-settings", {
    focus: "sponsor",
  }),
  team: projectHubDeepLink(projectId, "team", { focus: "reviewer" }),
  sipoc: `/projects/${projectId}/documents/sipoc`,
  voc: `/projects/${projectId}/documents/voc`,
  ctq: `/projects/${projectId}/documents/ctq-tree`,
  tollgate: tollgateDestination(projectId, "Define"),
  binder: projectHubDeepLink(projectId, "project-binder", { phase: "Define" }),
});
export function canonicalTollgateState(project, resources = {}) {
  const embeddedDocuments = Object.values(project?.documents || {}),
    documents = uniqueById([
      ...(resources.documents || []),
      ...embeddedDocuments,
    ]),
    evidence = uniqueById([
      ...(resources.evidence || []),
      ...(project?.evidenceLibrary || []),
    ]),
    artifacts = uniqueById([
      ...(resources.artifacts || []),
      ...(project?.artifacts || []),
    ]);
  return {
    projectId: project?.id || "",
    charter: project?.charter || null,
    owner: text(project?.owner || project?.sharedFields?.owner),
    sponsor: text(project?.champion || project?.sharedFields?.sponsor),
    documents,
    evidence,
    artifacts,
    analyses: resources.analyses || [],
    datasets: resources.datasets || [],
    correctiveActions: resources.correctiveActions || [],
  };
}
export const canonicalDocument = (state, templateId) =>
  state.documents.find(
    (item) =>
      item.templateId === templateId ||
      item.id === `document-${templateId}` ||
      item.id === templateId,
  );
const completedDocument = (state, templateId) => {
  const document = canonicalDocument(state, templateId);
  if (!document) return false;
  if (document.status === "complete" || Number(document.completion) >= 100)
    return true;
  if (document.completion !== undefined && document.completion !== null)
    return false;
  return Object.values(document.values || {}).some((value) =>
    Array.isArray(value) ? value.length : Boolean(text(value)),
  );
};
const hasAnalysis = (analyses, ids) =>
  analyses.some((item) => ids.includes(identity(item)));
export const tollgateDetail = (row) => ({
  ...row,
  ...(row?.content || {}),
  id: row?.id || "",
  projectId: row?.project_id || row?.projectId || "",
  organizationId: row?.organization_id || row?.organizationId || "",
  createdBy: row?.created_by || row?.createdBy || "",
  phase: row?.lifecycle_phase || row?.content?.phase || row?.phase || "Define",
  status: row?.status || TOLLGATE_STATUSES.SUBMITTED,
  updatedAt: row?.updated_at || row?.updatedAt || "",
  createdAt: row?.created_at || row?.createdAt || "",
});
export const isTollgate = (row) => row?.content?.item_type === TOLLGATE_TYPE;

export function evaluateTollgateReadiness(project, phase, resources = {}) {
  const state = canonicalTollgateState(project, resources),
    { documents, analyses, evidence, artifacts, datasets } = state,
    actions = state.correctiveActions.map(correctiveActionDetail),
    all = [...documents, ...evidence, ...artifacts],
    phaseItems = all.filter(
      (item) =>
        !item.phase || String(item.phase).toLowerCase() === phase.toLowerCase(),
    ),
    charter = state.charter,
    charterCompletion = charterCompletionState(charter),
    charterQuality = charterQualityState(charter),
    charterReady = charterCompletion.complete && charterQuality.reviewReady,
    projectBase = `/projects/${state.projectId}`;
  const criticalOpen = actions.filter(
      (action) =>
        action.severity === "Critical" && action.status !== "Verified / Closed",
    ),
    overdue = actions.filter((action) => isCorrectiveActionOverdue(action)),
    pendingEffectiveness = actions.filter(
      (action) =>
        action.status === "Pending Effectiveness" ||
        (action.actionStatus === "Complete" &&
          action.effectivenessResult !== "Effective"),
    ),
    defineLinks = defineRemediationDestinations(state.projectId);
  const rules = {
    Define: [
      requirement(
        "charter",
        !charterCompletion.complete
          ? "Complete required Charter sections"
          : !charterQuality.reviewReady
            ? `Improve Charter quality before submission (${charterQuality.score}/${charterQuality.threshold})`
            : "Project Charter ready",
        charterReady,
        "blocker",
        [action("Open Charter", defineLinks.charter)],
      ),
      requirement(
        "owner",
        "Assign project owner",
        Boolean(state.owner),
        "blocker",
        [action("Assign Owner", defineLinks.owner)],
      ),
      requirement(
        "sponsor",
        "Assign project sponsor",
        Boolean(state.sponsor),
        "blocker",
        [action("Assign Sponsor", defineLinks.sponsor)],
      ),
      requirement(
        "sipoc",
        "Complete SIPOC",
        completedDocument(state, "sipoc"),
        "warning",
        [action("Open SIPOC", defineLinks.sipoc)],
      ),
      requirement(
        "voice",
        "Record VOC or CTQ evidence",
        completedDocument(state, "voc") || completedDocument(state, "ctq-tree"),
        "warning",
        [
          action("Open VOC", defineLinks.voc),
          action("Open CTQ Tree", defineLinks.ctq),
        ],
      ),
    ],
    Measure: [
      requirement(
        "measurement-plan",
        "Complete a measurement or data-collection plan",
        completedDocument(state, "measurement-plan") ||
          completedDocument(state, "data-collection-plan"),
        "blocker",
        [
          documentAction(
            state.projectId,
            "data-collection-plan",
            "Open Data Collection Plan",
          ),
          documentAction(
            state.projectId,
            "measurement-plan",
            "Open Measurement Plan",
          ),
        ],
      ),
      requirement(
        "operational-definitions",
        "Complete operational definitions",
        completedDocument(state, "operational-definitions"),
        "blocker",
        [
          documentAction(
            state.projectId,
            "operational-definitions",
            "Open Operational Definitions",
          ),
        ],
      ),
      requirement(
        "dataset",
        "Create an active project dataset",
        datasets.some((item) => !item.archivedAt),
        "blocker",
        [action("Open Project Datasets", `${projectBase}?tab=datasets`)],
      ),
      requirement(
        "process-understanding",
        "Document the current process",
        completedDocument(state, "process-map") ||
          completedDocument(state, "swimlane-process-map") ||
          completedDocument(state, "value-stream-map"),
        "blocker",
        [
          documentAction(state.projectId, "process-map", "Open Process Map"),
          documentAction(
            state.projectId,
            "swimlane-process-map",
            "Open Swimlane Map",
          ),
        ],
      ),
      requirement(
        "baseline",
        "Establish baseline performance",
        completedDocument(state, "baseline-metrics") ||
          hasAnalysis(analyses, MEASURE_BASELINE_ANALYSIS_IDS),
        "blocker",
        [
          documentAction(
            state.projectId,
            "baseline-metrics",
            "Open Baseline Metrics",
          ),
          action(
            "Open Analysis Catalog",
            `/analysis?project=${encodeURIComponent(state.projectId)}`,
          ),
        ],
      ),
      requirement(
        "msa",
        "Validate the measurement system or document why MSA is not applicable",
        completedDocument(state, "msa-workspace") ||
          hasAnalysis(analyses, MEASURE_MSA_ANALYSIS_IDS),
        "warning",
        [
          documentAction(
            state.projectId,
            "msa-workspace",
            "Open MSA Workspace",
          ),
          action(
            "Run MSA",
            `/tool/msa?project=${encodeURIComponent(state.projectId)}`,
          ),
        ],
      ),
      requirement(
        "capability",
        "Complete capability analysis when specifications apply, or document why it is not applicable",
        completedDocument(state, "process-capability-study") ||
          hasAnalysis(analyses, MEASURE_CAPABILITY_ANALYSIS_IDS),
        "warning",
        [
          documentAction(
            state.projectId,
            "process-capability-study",
            "Open Capability Study",
          ),
          action(
            "Run Capability Analysis",
            `/tool/capability?project=${encodeURIComponent(state.projectId)}`,
          ),
        ],
      ),
    ],
    Analyze: [
      requirement(
        "analysis",
        "Record Analyze-phase evidence",
        analyses.some(
          (item) => String(item.phase || "Analyze").toLowerCase() === "analyze",
        ),
        "blocker",
        [
          action(
            "Open Analysis Catalog",
            `/analysis?project=${encodeURIComponent(state.projectId)}`,
          ),
        ],
      ),
      requirement(
        "root-cause",
        "Complete root-cause investigation",
        hasIdentity(documents, [
          "fishbone-workspace",
          "five-whys",
          "root-cause-verification",
        ]),
        "blocker",
        [
          documentAction(
            state.projectId,
            "root-cause-verification",
            "Open Root Cause Verification",
          ),
          documentAction(
            state.projectId,
            "fishbone-workspace",
            "Open Fishbone",
          ),
        ],
      ),
      requirement(
        "finding",
        "Record evidence supporting the conclusion",
        evidence.length > 0,
        "warning",
        [
          action(
            "Open Evidence Library",
            `${projectBase}?tab=evidence-library`,
          ),
        ],
      ),
    ],
    Improve: [
      requirement(
        "solution",
        "Document the selected solution",
        hasIdentity(documents, [
          "solution-selection-matrix",
          "impact-effort-matrix",
        ]),
        "blocker",
        [
          documentAction(
            state.projectId,
            "solution-selection-matrix",
            "Open Solution Selection",
          ),
        ],
      ),
      requirement(
        "implementation",
        "Record implementation or pilot evidence",
        hasIdentity(documents, ["implementation-plan", "pilot-plan"]),
        "blocker",
        [
          documentAction(
            state.projectId,
            "implementation-plan",
            "Open Implementation Plan",
          ),
          documentAction(state.projectId, "pilot-plan", "Open Pilot Plan"),
        ],
      ),
      requirement(
        "critical-actions",
        "Resolve blocked critical corrective actions",
        criticalOpen.every((item) => item.actionStatus !== "Blocked"),
        "blocker",
        [
          action(
            "Open Corrective Actions",
            `${projectBase}?tab=corrective-actions`,
          ),
        ],
      ),
      requirement(
        "risk-review",
        "Record FMEA or risk-review evidence",
        hasIdentity(all, ["fmea", "risk-review"]) || hasAnalysis(analyses,["fmea"]),
        "warning",
        [action("Open Project Binder", `${projectBase}?tab=project-binder`)],
      ),
      requirement(
        "validation",
        "Verify that the implemented change improved process performance",
        analyses.some((item)=>String(item.phase||"").toLowerCase()==="improve") || hasIdentity(evidence,["validation","before-after"]),
        "blocker",
        [action("Run or Select Validation Analysis",`/analysis?project=${encodeURIComponent(state.projectId)}`)],
      ),
      requirement(
        "overdue-actions",
        "Resolve overdue corrective actions",
        overdue.length === 0,
        "warning",
        [
          action(
            "Open Corrective Actions",
            `${projectBase}?tab=corrective-actions`,
          ),
        ],
      ),
    ],
    Control: [
      requirement(
        "control-plan",
        "Complete a control or reaction plan",
        completedDocument(state, "control-plan") ||
          completedDocument(state, "reaction-plan"),
        "blocker",
        [
          documentAction(state.projectId, "control-plan", "Open Control Plan"),
          documentAction(
            state.projectId,
            "reaction-plan",
            "Open Reaction Plan",
          ),
        ],
      ),
      requirement(
        "sustainment",
        "Record sustainment and operational handoff",
        completedDocument(state, "monitoring-plan") || completedDocument(state,"audit-checklist"),
        "blocker",
        [
          documentAction(
            state.projectId,
            "monitoring-plan",
            "Open Monitoring Plan",
          ),
        ],
      ),
      requirement(
        "monitoring-analysis",
        "Connect ongoing SPC or monitoring evidence",
        hasAnalysis(analyses,["control-chart","attribute-chart","run-chart"]),
        "warning",
        [action("Run Monitoring Analysis",`/analysis?project=${encodeURIComponent(state.projectId)}`)],
      ),
      requirement(
        "effectiveness",
        "Resolve corrective-action effectiveness",
        pendingEffectiveness.length === 0,
        "blocker",
        [
          action(
            "Open Corrective Actions",
            `${projectBase}?tab=corrective-actions`,
          ),
        ],
      ),
      requirement(
        "critical-actions",
        "Close critical corrective actions",
        criticalOpen.length === 0,
        "blocker",
        [
          action(
            "Open Corrective Actions",
            `${projectBase}?tab=corrective-actions`,
          ),
        ],
      ),
      requirement(
        "control-evidence",
        "Record Control-phase evidence",
        phaseItems.length > 0,
        "warning",
        [action("Open Project Binder", `${projectBase}?tab=project-binder`)],
      ),
    ],
  };
  const requirements = rules[phase] || [],
    descriptor = ({ code, label, severity, actions }) => ({
      code,
      label,
      severity,
      actions,
      destination: actions[0]?.destination || "",
      actionLabel: actions[0]?.actionLabel || "",
    }),
    blockers = requirements
      .filter((item) => !item.done && item.severity === "blocker")
      .map(descriptor),
    warnings = requirements
      .filter((item) => !item.done && item.severity === "warning")
      .map(descriptor);
  return {
    phase,
    readyToSubmit: blockers.length === 0,
    blockers,
    warnings,
    completedRequirements: requirements
      .filter((item) => item.done)
      .map(descriptor),
    missingRequirements: requirements
      .filter((item) => !item.done)
      .map(descriptor),
    charterReadiness: {
      completion: charterCompletion.completion,
      qualityScore: charterQuality.score,
      qualityThreshold: charterQuality.threshold,
    },
    evidenceSnapshot: {
      projectId: state.projectId,
      charterUpdatedAt: charter?.updatedAt || "",
      documentIds: documents.map((item) => item.id),
      analysisIds: analyses.map((item) => item.id),
      evidenceIds: evidence.map((item) => item.id),
      artifactIds: artifacts.map((item) => item.id),
      datasetIds: datasets.map((item) => item.id),
      correctiveActionIds: actions.map((item) => item.id),
    },
  };
}

export const normalizeReviewerEmail=(value)=>text(value).toLowerCase();
export function authenticatedReviewerIdentity(user){
  const identityEmail=(user?.identities||[]).map(identity=>identity?.identity_data?.email).find(Boolean);
  return{id:text(user?.id),email:normalizeReviewerEmail(user?.email||user?.user_metadata?.email||identityEmail)};
}
export function assignedReviewerMatches(review,user){
  const identity=authenticatedReviewerIdentity(user),gate=tollgateDetail(review);
  return Boolean(identity.id&&((gate.assignedReviewerId&&text(gate.assignedReviewerId)===identity.id)||(gate.assignedReviewerEmail&&normalizeReviewerEmail(gate.assignedReviewerEmail)===identity.email)));
}
export const canReviewTollgate = ({ user, organizationRole, review }) => {
  const identity=authenticatedReviewerIdentity(user),gate=tollgateDetail(review);
  return Boolean(identity.id&&review&&text(gate.submittedBy)!==identity.id&&(["owner","admin"].includes(organizationRole)||assignedReviewerMatches(gate,user)));
};
export const isPendingAssignedTollgate=(review,user)=>{const gate=tollgateDetail(review),identity=authenticatedReviewerIdentity(user);return Boolean(identity.id&&text(gate.submittedBy)!==identity.id&&[TOLLGATE_STATUSES.SUBMITTED,TOLLGATE_STATUSES.IN_REVIEW].includes(gate.status)&&assignedReviewerMatches(gate,user));};
export function pendingAssignedTollgates(projects,reviewsByProject,user){return(projects||[]).flatMap(project=>(reviewsByProject?.[project.id]||[]).filter(review=>isPendingAssignedTollgate(review,user)).map(review=>{const gate=tollgateDetail(review);return{id:gate.id,projectId:project.id,projectName:project.name,phase:gate.phase,attempt:gate.attempt||1,status:gate.status,submittedBy:gate.submittedByName||"Project contributor",submittedAt:gate.submittedAt,destination:tollgateReviewDestination(project.id,gate.phase,gate.attempt||1)}})).sort((a,b)=>new Date(b.submittedAt||0)-new Date(a.submittedAt||0));}
export const reviewerIdentity = (member) =>
  text(member?.userId) || text(member?.email).toLowerCase();
export function tollgateReviewerEligibility(member, user) {
  const memberId=text(member?.userId),memberEmail=text(member?.email).toLowerCase(),userId=text(user?.id),userEmail=text(user?.email).toLowerCase();
  if(!memberId&&!memberEmail)return{eligible:false,reason:"Add the reviewer’s account email.",code:"missing-identity"};
  if((memberId&&memberId===userId)||(memberEmail&&userEmail&&memberEmail===userEmail))return{eligible:false,reason:"The current submitter cannot review their own Tollgate.",code:"self-approval"};
  return{eligible:true,reason:"Eligible for Tollgate review",code:"eligible"};
}
export function eligibleTollgateReviewers(project, user) {
  return (project?.team || []).filter((member) => tollgateReviewerEligibility(member,user).eligible);
}
export const appendTollgateEvent = (review, event) => ({
  ...review,
  events: [
    ...(review.events || []),
    {
      id: event.id || crypto.randomUUID(),
      at: event.at || new Date().toISOString(),
      ...event,
    },
  ],
});
export const nextPhase = (phase) =>
  TOLLGATE_PHASES[TOLLGATE_PHASES.indexOf(phase) + 1] || phase;
export const phaseAfterDecision = (phase, status) =>
  status === TOLLGATE_STATUSES.APPROVED ? nextPhase(phase) : phase;
export function createTollgateSubmission({
  project,
  phase,
  readiness,
  submitter,
  reviewer,
  priorReviews = [],
  note = "",
  at = new Date().toISOString(),
  eventId,
}) {
  if (!readiness?.readyToSubmit) throw new Error("tollgate-submission-blocked");
  if (!reviewer?.email && !reviewer?.userId)
    throw new Error("tollgate-reviewer-required");
  const attempt =
    Math.max(
      0,
      ...priorReviews
        .filter((item) => tollgateDetail(item).phase === phase)
        .map((item) => tollgateDetail(item).attempt || 1),
    ) + 1;
  return {
    project_id: project.id,
    organization_id: project.organizationId,
    created_by: submitter.id,
    title: `${phase} Tollgate — Attempt ${attempt}`,
    status: TOLLGATE_STATUSES.SUBMITTED,
    methodology: "lean-six-sigma",
    lifecycle_phase: phase,
    content: {
      phase,
      attempt,
      submittedBy: submitter.id,
      submittedByName: submitter.name || submitter.email,
      submittedAt: at,
      assignedReviewerId: reviewer.userId || "",
      assignedReviewerName: reviewer.name || reviewer.email,
      assignedReviewerEmail: text(reviewer.email).toLowerCase(),
      readiness,
      evidenceSnapshot: readiness.evidenceSnapshot,
      reviewComments: "",
      decision: "",
      decisionBy: "",
      decisionByName: "",
      decisionAt: "",
      returnReason: "",
      events: [
        {
          id: eventId || crypto.randomUUID(),
          type: attempt > 1 ? "resubmitted" : "submitted",
          at,
          actorId: submitter.id,
          actorName: submitter.name || submitter.email,
          comments: text(note),
        },
      ],
    },
  };
}
export function applyTollgateDecision(
  review,
  {
    status,
    actor,
    organizationRole = "",
    comments = "",
    at = new Date().toISOString(),
    eventId,
  },
) {
  const gate = tollgateDetail(review);
  if (!canReviewTollgate({ user: actor, organizationRole, review: gate }))
    throw new Error("tollgate-review-not-authorized");
  if (
    ![TOLLGATE_STATUSES.SUBMITTED, TOLLGATE_STATUSES.IN_REVIEW].includes(
      gate.status,
    )
  )
    throw new Error("tollgate-review-not-active");
  const note = text(comments);
  if (
    [
      TOLLGATE_STATUSES.RETURNED,
      TOLLGATE_STATUSES.CONDITIONAL,
      TOLLGATE_STATUSES.REJECTED,
    ].includes(status) &&
    !note
  )
    throw new Error("tollgate-decision-comments-required");
  const eventType =
      status === TOLLGATE_STATUSES.IN_REVIEW
        ? "review-started"
        : status === TOLLGATE_STATUSES.RETURNED
          ? "returned-for-revision"
          : "decision",
    next = appendTollgateEvent(gate, {
      id: eventId,
      type: eventType,
      at,
      actorId: actor.id,
      actorName: actor.name || actor.email,
      status,
      comments: note,
    });
  return {
    status,
    content: {
      ...review.content,
      ...next,
      reviewComments: note || gate.reviewComments,
      decision: status === TOLLGATE_STATUSES.IN_REVIEW ? "" : status,
      decisionBy: status === TOLLGATE_STATUSES.IN_REVIEW ? "" : actor.id,
      decisionByName:
        status === TOLLGATE_STATUSES.IN_REVIEW ? "" : actor.name || actor.email,
      decisionAt: status === TOLLGATE_STATUSES.IN_REVIEW ? "" : at,
      returnReason:
        status === TOLLGATE_STATUSES.RETURNED ? note : gate.returnReason,
    },
  };
}
export function getTollgateContext(project, reviews, now = new Date()) {
  const rows = reviews.map(tollgateDetail),
    latest = TOLLGATE_PHASES.map(
      (phase) =>
        rows
          .filter((item) => item.phase === phase)
          .sort((a, b) => (b.attempt || 1) - (a.attempt || 1))[0],
    ).filter(Boolean),
    agingDays = (item) =>
      Math.max(
        0,
        Math.floor(
          (now - new Date(item.submittedAt || item.createdAt)) / 86400000,
        ),
      );
  return {
    projectId: project?.id,
    currentPhase: project?.currentPhase || "Define",
    gates: TOLLGATE_PHASES.map((phase) => ({
      phase,
      status:
        latest.find((item) => item.phase === phase)?.status || "Not Submitted",
    })),
    blockedGates: latest.filter(
      (item) => (item.readiness?.blockers || []).length,
    ),
    pendingReviews: latest
      .filter((item) =>
        [TOLLGATE_STATUSES.SUBMITTED, TOLLGATE_STATUSES.IN_REVIEW].includes(
          item.status,
        ),
      )
      .map((item) => ({ ...item, agingDays: agingDays(item) })),
    returnedForRevision: latest.filter(
      (item) => item.status === TOLLGATE_STATUSES.RETURNED,
    ),
    conditions: latest
      .filter((item) => item.status === TOLLGATE_STATUSES.CONDITIONAL)
      .map((item) => ({
        phase: item.phase,
        conditions: item.reviewComments || item.decisionComments || "",
      })),
    approvedPhases: latest
      .filter((item) => item.status === TOLLGATE_STATUSES.APPROVED)
      .map((item) => item.phase),
  };
}
export const tollgateReportItem = (review, project) => {
  const gate = tollgateDetail(review);
  return {
    assetType: "tollgate",
    reportKey: `${project.id}:tollgate:${gate.id}`,
    projectId: project.id,
    organizationId: gate.organizationId,
    title: `${gate.phase} Tollgate — ${gate.status}`,
    toolId: "dmaic-tollgate",
    phase: gate.phase,
    timestamp: gate.decisionAt || gate.updatedAt || gate.submittedAt,
    statsSummary: {
      Phase: gate.phase,
      Decision: gate.decision || gate.status,
      Reviewer:
        gate.decisionByName || gate.assignedReviewerName || "Unassigned",
      Date: gate.decisionAt || "Pending",
      Attempt: gate.attempt || 1,
    },
    interpretation: text(
      gate.decisionComments || gate.reviewComments || gate.returnReason || "",
    ),
    structuredOutput: {
      phase: gate.phase,
      status: gate.status,
      conditions:
        gate.status === TOLLGATE_STATUSES.CONDITIONAL
          ? text(gate.decisionComments)
          : "",
    },
  };
};

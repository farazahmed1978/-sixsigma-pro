import { correctiveActionContext } from "./correctiveAction";
import {
  TOLLGATE_PHASES,
  TOLLGATE_STATUSES,
  evaluateTollgateReadiness,
  tollgateDetail,
  tollgateDestination,
} from "./tollgate";

const AREA_TITLES = {
  Define: "Define / Project Definition",
  Measure: "Measurement & Baseline",
  Analyze: "Root Cause & Analysis",
  Improve: "Improvement & Corrective Actions",
  Control: "Control & Sustainment",
};
const gateDestination = tollgateDestination;
const latestFor = (reviews, phase) =>
  reviews
    .map(tollgateDetail)
    .filter((item) => item.phase === phase)
    .sort((a, b) => (b.attempt || 1) - (a.attempt || 1))[0] || null;
const firstAction = (item) =>
  item
    ? {
        label: item.label,
        actionLabel: item.actionLabel,
        destination: item.destination,
        code: item.code,
        severity: item.severity,
      }
    : null;

const GOVERNANCE_STATUS = {
  [TOLLGATE_STATUSES.SUBMITTED]: { status: "Submitted", label: "Awaiting reviewer decision" },
  [TOLLGATE_STATUSES.IN_REVIEW]: { status: "In Review", label: "Define Tollgate is under review" },
  [TOLLGATE_STATUSES.RETURNED]: { status: "Returned for Revision", label: "Address the reviewer’s requested revisions" },
  [TOLLGATE_STATUSES.CONDITIONAL]: { status: "Conditionally Approved", label: "Resolve the conditions recorded by the reviewer" },
  [TOLLGATE_STATUSES.REJECTED]: { status: "Rejected", label: "Address the rejection findings before resubmission" },
};

export function phaseGovernancePresentation(phase, gate, readiness, projectId) {
  const destination=gateDestination(projectId,phase),actionLabel=`Open ${phase} Tollgate`;
  if(gate?.status===TOLLGATE_STATUSES.APPROVED)return{status:"Complete",nextAction:{label:`${phase} Tollgate approved`,actionLabel,destination,code:"tollgate-approved",severity:"complete"}};
  const governed=GOVERNANCE_STATUS[gate?.status];
  if(governed)return{status:governed.status,nextAction:{label:phase==="Define"?governed.label:governed.label.replace("Define",phase),actionLabel,destination,code:"tollgate-review",severity:"action"}};
  if(readiness.blockers.length)return{status:"At risk",nextAction:firstAction(readiness.blockers[0])};
  if(readiness.warnings.length)return{status:"Needs attention",nextAction:firstAction(readiness.warnings[0])};
  return{status:"Work Ready",nextAction:{label:`${phase} package is ready for Tollgate submission`,actionLabel,destination,code:"tollgate-ready",severity:"action"}};
}

export function computeOEProjectHealth(project, context = {}) {
  const resources = {
      documents: context.documents || [],
      datasets: context.datasets || [],
      analyses: context.analyses || [],
      evidence: context.evidence || [],
      artifacts: context.artifacts || [],
      correctiveActions: context.correctiveActions || [],
    },
    reviews = context.tollgateReviews || [],
    actions = correctiveActionContext(
      resources.correctiveActions,
      context.now || new Date(),
    ),
    phaseIndex = Math.max(0, TOLLGATE_PHASES.indexOf(project?.currentPhase)),
    projectId = project?.id || "";
  const areas = TOLLGATE_PHASES.map((phase, index) => {
    const readiness = evaluateTollgateReadiness(project, phase, resources),
      gate = latestFor(reviews, phase),
      completed = readiness.completedRequirements,
      total = completed.length + readiness.missingRequirements.length,
      score = total ? Math.round((completed.length / total) * 100) : 100,
      governance=phaseGovernancePresentation(phase,gate,readiness,projectId),
      status=governance.status,
      next=governance.nextAction;
    return {
      id: phase.toLowerCase(),
      phase,
      title: AREA_TITLES[phase],
      status,
      score,
      isCurrent: index === phaseIndex,
      isPast: index < phaseIndex,
      gateStatus: gate?.status || "Not Submitted",
      readyToSubmit: readiness.readyToSubmit,
      complete: completed,
      blockers: readiness.blockers,
      warnings: readiness.warnings,
      nextAction: next,
    };
  });
  const current = areas[phaseIndex] || areas[0],
    overdueCurrent =
      current.phase === "Improve" || current.phase === "Control"
        ? actions.overdue[0]
        : null,
    recommended = overdueCurrent
      ? {
          label: `Corrective action overdue: ${overdueCurrent.title}`,
          actionLabel: "Open Corrective Action",
          destination: `/projects/${projectId}?tab=corrective-actions&correctiveAction=${encodeURIComponent(overdueCurrent.id)}`,
          code: "overdue-corrective-action",
          severity: "blocker",
        }
      : current.nextAction,
    totalComplete = areas.reduce((sum, item) => sum + item.complete.length, 0),
    totalRequirements = areas.reduce(
      (sum, item) =>
        sum +
        item.complete.length +
        item.blockers.length +
        item.warnings.length,
      0,
    ),
    blockers = areas.flatMap((item) =>
      item.blockers.map((entry) => ({ ...entry, phase: item.phase })),
    ),
    warnings = areas.flatMap((item) =>
      item.warnings.map((entry) => ({ ...entry, phase: item.phase })),
    );
  return {
    projectId,
    currentPhase: current.phase,
    overall: {
      score: totalRequirements
        ? Math.round((totalComplete / totalRequirements) * 100)
        : 100,
      status: current.status === "Complete" ? "On track" : current.status,
    },
    phases: areas.map(
      ({
        phase,
        status,
        score,
        isCurrent,
        isPast,
        gateStatus,
        readyToSubmit,
      }) => ({
        phase,
        status,
        score,
        isCurrent,
        isPast,
        gateStatus,
        readyToSubmit,
        destination: gateDestination(projectId, phase),
      }),
    ),
    areas,
    blockers,
    warnings,
    recommendedNextAction: recommended,
    correctiveActions: {
      open: actions.open.length,
      overdue: actions.overdue.length,
      pendingEffectiveness: actions.pendingEffectiveness.length,
    },
  };
}

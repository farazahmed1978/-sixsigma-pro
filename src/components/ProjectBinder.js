import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  lifecycleForProject,
  lifecycleStageLabels,
  resolveLifecycleStage,
  stageRank,
} from "../foundation/lifecycle";
import { SHARED_LEAD_IN_IDS } from "../utils/defineSequence";
import { NAVIGATION } from "../config/navigation";
import { navigationItems } from "../utils/navigationTools";
import { useProjectPlacement } from "../context/ProjectPlacementContext";
import { evaluateTollgateReadiness } from "../foundation/tollgate";
import SavedAnalysisResult from "./SavedAnalysisResult";
import HelpButton from "./HelpButton";
import "./ProjectBinder.css";

const oeItems = navigationItems(NAVIGATION).filter(
  (item) => item.suiteId === "operational-excellence",
);
const documentPhases = new Map(
  oeItems
    .filter((item) => item.id.startsWith("doc-"))
    .map((item) => [item.id.replace(/^doc-/, ""), item.phase]),
);
const toolPhases = new Map(
  oeItems
    .filter((item) => item.id.startsWith("tool-"))
    .map((item) => [item.id.replace(/^tool-/, ""), item.phase]),
);
const analysisPhase = {
  hypothesis: "Analyze",
  anova: "Analyze",
  regression: "Analyze",
  multiregression: "Analyze",
  logistic: "Analyze",
  correlation: "Analyze",
  pareto: "Analyze",
  scatter: "Analyze",
  boxplot: "Analyze",
  fishbone: "Analyze",
  doe: "Improve",
  fmea: "Analyze",
  capability: "Measure",
  "capability-analysis": "Measure",
  "control-chart": "Control",
  "attribute-chart": "Control",
  "run-chart": "Control",
  msa: "Measure",
  histogram: "Measure",
  descriptive: "Measure",
};
const clean = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const humanize = (value) =>
  String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
const sourceId = (item) =>
  item.documentId || item.analysisId || item.sourceId || item.id;
const resolvePhase = (item, kind, lifecycle) => {
  // Charter, Business Case, and Stakeholder Register are shared documents (defined once, surfaced
  // under both suites — see SHARED_LEAD_IN_IDS) whose saved record always carries their static
  // Define-phase template.phase, the same convention DocumentWorkspace.js and
  // utils/projectReport.js already follow for these three. On a non-OE project that phase doesn't
  // match any PM lifecycle stage, so without this they'd resolve to no phase at all and vanish
  // from every PM stage's phaseItems() — never appearing in stage narratives or readiness checks.
  if (
    kind === "document" &&
    lifecycle.id !== "operational-excellence" &&
    SHARED_LEAD_IN_IDS.includes(item.templateId)
  )
    return lifecycle.stages[0]?.label || "";
  const explicit = [item, item.content, item.documentSnapshot, item.analysis]
    .map((value) =>
      value
        ? resolveLifecycleStage(value, lifecycle, { preserveUnknown: false })
        : null,
    )
    .find(Boolean);
  if (explicit) return explicit.label;
  if (lifecycle.id !== "operational-excellence") return "";
  if (kind === "document")
    return (
      documentPhases.get(item.templateId) ||
      documentPhases.get(item.sourceTemplateId) ||
      documentPhases.get(String(item.id || "").replace(/^document-/, "")) ||
      ""
    );
  if (["analysis", "evidence", "artifact"].includes(kind))
    return (
      analysisPhase[item.toolId] ||
      analysisPhase[item.toolType] ||
      toolPhases.get(item.toolId) ||
      toolPhases.get(item.toolType) ||
      toolPhases.get(item.sourceWorkflow) ||
      "Analyze"
    );
  return "Measure";
};
export const routeFor = (projectId, item) =>
  item.kind === "document"
    ? item.templateId === "charter"
      ? `/projects/${projectId}/charter`
      : `/projects/${projectId}/documents/${item.templateId}`
    : item.kind === "artifact" &&
        (item.toolId === "lean-enterprise" ||
          item.sourceWorkflow === "lean-enterprise")
      ? `/tool/lean-enterprise?openLean=${encodeURIComponent(item.sourceId || item.id)}`
      : item.kind === "corrective-action"
        ? `/projects/${projectId}?tab=corrective-actions&correctiveAction=${encodeURIComponent(item.sourceId)}`
        : item.kind === "tollgate"
          ? `/projects/${projectId}?tab=tollgates&phase=${encodeURIComponent(item.phase)}`
        : "";
export const reportItemForAnalysis = (analysis) => ({
  toolId: analysis.toolId || analysis.toolType || "analysis",
  phase:
    analysis.phase ||
    resolvePhase(analysis, "analysis", lifecycleForProject(analysis)),
  title: analysis.title || analysis.name || "Analysis result",
  timestamp: analysis.executedAt || analysis.createdAt,
  statsSummary: analysis.statsSummary || {},
  structuredOutput:
    analysis.result || analysis.structuredOutput || analysis.statsSummary || {},
  interpretation: analysis.interpretation || analysis.summary || "",
  diagnostics: analysis.diagnostics,
  provenance: {
    analysisId: analysis.id,
    method:
      analysis.method || analysis.toolId || analysis.toolType || "analysis",
    methodVersion: analysis.methodVersion || "",
    datasetId: analysis.datasetIds?.[0] || "",
    datasetVersionId: analysis.datasetVersionIds?.[0] || "",
  },
});
export const placementDraftForAnalysis = (
  projectId,
  analysis,
  includeReport = false,
) => ({
  artifactId: analysis.id,
  projectId,
  toolId: analysis.toolId || analysis.toolType || "analysis",
  title: analysis.title || analysis.name || "Analysis result",
  analysis,
  reportItem: reportItemForAnalysis(analysis),
  includeReport,
});
export const analysesWithProjectPlacements=(analyses,placements,projectId)=>analyses.map((analysis)=>{const canonicalPlacement=placements.find((item)=>item.artifactId===analysis.id&&item.projectId===projectId&&item.isPrimary);return canonicalPlacement?{...analysis,phase:canonicalPlacement.phase||analysis.phase,workflowCluster:canonicalPlacement.workflowCluster||analysis.workflowCluster}:analysis});
const itemStage = (item) =>
  ["corrective-action", "tollgate"].includes(item.kind)
    ? "Decisions / Actions"
    : item.kind === "document"
    ? "Documents"
    : item.kind === "analysis"
      ? "Analyses"
      : ["evidence", "artifact", "dataset"].includes(item.kind)
        ? "Evidence / Data"
        : /decision|approval/i.test(item.title)
          ? "Decisions / Actions"
          : "Findings";
const firstValue = (items, keys) => {
  for (const item of items)
    for (const key of keys) {
      const value = item.values?.[key] ?? item[key];
      if (Array.isArray(value) && value.length)
        return `${value.length} recorded item${value.length === 1 ? "" : "s"}`;
      if (clean(value)) return clean(value);
    }
  return "Not yet established";
};
const qualityFor = (item) => {
  if (Number.isFinite(item.quality)) return item.quality;
  const values = item.values || {};
  const entries = Object.entries(values);
  if (!entries.length) return null;
  const substantive = entries.filter(([, value]) =>
    Array.isArray(value)
      ? value.length &&
        value.every((row) =>
          Object.entries(row)
            .filter(([key]) => key !== "id")
            .some(([, cell]) => clean(cell)),
        )
      : clean(value).length >= 30,
  ).length;
  return Math.round((substantive / entries.length) * 100);
};
const completionFor = (item) => {
  if (Number.isFinite(item.completion)) return item.completion;
  const values = item.values || {};
  const entries = Object.entries(values);
  if (!entries.length) return null;
  return Math.round(
    (entries.filter(([, value]) =>
      Array.isArray(value) ? value.length : Boolean(clean(value)),
    ).length /
      entries.length) *
      100,
  );
};
const issuesFor = (item) => {
  if (item.qualityIssues?.length) return item.qualityIssues;
  return Object.entries(item.values || {})
    .filter(([, value]) =>
      Array.isArray(value)
        ? !value.length
        : clean(value).length > 0 && clean(value).length < 30,
    )
    .slice(0, 3)
    .map(([key, value]) =>
      Array.isArray(value)
        ? `${humanize(key)} has no supporting entries`
        : `${humanize(key)} needs more specific supporting detail`,
    );
};
export const compactAnalysisSummary=analysis=>{if(!analysis)return'';const result=analysis.result||analysis.structuredOutput||{},p=result.pValue??result.p??result.statsSummary?.p,significant=Number.isFinite(Number(p))?(Number(p)<.05?'Statistically significant':'Not statistically significant'):'Saved result';return`${analysis.title||analysis.name||'Analysis result'} · ${significant}${p!==undefined?` · p = ${Number.isFinite(Number(p))?Number(p).toLocaleString(undefined,{maximumFractionDigits:6}):p}`:''}`};
export const openResultSearch=analysisId=>({openResult:analysisId});

export function buildProjectReviewModel(
  project,
  {
    documents = [],
    analyses = [],
    evidence = [],
    artifacts = [],
    datasets = [],
    correctiveActions = [],
    tollgateReviews = [],
  } = {},
) {
  const lifecycle = lifecycleForProject(project),
    PHASES = lifecycleStageLabels(lifecycle);
  const decorate = (item, kind) => ({
    ...item,
    sourceId: sourceId(item),
    phase: resolvePhase(item, kind, lifecycle),
    kind,
    stage: itemStage({ ...item, kind }),
    completion: completionFor(item),
    quality: qualityFor(item),
    qualityIssues: issuesFor(item),
    factType:
      kind === "analysis"
        ? "CALCULATED_RESULT"
        : /decision|action|approval/i.test(item.title || "")
          ? "DOCUMENTED_DECISION"
          : kind === "document"
            ? "USER_PROVIDED_FACT"
      : "MISSING_EVIDENCE",
  });
  const latestTollgates = Object.values(tollgateReviews.reduce((latest, item) => {
    const phase = item.lifecycle_phase || item.content?.phase;
    if (!phase || (latest[phase]?.content?.attempt || 0) >= (item.content?.attempt || 0)) return latest;
    return {...latest, [phase]: item};
  }, {}));
  const items = [
    ...(project.charter
      ? [
          decorate(
            {
              ...project.charter,
              id: "project-charter",
              title: "Project Charter",
              templateId: "charter",
              phase: "Define",
              values: project.charter,
            },
            "document",
          ),
        ]
      : []),
    ...documents.map((item) => decorate(item, "document")),
    ...datasets.map((item) =>
      decorate({ ...item, title: item.name, phase: "Measure" }, "dataset"),
    ),
    ...analyses.map((item) =>
      decorate(
        { ...item, title: item.title || item.name || "Analysis" },
        "analysis",
      ),
    ),
    ...evidence.map((item) => decorate(item, "evidence")),
    ...artifacts.map((item) => decorate(item, "artifact")),
    ...correctiveActions.map((item) => decorate({
      ...item,
      ...item.content,
      title: item.title,
      phase: item.lifecycle_phase || item.content?.lifecyclePhase || "Improve",
      values: {
        problemStatement: item.content?.problemStatement,
        action: item.content?.actionDescription,
        effectiveness: item.content?.effectivenessResult,
      },
    }, "corrective-action")),
    ...latestTollgates.map((item) => decorate({
      ...item,
      ...item.content,
      title: `${item.lifecycle_phase || item.content?.phase} Gate — ${item.status}`,
      phase: item.lifecycle_phase || item.content?.phase,
      values: {decision:item.content?.decision||item.status,reviewer:item.content?.decisionByName||item.content?.assignedReviewerName,date:item.content?.decisionAt||item.content?.submittedAt},
    }, "tollgate")),
  ];
  const phaseItems = (phase) => items.filter((item) => item.phase === phase);
  const oeSummaries = {
    Define: [
      [
        "Problem established",
        firstValue(phaseItems("Define"), [
          "problemStatement",
          "problem",
          "projectSummary",
        ]),
      ],
      [
        "Customer / business requirement",
        firstValue(phaseItems("Define"), [
          "businessCase",
          "businessNeed",
          "customerRequirement",
          "requirements",
        ]),
      ],
      [
        "Scope",
        firstValue(phaseItems("Define"), ["scopeIn", "scope", "processScope"]),
      ],
    ],
    Measure: [
      [
        "What are we measuring?",
        firstValue(phaseItems("Measure"), [
          "definitionRows",
          "characteristic",
          "metric",
        ]),
      ],
      [
        "How will we measure it?",
        firstValue(phaseItems("Measure"), [
          "collectionRows",
          "measurementRows",
          "objective",
        ]),
      ],
      [
        "Can we trust the measurement?",
        firstValue(phaseItems("Measure"), [
          "acceptanceDecision",
          "resultsSummary",
          "measurementSystem",
        ]),
      ],
      [
        "What is the baseline?",
        firstValue(phaseItems("Measure"), [
          "baselineNotes",
          "baselineRows",
          "current",
          "baseline",
        ]),
      ],
      [
        "How is the process performing?",
        datasets.length
          ? `${datasets.length} project dataset${datasets.length === 1 ? "" : "s"}`
          : "Not yet established",
      ],
    ],
    Analyze: [
      [
        "Causes investigated",
        firstValue(phaseItems("Analyze"), [
          "rootCauses",
          "causes",
          "hypotheses",
        ]),
      ],
      [
        "Statistical evidence",
        analyses.filter(
          (item) => resolvePhase(item, "analysis", lifecycle) === "Analyze",
        ).length
          ? `${analyses.filter((item) => resolvePhase(item, "analysis", lifecycle) === "Analyze").length} analysis result(s)`
          : "Not yet established",
      ],
      [
        "Conclusions",
        compactAnalysisSummary(analyses.find(item=>resolvePhase(item,"analysis",lifecycle)==="Analyze")) || firstValue(phaseItems("Analyze"), ["conclusions","resultsSummary","summary"]),
      ],
    ],
    Improve: [
      [
        "Solutions evaluated",
        firstValue(phaseItems("Improve"), [
          "solutions",
          "alternatives",
          "selectionRationale",
        ]),
      ],
      [
        "Piloted / implemented",
        firstValue(phaseItems("Improve"), [
          "pilotResults",
          "implementation",
          "actions",
        ]),
      ],
      [
        "Change achieved",
        firstValue(phaseItems("Improve"), [
          "results",
          "benefits",
          "improvement",
        ]),
      ],
    ],
    Control: [
      [
        "Sustainment approach",
        firstValue(phaseItems("Control"), [
          "controlMethod",
          "controlPlan",
          "sustainment",
        ]),
      ],
      [
        "Monitoring established",
        firstValue(phaseItems("Control"), [
          "monitoring",
          "frequency",
          "metrics",
        ]),
      ],
      [
        "Open items",
        firstValue(phaseItems("Control"), ["openItems", "actions", "followUp"]),
      ],
    ],
  };
  // PMBOK 8 Focus Area narratives (the 5 PM stages, renamed from PMBOK 6th Edition Process
  // Groups — same 5 stages, same PHASES/lifecycle stage labels, only the language and the
  // Performance Domain framing change). Each row pulls from the field ids the corresponding
  // Performance Domain's documents actually use (see config/pmpTemplates.js and
  // config/charterTemplate.js), the same firstValue-over-phaseItems pattern oeSummaries uses above,
  // so a PM project gets binder narratives as specific to its stage as an OE project's.
  const pmSummaries = {
    Initiation: [
      [
        "Mandate and business case",
        firstValue(phaseItems("Initiation"), [
          "projectSummary",
          "businessCase",
          "purpose",
        ]),
      ],
      [
        "Benefits and value case",
        firstValue(phaseItems("Initiation"), ["benefitRows", "financialImpact"]),
      ],
      [
        "Stakeholders identified",
        firstValue(phaseItems("Initiation"), ["stakeholders", "items"]),
      ],
    ],
    Planning: [
      [
        "Development approach and scope",
        firstValue(phaseItems("Planning"), ["wbsRows", "purpose", "approach"]),
      ],
      [
        "Schedule and cost baselines",
        firstValue(phaseItems("Planning"), ["scheduleRows", "items"]),
      ],
      [
        "Risk and uncertainty exposure",
        firstValue(phaseItems("Planning"), ["riskRows", "purpose"]),
      ],
    ],
    Execution: [
      [
        "Delivery governance and decisions",
        firstValue(phaseItems("Execution"), ["decisionRows", "items"]),
      ],
      ["Open issues and actions", firstValue(phaseItems("Execution"), ["items"])],
      [
        "Team performance",
        firstValue(phaseItems("Execution"), ["items"]),
      ],
    ],
    "Monitoring & Controlling": [
      [
        "Performance against baseline",
        firstValue(phaseItems("Monitoring & Controlling"), [
          "interpretation",
          "items",
        ]),
      ],
      [
        "Benefits tracked",
        firstValue(phaseItems("Monitoring & Controlling"), ["benefitRows"]),
      ],
      [
        "Risk and change activity",
        firstValue(phaseItems("Monitoring & Controlling"), ["items"]),
      ],
    ],
    Closing: [
      [
        "Formal closure and acceptance",
        firstValue(phaseItems("Closing"), ["items", "purpose"]),
      ],
      [
        "Benefits realized",
        firstValue(phaseItems("Closing"), ["benefitRows", "items"]),
      ],
      [
        "Lessons and knowledge transfer",
        firstValue(phaseItems("Closing"), ["items"]),
      ],
    ],
  };
  const summaries =
    lifecycle.id === "operational-excellence"
      ? oeSummaries
      : lifecycle.id === "project-management"
        ? pmSummaries
        : Object.fromEntries(
            PHASES.map((phase) => [
              phase,
              [
                [
                  "Connected records",
                  `${phaseItems(phase).length} connected asset(s)`,
                ],
                [
                  "Recorded context",
                  firstValue(phaseItems(phase), [
                    "summary",
                    "description",
                    "interpretation",
                    "notes",
                  ]),
                ],
              ],
            ]),
          );
  const requiredDocs = {
    Define: ["charter"],
    Measure: ["data-collection-plan"],
    Analyze: ["statistical-analysis-summary"],
    Improve: ["action-plan"],
    Control: ["control-plan"],
    // PM stage-readiness minimums (PMBOK 8 Focus Areas). Every id here must exist for the stage to
    // read "complete" — see the `.every()` check below, not `.some()`, since these are each a
    // minimum SET of required documents, not alternatives.
    Initiation: ["charter", "business-case"],
    Planning: ["wbs", "risk-register", "schedule-baseline"],
    Execution: ["issue-log", "action-item-log"],
    "Monitoring & Controlling": ["status-report", "evm-dashboard"],
    Closing: ["project-closure-report", "lessons-learned-report"],
  };
  const checks = [
    {
      id: "owner",
      label: "Project owner assigned",
      status:
        project.owner || project.sharedFields?.owner ? "complete" : "missing",
      action: "Assign a project owner.",
    },
    {
      id: "sponsor",
      label: "Sponsor assigned",
      status:
        project.champion || project.sharedFields?.sponsor
          ? "complete"
          : "missing",
      action: "Assign an accountable sponsor.",
    },
    {
      id: "date",
      label: "Target date established",
      status:
        project.targetDate || project.sharedFields?.targetDate
          ? "complete"
          : "missing",
      action: "Set a target completion date.",
    },
    ...PHASES.map((phase) => {
      // Every id in requiredDocs[phase] is a minimum required document for that stage, not a
      // choice of alternatives — a stage with two required documents needs both, not either. A
      // stage with no requiredDocs entry (none currently, but future suites may add stages before
      // populating this map) is trivially satisfied rather than blocked.
      const measureReadiness=lifecycle.id==="operational-excellence"&&phase==="Measure"?evaluateTollgateReadiness(project,"Measure",{documents,analyses,evidence,artifacts,datasets,correctiveActions}):null;
      const expected = requiredDocs[phase] || [],
        missing = expected.filter(
          (id) =>
            !items.some(
              (item) => item.kind === "document" && item.templateId === id,
            ),
        ),
        present = measureReadiness?measureReadiness.blockers.length===0:!missing.length;
      const phaseAssets = phaseItems(phase);
      const low = Boolean(measureReadiness?.warnings.length)||phaseAssets.some(
        (item) => item.quality !== null && item.quality < 70,
      );
      return {
        id: `stage-${phase}`,
        label: `${phase} stage readiness`,
        status: !present ? "missing" : low ? "attention" : "complete",
        action: !present
          ? measureReadiness?.blockers[0]?.label||`Add ${missing.map(humanize).join(" and ")}.`
          : low
            ? measureReadiness?.warnings[0]?.label||"Improve the flagged record quality."
            : "Stage evidence is present.",
      };
    }),
    {
      id: "analysis",
      label: "Analysis evidence present",
      status: analyses.length || evidence.length ? "complete" : "missing",
      action: "Save a relevant completed analysis.",
    },
    {
      id: "risks",
      label: "Critical risks addressed",
      status:
        (project.charter?.risks || []).some(
          (risk) => risk.risk && !risk.mitigation,
        ) || project.openRisks > 0
          ? "attention"
          : "complete",
      action: "Review open risks and mitigation owners.",
    },
    {
      id: "actions",
      label: "Open actions have owners and dates",
      status: (project.timeline || []).some(
        (item) => item.status !== "Complete" && (!item.owner || !item.date),
      )
        ? "attention"
        : "complete",
      action: "Assign owners and dates to open actions.",
    },
    {
      id: "approvals",
      label: "Required approvals recorded",
      status: (project.charter?.approvals || []).some(
        (item) => item.name && item.status,
      )
        ? "complete"
        : "missing",
      action: "Record accountable approval status.",
    },
  ];
  const weight = { complete: 1, attention: 0.5, missing: 0, optional: 1 };
  return {
    schemaVersion: 2,
    projectId: project.id,
    generatedAt: new Date().toISOString(),
    lifecycle,
    project: {
      name: project.name,
      status: project.status,
      phase: project.currentPhase,
      sharedFields: project.sharedFields || {},
    },
    narrativeContract: {
      factTypes: [
        "USER_PROVIDED_FACT",
        "CALCULATED_RESULT",
        "DOCUMENTED_DECISION",
        "AI_INTERPRETATION",
        "MISSING_EVIDENCE",
      ],
      sequence: PHASES,
    },
    references: {
      datasetIds: datasets.map((x) => x.id),
      documentIds: documents.map((x) => x.id),
      analysisIds: analyses.map((x) => x.id),
      evidenceIds: evidence.map((x) => x.id),
      artifactIds: artifacts.map((x) => x.id),
    },
    items,
    summaries,
    checks,
    readiness: Math.round(
      (checks.reduce((sum, check) => sum + weight[check.status], 0) /
        checks.length) *
        100,
    ),
  };
}

export default function ProjectBinder({
  project,
  documents,
  analyses,
  evidence,
  artifacts,
  datasets,
  correctiveActions = [],
  tollgateReviews = [],
  updateProject,
}) {
  const placement = useProjectPlacement(),
    [searchParams,setSearchParams] = useSearchParams(),
    [openResult, setOpenResult] = useState(null);
  const placedAnalyses=useMemo(()=>analysesWithProjectPlacements(analyses,placement.placements,project.id),[analyses,placement.placements,project.id]);
  useEffect(() => {
    const requested = searchParams.get("openResult");
    if (requested) {
      const saved = placedAnalyses.find((record) => sourceId(record) === requested);
      if (saved) setOpenResult(saved);
    }
  }, [placedAnalyses, searchParams]);
  useEffect(()=>{const requested=searchParams.get("phase");if(requested)window.setTimeout(()=>document.getElementById(`binder-phase-${requested.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`)?.scrollIntoView({block:"start"}),0)},[searchParams]);
  const placedLean = useMemo(
    () =>
      placement.placements
        .filter(
          (item) =>
            item.projectId === project.id &&
            item.sourceWorkflow === "lean-enterprise",
        )
        .map((item) => ({
          id: item.artifactId,
          sourceId: item.artifactId,
          title: item.metadata?.title || "Lean artifact",
          type: "lean-artifact",
          toolId: "lean-enterprise",
          sourceWorkflow: "lean-enterprise",
          phase: item.phase || "Improve",
          status: "active",
        })),
    [placement.placements, project.id],
  );
  const model = useMemo(
    () =>
      buildProjectReviewModel(project, {
        documents,
        analyses:placedAnalyses,
        evidence,
        artifacts: [
          ...artifacts,
          ...placedLean.filter(
            (item) => !artifacts.some((existing) => existing.id === item.id),
          ),
        ],
        datasets,
        correctiveActions,
        tollgateReviews,
      }),
    [project, documents, placedAnalyses, evidence, artifacts, datasets, correctiveActions, tollgateReviews, placedLean],
  );
  const configuredStages = lifecycleStageLabels(model.lifecycle);
  const PHASES = [
    ...configuredStages,
    ...[...new Set(model.items.map((item) => item.phase).filter(Boolean))].filter(
      (stage) => !configuredStages.includes(stage),
    ),
  ];
  const config = project.binderConfig || {
    order: [],
    hiddenIds: [],
    links: {},
  };
  const ordered = useMemo(
    () =>
      [...model.items].sort((a, b) => {
        if (a.phase !== b.phase)
          return stageRank(a, model.lifecycle) - stageRank(b, model.lifecycle);
        const ai = config.order.indexOf(a.sourceId),
          bi = config.order.indexOf(b.sourceId);
        return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi);
      }),
    [model.items, model.lifecycle, config.order],
  );
  const saveConfig = (next) =>
    updateProject(project.id, { binderConfig: { ...config, ...next } });
  const move = (id, delta) => {
    const item = ordered.find((x) => x.sourceId === id),
      ids = ordered
        .filter((x) => x.phase === item.phase)
        .map((x) => x.sourceId),
      from = ids.indexOf(id),
      to = Math.max(0, Math.min(ids.length - 1, from + delta));
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    saveConfig({
      order: [
        ...config.order.filter((existing) => !ids.includes(existing)),
        ...ids,
      ],
    });
  };
  const toggle = (id) =>
    saveConfig({
      hiddenIds: config.hiddenIds.includes(id)
        ? config.hiddenIds.filter((x) => x !== id)
        : [...config.hiddenIds, id],
    });
  const managePlacement = (item) => {
    const existing = placement.primaryPlacementFor(item.sourceId, project.id),
      analysis =
        placedAnalyses.find((record) => sourceId(record) === item.sourceId) || item;
    placement.requestPlacement(
      placementDraftForAnalysis(project.id, analysis, existing?.reportIncluded),
    );
  };
  return (
    <>
      <div className="project-binder" id="project-binder">
        <header>
          <div>
            <span>PROJECT INTELLIGENCE</span>
            <h2>Project Binder<HelpButton surfaceId="project-binder" suiteId={model.lifecycle.id}/></h2>
            <p>
              A continuous {model.lifecycle.methodology} review assembled from
              authoritative project records.
            </p>
          </div>
          <div
            className="binder-score"
            title="Readiness combines required documents, quality, evidence, ownership, dates, risks, actions, approvals, and phase coverage."
          >
            <strong>{model.readiness}%</strong>
            <span>Project readiness</span>
          </div>
        </header>
        <section className="binder-readiness">
          <h3>Readiness detail</h3>
          {model.checks.map((check) => (
            <div className={check.status} key={check.id}>
              <b>
                {check.status === "complete"
                  ? "✓"
                  : check.status === "attention"
                    ? "!"
                    : "×"}
              </b>
              <span>
                <strong>{check.label}</strong>
                <small>
                  {check.status === "complete"
                    ? "Complete"
                    : check.status === "attention"
                      ? "Needs attention"
                      : `Missing · ${check.action}`}
                </small>
              </span>
            </div>
          ))}
        </section>
        {PHASES.map((phase, phaseIndex) => (
          <React.Fragment key={phase}>
            {phaseIndex > 0 && (
              <div className="binder-transition" aria-hidden="true">
                ↓
              </div>
            )}
            <section className="binder-phase" id={`binder-phase-${phase.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>
              <header>
                <div>
                  <span>{phase.toUpperCase()} STAGE</span>
                  <h3>{phase}</h3>
                </div>
                <small>
                  {ordered.filter((item) => item.phase === phase).length}{" "}
                  connected asset(s)
                </small>
              </header>
              <div className="binder-summary">
                <strong>{phase.toUpperCase()} SUMMARY</strong>
                {(model.summaries[phase] || [
                  ["Recorded context", "Historical stage retained from the source record."],
                ]).map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <p>{value}</p>
                  </div>
                ))}
              </div>
              {[
                "Documents",
                "Evidence / Data",
                "Analyses",
                "Findings",
                "Decisions / Actions",
              ].map((stage) => {
                const stageItems = ordered.filter(
                  (item) => item.phase === phase && item.stage === stage,
                );
                return stageItems.length ? (
                  <div className="binder-stage" key={stage}>
                    <h4>
                      {stage}
                      <span>→</span>
                    </h4>
                    {stageItems.map((item) => (
                      <article
                        className={
                          config.hiddenIds.includes(item.sourceId)
                            ? "hidden"
                            : ""
                        }
                        key={`${item.kind}-${item.sourceId}`}
                      >
                        <i>{item.kind.charAt(0).toUpperCase()}</i>
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {item.kind} ·{" "}
                            {item.kind === "analysis" && item.workflowCluster ? `${item.phase} → ${item.workflowCluster} · ` : ""}
                            {item.completion === null
                              ? "Completion not scored"
                              : `${item.completion}% complete`}{" "}
                            ·{" "}
                            {item.quality === null
                              ? "Quality not scored"
                              : `${item.quality}/100 quality`}
                          </small>
                          {item.quality !== null && item.quality < 70 && (
                            <details>
                              <summary>Why quality needs attention</summary>
                              {item.qualityIssues.length ? (
                                <ul>
                                  {item.qualityIssues.map((issue) => (
                                    <li key={issue}>{issue}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p>
                                  Structured content is incomplete or lacks
                                  substantive detail.
                                </p>
                              )}
                            </details>
                          )}
                        </span>
                        <div>
                          {item.kind === "analysis" ? (
                            <>
                              <button
                                onClick={() => {const saved=placedAnalyses.find((record)=>sourceId(record)===item.sourceId)||item;setOpenResult(saved);setSearchParams(openResultSearch(item.sourceId));}}
                              >
                                Open Result
                              </button>
                              <button onClick={() => managePlacement(item)}>
                                Manage Placement
                              </button>
                            </>
                          ) : (
                            routeFor(project.id, item) && (
                              <Link
                                to={routeFor(project.id, item)}
                                state={{
                                  fromBinder: true,
                                  projectId: project.id,
                                  returnTab: "Project Binder",
                                  returnHash: "project-binder",
                                }}
                              >
                                Open / Edit
                              </Link>
                            )
                          )}
                          <button
                            onClick={() => move(item.sourceId, -1)}
                            aria-label="Move earlier"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => move(item.sourceId, 1)}
                            aria-label="Move later"
                          >
                            ↓
                          </button>
                          <button onClick={() => toggle(item.sourceId)}>
                            {config.hiddenIds.includes(item.sourceId)
                              ? "Include"
                              : "Hide"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null;
              })}
            </section>
          </React.Fragment>
        ))}
      </div>
      {openResult && (
        <SavedAnalysisResult
          analysis={openResult}
          onClose={() => {setOpenResult(null);const next=new URLSearchParams(searchParams);next.delete('openResult');setSearchParams(next)}}
        />
      )}
    </>
  );
}

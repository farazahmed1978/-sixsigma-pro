import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  lifecycleForProject,
  lifecycleStageLabels,
  resolveLifecycleStage,
  stageRank,
} from "../foundation/lifecycle";
import { NAVIGATION } from "../config/navigation";
import { navigationItems } from "../utils/navigationTools";
import { useProjectPlacement } from "../context/ProjectPlacementContext";
import SavedAnalysisResult from "./SavedAnalysisResult";
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
  const explicit = resolveLifecycleStage(item, lifecycle);
  if (explicit) return explicit.label;
  if (lifecycle.id !== "operational-excellence") return "";
  if (kind === "document")
    return (
      documentPhases.get(item.templateId) ||
      documentPhases.get(String(item.id || "").replace(/^document-/, "")) ||
      "Define"
    );
  if (kind === "analysis")
    return (
      analysisPhase[item.toolId] || toolPhases.get(item.toolId) || "Analyze"
    );
  if (kind === "evidence")
    return (
      analysisPhase[item.toolId] || analysisPhase[item.category] || "Analyze"
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
const itemStage = (item) =>
  item.kind === "document"
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

export function buildProjectReviewModel(
  project,
  {
    documents = [],
    analyses = [],
    evidence = [],
    artifacts = [],
    datasets = [],
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
        "Baseline established",
        firstValue(phaseItems("Measure"), [
          "baselineNotes",
          "baselineRows",
          "current",
          "baseline",
        ]),
      ],
      [
        "Data collected",
        datasets.length
          ? `${datasets.length} project dataset${datasets.length === 1 ? "" : "s"}`
          : "Not yet established",
      ],
      [
        "Measurement system",
        firstValue(phaseItems("Measure"), [
          "acceptanceDecision",
          "resultsSummary",
          "measurementSystem",
        ]),
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
        firstValue(phaseItems("Analyze"), [
          "conclusions",
          "resultsSummary",
          "interpretation",
          "summary",
        ]),
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
  const summaries =
    lifecycle.id === "operational-excellence"
      ? oeSummaries
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
      const expected = requiredDocs[phase] || [],
        present =
          !expected.length ||
          expected.some((id) =>
            items.some(
              (item) => item.kind === "document" && item.templateId === id,
            ),
          );
      const phaseAssets = phaseItems(phase);
      const low = phaseAssets.some(
        (item) => item.quality !== null && item.quality < 70,
      );
      return {
        id: `stage-${phase}`,
        label: `${phase} stage readiness`,
        status: !present ? "missing" : low ? "attention" : "complete",
        action: !present
          ? `Add ${expected.map(humanize).join(" or ")}.`
          : low
            ? "Improve the flagged record quality."
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
  updateProject,
}) {
  const placement = useProjectPlacement(),
    [searchParams] = useSearchParams(),
    [openResult, setOpenResult] = useState(null);
  useEffect(() => {
    const requested = searchParams.get("openResult");
    if (requested) {
      const saved = analyses.find((record) => sourceId(record) === requested);
      if (saved) setOpenResult(saved);
    }
  }, [analyses, searchParams]);
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
        analyses,
        evidence,
        artifacts: [
          ...artifacts,
          ...placedLean.filter(
            (item) => !artifacts.some((existing) => existing.id === item.id),
          ),
        ],
        datasets,
      }),
    [project, documents, analyses, evidence, artifacts, datasets, placedLean],
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
        analyses.find((record) => sourceId(record) === item.sourceId) || item;
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
            <h2>Project Binder</h2>
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
            <section className="binder-phase">
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
                                onClick={() =>
                                  setOpenResult(
                                    analyses.find(
                                      (record) =>
                                        sourceId(record) === item.sourceId,
                                    ) || item,
                                  )
                                }
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
          onClose={() => setOpenResult(null)}
        />
      )}
    </>
  );
}

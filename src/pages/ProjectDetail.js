import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useProjects } from "../context/ProjectsContext";
import { useWorksheet } from "../context/WorksheetContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useReport } from "../context/ReportContext";
import { useProjectPlacement } from "../context/ProjectPlacementContext";
import ProjectBinder from "../components/ProjectBinder";
import ProjectRisks from "../components/ProjectRisks";
import ProjectActions from "../components/ProjectActions";
import ProjectIssues from "../components/ProjectIssues";
import ProjectDecisions from "../components/ProjectDecisions";
import ProjectApprovals from "../components/ProjectApprovals";
import SavedAnalysisResult from "../components/SavedAnalysisResult";
import { useInteractions } from "../context/InteractionContext";
import {
  documentActivityRoute,
  newDatasetLocation,
  projectDatasetInventory,
  worksheetDatasetLocation,
} from "../utils/projectHub";
import {
  lifecycleForProject,
  lifecycleStageLabels,
} from "../foundation/lifecycle";
import HelpButton from "../components/HelpButton";
import "./ProjectDetail.css";

// Central, queryable tab membership: which suite(s) a Project Hub tab applies to. Analyses and
// Placements are OE-only (statistical analyses and their DMAIC workflow-cluster placement don't
// exist as a PM concept yet); Risks/Actions/Issues/Decisions/Approvals are PM-only governance
// surfaces. Everything else applies to both. A future PM-specific analysis surface should add
// 'project-management' to Analyses' suites here, not add a parallel PM-only tab elsewhere.
export const TAB_DEFINITIONS = [
  { id: "project-home", label: "Project Home", suites: ["operational-excellence", "project-management"] },
  { id: "project-settings", label: "Project Settings", suites: ["operational-excellence", "project-management"] },
  { id: "documents", label: "Documents", suites: ["operational-excellence", "project-management"] },
  { id: "datasets", label: "Datasets", suites: ["operational-excellence", "project-management"] },
  { id: "analyses", label: "Analyses", suites: ["operational-excellence"] },
  { id: "placements", label: "Placements", suites: ["operational-excellence"] },
  { id: "risks", label: "Risks", suites: ["project-management"] },
  { id: "issues", label: "Issues", suites: ["project-management"] },
  { id: "actions", label: "Actions", suites: ["project-management"] },
  { id: "decisions", label: "Decisions", suites: ["project-management"] },
  { id: "approvals", label: "Approvals", suites: ["project-management"] },
  { id: "evidence-library", label: "Evidence Library", suites: ["operational-excellence", "project-management"] },
  { id: "artifacts", label: "Artifacts", suites: ["operational-excellence", "project-management"] },
  { id: "project-binder", label: "Project Binder", suites: ["operational-excellence", "project-management"] },
  { id: "reports", label: "Reports", suites: ["operational-excellence", "project-management"] },
  { id: "team", label: "Team", suites: ["operational-excellence", "project-management"] },
  { id: "timeline", label: "Timeline", suites: ["operational-excellence", "project-management"] },
];
// Suite-specific tab order. PM's order puts governance tabs (its most-used surfaces) right after
// Documents and pushes Datasets — an OE-oriented, rarely-used-on-PM-projects surface — to the end.
// A suite without an entry here falls back to TAB_DEFINITIONS' own declaration order (OE's order).
export const TAB_ORDER = {
  "project-management": ["project-home", "project-settings", "documents", "risks", "issues", "actions", "decisions", "approvals", "evidence-library", "artifacts", "project-binder", "reports", "team", "timeline", "datasets"],
};
export const tabsForSuite = (suiteId) => {
  const order = TAB_ORDER[suiteId] || TAB_DEFINITIONS.map((item) => item.id);
  return order
    .map((id) => TAB_DEFINITIONS.find((item) => item.id === id))
    .filter((item) => item && item.suites.includes(suiteId));
};
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "Not recorded";

function Empty({ title, body, action }) {
  return (
    <div className="ph-empty">
      <div>◇</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    getProject,
    updateProject,
    addEvidence,
    removeEvidence,
    addArtifact,
    updateArtifact,
    removeArtifact,
  } = useProjects();
  const {
    datasets,
    renameDataset,
    duplicateDataset,
    archiveDataset,
    deleteDataset,
  } = useWorksheet();
  const { analysisResults, duplicateAnalysis, deleteAnalysis, updateAnalysis } =
    useAnalysis();
  const { items: reportItems, addReportItem } = useReport();
  const placement = useProjectPlacement();
  const { confirm, requestForm, toast } = useInteractions();
  const [tab, setTab] = useState(
    () => location.state?.returnTab || "Project Home",
  );
  const [analysisQuery, setAnalysisQuery] = useState("");
  const [analysisFilter, setAnalysisFilter] = useState("All");
  const [analysisSort, setAnalysisSort] = useState("Newest");
  const [expandedDataset, setExpandedDataset] = useState("");
  const [evidenceFilter, setEvidenceFilter] = useState("All");
  const [openResult, setOpenResult] = useState(null);
  const artifactInput = useRef(null);
  const project = getProject(id);
  const lifecycle = lifecycleForProject(project || {}),
    lifecycleStages = lifecycleStageLabels(lifecycle);
  const suiteId = lifecycle.id;
  const tabDefinitions = tabsForSuite(suiteId);
  const visibleTabs = tabDefinitions.map((item) => item.label);
  const activeTabId = tabDefinitions.find((item) => item.label === tab)?.id;
  const [settings, setSettings] = useState(() => ({
    name: project?.name || "",
    goal: project?.goal || "",
    owner: project?.owner || "",
    champion: project?.champion || "",
    targetDate: project?.targetDate || "",
    status: project?.status || "Active",
    currentPhase: project?.currentPhase || lifecycleStages[0] || "Define",
  }));
  const projectDatasets = projectDatasetInventory(datasets, id);
  const projectAnalyses = analysisResults.filter(
    (item) => item.projectId === id,
  );
  const projectReports = reportItems.filter((item) => item.projectId === id);
  const documents = useMemo(
    () => Object.values(project?.documents || {}),
    [project],
  );
  const evidence = useMemo(() => project?.evidenceLibrary || [], [project]);
  const artifacts = project?.artifacts || [];
  const recentActivity = useMemo(
    () =>
      [
        ...(project?.activityLog || []).map((item) => ({
          ...item,
          title: item.action,
          type: item.assetType || "Activity",
          date: item.at,
          route: documentActivityRoute(id, item, project?.documents),
        })),
        ...documents.map((item) => ({
          assetId: item.id,
          title: item.title,
          type: "Document",
          date: item.updatedAt,
          route: `/projects/${id}/documents/${item.templateId}`,
        })),
        ...projectDatasets.map((item) => ({
          assetId: item.id,
          title: item.name,
          type: "Dataset",
          date: item.updatedAt,
          location: worksheetDatasetLocation(id, item.id),
        })),
        ...evidence.map((item) => ({
          title: item.title,
          type: "Evidence",
          date: item.updatedAt || item.createdAt,
        })),
        ...projectReports.map((item) => ({
          title: item.title,
          type: "Report",
          date: item.timestamp,
        })),
      ]
        .filter((item) => item.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 6),
    [
      documents,
      evidence,
      id,
      project?.activityLog,
      project?.documents,
      projectDatasets,
      projectReports,
    ],
  );
  const downloadArtifact = (item) => {
    if (item.downloadUrl) {
      window.open(item.downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const blob = new Blob(
        [item.content?.text || JSON.stringify(item.content || item, null, 2)],
        { type: item.mimeType || "application/json" },
      ),
      url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download =
      item.fileName ||
      `${item.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${item.mimeType === "application/pdf" ? "pdf" : "json"}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const uploadArtifact = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      addArtifact(id, {
        title: file.name,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        type: "supporting-file",
        description: "Project-owned auxiliary supporting artifact.",
        downloadUrl: reader.result,
      });
      toast(`${file.name} added to project artifacts.`);
      if (artifactInput.current) artifactInput.current.value = "";
    };
    reader.readAsDataURL(file);
  };
  useEffect(() => {
    if (location.state?.returnTab) setTab(location.state.returnTab);
    if (location.state?.returnHash)
      window.setTimeout(
        () =>
          document
            .getElementById(location.state.returnHash)
            ?.scrollIntoView({ block: "start" }),
        0,
      );
  }, [location.state]);
  // Suite isolation guard: a tab the current suite doesn't define (e.g. "Analyses" reached via
  // stale returnTab navigation state on a PM project, or by switching projects mid-session) must
  // never render that tab's content — TAB_DEFINITIONS' suites list is the single source of truth
  // for what's valid, not just what's clickable in the nav.
  useEffect(() => {
    if (!visibleTabs.includes(tab)) setTab("Project Home");
  }, [visibleTabs, tab]);
  useEffect(() => {
    if (project)
      setSettings({
        name: project.name || "",
        goal: project.goal || "",
        owner: project.owner || "",
        champion: project.champion || "",
        targetDate: project.targetDate || "",
        status: project.status || "Active",
        currentPhase: project.currentPhase || lifecycleStages[0] || "Define",
      });
  }, [project, lifecycleStages]);
    useEffect(() => {
    const host = document.querySelector(".project-hub .ph-hub-actions");
    if (!host) return;
    let button = host.querySelector("[data-edit-project]");
    if (!button) {
      button = document.createElement("button");
      button.dataset.editProject = "true";
      button.textContent = "Edit Project";
      host.prepend(button);
    }
    const open = () => setTab("Project Settings");
    button.addEventListener("click", open);
    const createDocument = [...host.querySelectorAll("a")].find(
      (link) => link.textContent === "Create Document",
    );
    if (createDocument) createDocument.hidden = tab === "Artifacts";
    if (tab === "Artifacts")
      document
        .querySelectorAll(".project-hub .ph-card-actions a")
        .forEach((link) => {
          if (link.textContent === "Open")
            link.textContent = "Open Source Document";
        });
    return () => button.removeEventListener("click", open);
  }, [tab]);
  useEffect(() => {
    if (tab !== "Datasets") return;
    const actions = [
      ...document.querySelectorAll(".project-hub .ph-card-actions"),
    ];
    const cleanups = projectDatasets.map((dataset, index) => {
      const host = actions[index];
      if (!host) return null;
      let button = host.querySelector("[data-open-dataset]");
      if (!button) {
        button = document.createElement("button");
        button.dataset.openDataset = "true";
        button.textContent = "Open / Switch";
        host.prepend(button);
      }
      const open = () => navigate(worksheetDatasetLocation(id, dataset.id));
      button.addEventListener("click", open);
      return () => button.removeEventListener("click", open);
    });
    return () => cleanups.forEach((cleanup) => cleanup?.());
  }, [id, navigate, projectDatasets, tab]);
  useEffect(() => {
    const links = [...document.querySelectorAll(".project-hub a")].filter(
      (link) =>
        link.textContent.trim() === "Add Dataset" ||
        link.textContent.trim() === "+ Add Dataset",
    );
    const startNew = (event) => {
      event.preventDefault();
      navigate(newDatasetLocation(id));
    };
    links.forEach((link) => link.addEventListener("click", startNew));
    return () =>
      links.forEach((link) => link.removeEventListener("click", startNew));
  }, [id, navigate, tab]);
  useEffect(() => {
    const links = [...document.querySelectorAll(".project-hub a")].filter(
      (link) => link.textContent.trim() === "Run Analysis",
    );
    const openCatalog = (event) => {
      event.preventDefault();
      navigate("/analysis", { state: { projectId: id } });
    };
    links.forEach((link) => link.addEventListener("click", openCatalog));
    return () =>
      links.forEach((link) => link.removeEventListener("click", openCatalog));
  }, [id, navigate]);
  useEffect(() => {
    const cards = [
      ...document.querySelectorAll(".project-hub .ph-activity>div"),
    ];
    const cleanups = cards.map((card, index) => {
      const item = recentActivity[index],
        destination = item?.route || item?.location;
      if (!destination) return null;
      const open = () => navigate(destination);
      const key = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      };
      card.classList.add("clickable");
      card.tabIndex = 0;
      card.setAttribute("role", "link");
      card.addEventListener("click", open);
      card.addEventListener("keydown", key);
      return () => {
        card.removeEventListener("click", open);
        card.removeEventListener("keydown", key);
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup?.());
  }, [navigate, recentActivity]);
  if (!project)
    return (
      <div className="ph-not-found">
        <h1>Project not found</h1>
        <Link className="btn-primary" to="/projects">
          Back to Projects
        </Link>
      </div>
    );

  const saveAnalysis = (analysis) => {
    const dataset = projectDatasets.find((item) =>
      (analysis.datasetIds || []).includes(item.id),
    );
    addEvidence(id, {
      title: analysis.title || analysis.name || "Completed Analysis",
      category:
        analysis.category || analysis.phase || analysis.toolId || "Other",
      dataset: dataset?.name || "",
      datasetIds: analysis.datasetIds || [],
      date: analysis.createdAt || new Date().toISOString(),
      author: analysis.author || project.owner || "",
      summary: analysis.interpretation || analysis.summary || "",
      linkedReportIds: analysis.linkedReportIds || [],
      linkedDocumentIds: analysis.linkedDocumentIds || [],
      assetType: "analysis",
      sourceType: "analysisResult",
      sourceId: analysis.id,
      analysisIds: [analysis.id],
      phase: analysis.phase || "",
    });
  };
  const managedAnalyses = projectAnalyses
    .filter(
      (item) =>
        `${item.title || item.name || item.id} ${item.phase || ""} ${item.toolId || ""}`
          .toLowerCase()
          .includes(analysisQuery.toLowerCase()) &&
        (analysisFilter === "All" ||
          (item.phase || item.category || "Other") === analysisFilter),
    )
    .sort((a, b) =>
      analysisSort === "Oldest"
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : analysisSort === "Name"
          ? String(a.title || a.name).localeCompare(String(b.title || b.name))
          : new Date(b.createdAt) - new Date(a.createdAt),
    );
  const team = project.team || [];
  const timeline = project.timeline || [];
  const updateCollection = (key, value) => updateProject(id, { [key]: value });
  const currentPhase =
    project.currentPhase ||
    lifecycleStages.find(
      (stage) => (project.phases?.[stage]?.itemIds || []).length === 0,
    ) ||
    lifecycleStages.at(-1) ||
    "";
  const targetDate = project.targetDate || project.charter?.targetDate;
  const completion = Math.min(
    100,
    Math.round(
      ((documents.length +
        (project.charter ? 1 : 0) +
        projectDatasets.length +
        projectAnalyses.length +
        evidence.length) /
        10) *
        100,
    ),
  );
  const qualityScore = documents.length
    ? Math.round(
        documents.reduce(
          (sum, document) =>
            sum +
            (Object.values(document.values || {}).filter((value) =>
              Array.isArray(value) ? value.length : String(value || "").trim(),
            ).length /
              Math.max(1, Object.keys(document.values || {}).length)) *
              100,
          0,
        ) / documents.length,
      )
    : 0;
  const daysRemaining = targetDate
    ? Math.ceil((new Date(targetDate) - new Date()) / 86400000)
    : null;
  const riskDocument = documents.find(
    (document) => document.templateId === "risk-register",
  );
  const openRisks = (riskDocument?.values?.riskRows || []).filter(
    (risk) => !["Closed", "Resolved"].includes(risk.status),
  ).length;
  const upcomingTasks = timeline
    .filter((item) => item.status !== "Complete")
    .sort(
      (a, b) =>
        new Date(a.date || "9999-12-31") - new Date(b.date || "9999-12-31"),
    )
    .slice(0, 5);
  const renameItem = async (title, value, onSave) => {
    const values = await requestForm({
      title,
      submitLabel: "Rename",
      fields: [{ name: "name", label: "Name", value, required: true }],
    });
    if (values) {
      onSave(values.name.trim());
      toast("Name updated.");
    }
  };
  const requestLink = async (label, onSave) => {
    const values = await requestForm({
      title: `Link ${label}`,
      submitLabel: `Link ${label}`,
      fields: [{ name: "id", label: `${label} ID`, required: true }],
    });
    if (values) onSave(values.id.trim());
  };
  const removeWithConfirmation = async ({
    title,
    message,
    label,
    onRemove,
  }) => {
    if (
      await confirm({ title, message, confirmLabel: label, destructive: true })
    ) {
      onRemove();
      toast(`${label.replace(/^Delete |^Remove /, "")} removed.`);
    }
  };
  const renderTab = () => {
    if (tab === "Risks") return <ProjectRisks project={project} />;
    if (tab === "Actions") return <ProjectActions project={project} />;
    if (tab === "Issues") return <ProjectIssues project={project} />;
    if (tab === "Decisions") return <ProjectDecisions project={project} />;
    if (tab === "Approvals") return <ProjectApprovals project={project} />;
    if (tab === "Project Settings")
      return (
        <form
          className="ph-manager ph-settings"
          onSubmit={async (event) => {
            event.preventDefault();
            const values = {
              ...settings,
              name: settings.name.trim(),
              owner: settings.owner.trim(),
              champion: settings.champion.trim(),
            };
            await updateProject(id, {
              ...values,
              sharedFields: {
                ...(project.sharedFields || {}),
                owner: values.owner,
                sponsor: values.champion,
                targetDate: values.targetDate,
              },
            });
            toast("Project updated.");
          }}
        >
          <header>
            <div>
              <span>PROJECT SETTINGS</span>
              <h2>Authoritative project details</h2>
              <p>
                Shared project fields synchronize with connected workspaces.
              </p>
            </div>
          </header>
          <div className="ph-settings-grid">
            <label>
              Project Name
              <input
                required
                value={settings.name}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Goal / Objective
              <textarea
                value={settings.goal}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    goal: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Owner
              <input
                value={settings.owner}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    owner: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Sponsor
              <input
                value={settings.champion}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    champion: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Target Date
              <input
                type="date"
                value={settings.targetDate}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    targetDate: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Status
              <select
                value={settings.status}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    status: event.target.value,
                  }))
                }
              >
                {["Active", "On Hold", "Complete", "Cancelled"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              {lifecycle.methodology} Stage
              <select
                value={settings.currentPhase}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    currentPhase: event.target.value,
                  }))
                }
              >
                {lifecycleStages.map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <button className="btn-primary" type="submit">
            Save Project Settings
          </button>
        </form>
      );
    if (tab === "Artifacts")
      return (
        <div className="ph-manager">
          <header>
            <div>
              <span>PROJECT ARTIFACTS</span>
              <h2>Auxiliary project deliverables</h2>
              <p>
                Upload PDFs, images, spreadsheets, presentations, diagrams, and
                other supporting files. Structured Aureqin documents remain in
                Documents.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => artifactInput.current?.click()}
            >
              + Add Artifact
            </button>
            <input
              ref={artifactInput}
              hidden
              type="file"
              onChange={(event) => uploadArtifact(event.target.files?.[0])}
            />
          </header>
          {artifacts.length ? (
            <div className="ph-grid">
              {artifacts.map((item) => (
                <article className="ph-card" key={item.id}>
                  <span>
                    {item.phase || "PROJECT"} · {item.type || "ARTIFACT"} ·{" "}
                    {item.status || "active"}
                  </span>
                  <h3>{item.title}</h3>
                  <p>
                    {item.description ||
                      `Generated ${formatDate(item.createdAt)}`}
                  </p>
                  <div className="ph-card-actions">
                    {item.sourceDocumentId && (
                      <Link
                        to={`/projects/${id}/documents/${item.sourceTemplateId}`}
                      >
                        Open Source Document
                      </Link>
                    )}
                    <button onClick={() => downloadArtifact(item)}>
                      Open / Download
                    </button>
                    <button
                      onClick={() =>
                        renameItem("Rename artifact", item.title, (title) =>
                          updateArtifact(id, item.id, { title }),
                        )
                      }
                    >
                      Rename
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        removeWithConfirmation({
                          title: "Delete artifact?",
                          message: `“${item.title}” will be removed from this project. This cannot be undone.`,
                          label: "Delete Artifact",
                          onRemove: () => removeArtifact(id, item.id),
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="No project artifacts yet"
              body="Add a project-owned supporting file without duplicating structured Aureqin documents."
            />
          )}
        </div>
      );
    if (tab === "Project Binder")
      return (
        <ProjectBinder
          project={project}
          documents={documents}
          analyses={projectAnalyses}
          evidence={evidence}
          artifacts={artifacts}
          datasets={projectDatasets}
          updateProject={updateProject}
        />
      );
    if (tab === "Project Home")
      return (
        <>
          <div className="ph-intelligence">
            <div>
              <span>Documents Completed</span>
              <strong>
                {documents.filter((document) => document.status === "complete")
                  .length + (project.charter && completion === 100 ? 1 : 0)}
              </strong>
            </div>
            <div>
              <span>Datasets</span>
              <strong>
                {
                  projectDatasets.filter((dataset) => !dataset.archivedAt)
                    .length
                }
              </strong>
            </div>
            <div>
              <span>Analyses</span>
              <strong>{projectAnalyses.length}</strong>
            </div>
            <div>
              <span>Reports</span>
              <strong>{projectReports.length}</strong>
            </div>
            <div>
              <span>Open Risks</span>
              <strong>{openRisks}</strong>
            </div>
            <div>
              <span>Quality Score</span>
              <strong>
                {qualityScore}
                <small>/100</small>
              </strong>
            </div>
            <div>
              <span>Days Remaining</span>
              <strong>{daysRemaining === null ? "—" : daysRemaining}</strong>
            </div>
          </div>
          <div className="ph-dashboard-grid">
            <section className="ph-section">
              <div className="ph-section-title">
                <div>
                  <span>RECENT ACTIVITY</span>
                  <h2>Latest updates</h2>
                </div>
              </div>
              {recentActivity.length ? (
                <div className="ph-activity">
                  {recentActivity.map((item, index) => (
                    <div key={`${item.type}-${item.title}-${index}`}>
                      <i>{item.type.charAt(0)}</i>
                      <span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.type} · {formatDate(item.date)}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ph-muted">No activity yet.</p>
              )}
            </section>
            <section className="ph-section">
              <div className="ph-section-title">
                <div>
                  <span>UPCOMING TASKS</span>
                  <h2>Next milestones</h2>
                </div>
              </div>
              {upcomingTasks.length ? (
                <div className="ph-task-list">
                  {upcomingTasks.map((item) => (
                    <div key={item.id}>
                      <span>
                        <strong>{item.milestone}</strong>
                        <small>{item.owner || "Unassigned"}</small>
                      </span>
                      <time>{formatDate(item.date)}</time>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="ph-muted">Add milestones in the Timeline tab.</p>
              )}
            </section>
          </div>
          <section className="ph-section">
            <div className="ph-section-title">
              <div>
                <span>{lifecycle.methodology}</span>
                <h2>Phase workspaces</h2>
              </div>
            </div>
            <div className="ph-phases">
              {lifecycle.stages.filter((stage) => stage.recommendedDocumentId).map((stage) => (
                <Link
                  key={stage.id}
                  to={
                    stage.recommendedDocumentId === "charter"
                      ? `/projects/${id}/charter`
                      : `/projects/${id}/documents/${stage.recommendedDocumentId}`
                  }
                >
                  <i className={`badge-${stage.id}`}>
                    {stage.label.charAt(0)}
                  </i>
                  <strong>{stage.label}</strong>
                  <span>Open workspace →</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      );
    if (tab === "Documents")
      return documents.length || project.charter ? (
        <div className="ph-grid">
          {project.charter && (
            <Link className="ph-card" to={`/projects/${id}/charter`}>
              <span>DEFINE</span>
              <h3>Project Charter</h3>
              <p>Updated {formatDate(project.charter.updatedAt)}</p>
            </Link>
          )}
          {documents.map((document) => (
            <Link
              className="ph-card"
              key={document.id}
              to={`/projects/${id}/documents/${document.templateId}`}
            >
              <span>{document.status || "Draft"}</span>
              <h3>{document.title}</h3>
              <p>Updated {formatDate(document.updatedAt)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title="No project documents yet"
          body="Open a DMAIC or PMP workspace to create the first project document."
          action={
            <Link className="btn-primary" to="/templates">
              Document Library
            </Link>
          }
        />
      );
    if (tab === "Datasets")
      return projectDatasets.length ? (
        <div className="ph-manager">
          <header>
            <div>
              <span>DATASET MANAGER</span>
              <h2>Project datasets</h2>
            </div>
            <Link className="btn-primary" to="/worksheet">
              + Add Dataset
            </Link>
          </header>
          <div className="ph-grid">
            {projectDatasets.map((dataset) => (
              <article
                className={`ph-card ${dataset.archivedAt ? "archived" : ""}`}
                key={dataset.id}
              >
                <span>{dataset.archivedAt ? "ARCHIVED" : "DATASET"}</span>
                <h3>{dataset.name}</h3>
                <p>
                  {dataset.columns.length} columns ·{" "}
                  {Math.max(
                    0,
                    ...dataset.columns.map((column) => column.data.length),
                  )}{" "}
                  rows · Updated {formatDate(dataset.updatedAt)}
                </p>
                <div className="ph-card-actions">
                  <button
                    onClick={() =>
                      renameItem("Rename dataset", dataset.name, (name) =>
                        renameDataset(dataset.id, name),
                      )
                    }
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      duplicateDataset(dataset.id);
                      toast("Dataset duplicated.");
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() =>
                      removeWithConfirmation({
                        title: dataset.archivedAt
                          ? "Restore dataset?"
                          : "Archive dataset?",
                        message: dataset.archivedAt
                          ? `“${dataset.name}” will return to active datasets.`
                          : `“${dataset.name}” will be archived and remain recoverable.`,
                        label: dataset.archivedAt
                          ? "Restore Dataset"
                          : "Archive Dataset",
                        onRemove: () => archiveDataset(dataset.id),
                      })
                    }
                  >
                    {dataset.archivedAt ? "Restore" : "Archive"}
                  </button>
                  <button
                    onClick={() =>
                      setExpandedDataset(
                        expandedDataset === dataset.id ? "" : dataset.id,
                      )
                    }
                  >
                    History
                  </button>
                  <button
                    className="danger"
                    onClick={() =>
                      removeWithConfirmation({
                        title: "Delete dataset?",
                        message: `“${dataset.name}” will be permanently removed. This cannot be undone.`,
                        label: "Delete Dataset",
                        onRemove: () => deleteDataset(dataset.id),
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
                {expandedDataset === dataset.id && (
                  <div className="ph-history">
                    <strong>Metadata</strong>
                    <p>
                      {dataset.description || "No description"} · Source:{" "}
                      {dataset.source || "worksheet"} · Created{" "}
                      {formatDate(dataset.createdAt)}
                    </p>
                    <strong>Version History</strong>
                    {(dataset.history || []).map((item) => (
                      <p key={item.id}>
                        {item.action}
                        <small>{formatDate(item.at)}</small>
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <Empty
          title="No project datasets"
          body="Assign or create a dataset from the Data Worksheet."
          action={
            <Link className="btn-primary" to="/worksheet">
              Open Worksheet
            </Link>
          }
        />
      );
    if (tab === "Analyses")
      return (
        <div className="ph-manager">
          <header>
            <div>
              <span>ANALYSIS MANAGER</span>
              <h2>Completed analyses</h2>
            </div>
          </header>
          <div className="ph-manager-controls">
            <input
              type="search"
              value={analysisQuery}
              onChange={(event) => setAnalysisQuery(event.target.value)}
              placeholder="Search analyses"
            />
            <select
              value={analysisFilter}
              onChange={(event) => setAnalysisFilter(event.target.value)}
            >
              <option>All</option>
              {[
                ...new Set(
                  projectAnalyses.map(
                    (item) => item.phase || item.category || "Other",
                  ),
                ),
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <select
              value={analysisSort}
              onChange={(event) => setAnalysisSort(event.target.value)}
            >
              <option>Newest</option>
              <option>Oldest</option>
              <option>Name</option>
            </select>
          </div>
          {managedAnalyses.length ? (
            <div className="ph-grid">
              {managedAnalyses.map((analysis) => (
                <article className="ph-card" key={analysis.id}>
                  <span>
                    {analysis.phase || analysis.category || "ANALYSIS"}
                  </span>
                  <h3>{analysis.title || analysis.name || analysis.id}</h3>
                  <p>{formatDate(analysis.createdAt)}</p>
                  <div className="ph-card-actions">
                    {analysis.toolId && (
                      <Link to={`/tool/${analysis.toolId}`}>Open</Link>
                    )}
                    <button
                      onClick={() => {
                        duplicateAnalysis(analysis.id);
                        toast("Analysis duplicated.");
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={async () => {
                        const reportId = await addReportItem({
                          toolId: analysis.toolId || "analysis",
                          title: analysis.title || analysis.name || "Analysis",
                          timestamp: new Date().toISOString(),
                          projectId: id,
                          analysisId: analysis.id,
                          statsSummary: analysis.statsSummary || {},
                          interpretation:
                            analysis.interpretation || analysis.summary || "",
                        });
                        updateAnalysis(analysis.id, {
                          linkedReportIds: [
                            ...(analysis.linkedReportIds || []),
                            reportId,
                          ],
                        });
                        toast("Analysis linked to report.");
                      }}
                    >
                      Link to Report
                    </button>
                    <button
                      onClick={() =>
                        requestLink("Document", (documentId) =>
                          updateAnalysis(analysis.id, {
                            linkedDocumentIds: [
                              ...(analysis.linkedDocumentIds || []),
                              documentId,
                            ],
                          }),
                        )
                      }
                    >
                      Link to Document
                    </button>
                    <button
                      onClick={() => {
                        saveAnalysis(analysis);
                        toast("Analysis saved to Evidence Library.");
                      }}
                    >
                      Save Evidence
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        removeWithConfirmation({
                          title: "Delete analysis?",
                          message:
                            "This analysis record will be permanently removed. This cannot be undone.",
                          label: "Delete Analysis",
                          onRemove: () => deleteAnalysis(analysis.id),
                        })
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="No matching analyses"
              body="Completed statistical analyses connected to this project will appear here."
            />
          )}
        </div>
      );
    if (tab === "Placements") {
      const placed = projectAnalyses.map((analysis) => ({
        analysis,
        placement: placement.placementForLegacy(analysis),
      }));
      return (
        <div className="ph-manager">
          <header>
            <div>
              <span>PROJECT PLACEMENT</span>
              <h2>Analysis locations</h2>
            </div>
          </header>
          {placed.length ? (
            <div className="ph-grid">
              {placed.map(({ analysis, placement: item }) => (
                <article className="ph-card" key={analysis.id}>
                  <span>
                    {item.metadata?.legacyDerived
                      ? "SUGGESTED LOCATION"
                      : "PRIMARY PLACEMENT"}
                  </span>
                  <h3>{analysis.title || analysis.name || analysis.id}</h3>
                  <p>
                    {item.phase} → {item.workflowCluster}
                  </p>
                  <p>
                    {analysis.method || analysis.toolId || "Analysis"} ·{" "}
                    {formatDate(analysis.createdAt)} ·{" "}
                    {item.reportIncluded
                      ? "Included in report"
                      : "Not included in report"}
                  </p>
                  <div className="ph-card-actions">
                    <button
                      onClick={() =>
                        placement.requestPlacement({
                          artifactId: analysis.id,
                          projectId: id,
                          toolId: analysis.toolId,
                          title: analysis.title || analysis.name || "Analysis",
                          analysis,
                          reportItem: {
                            toolId: analysis.toolId || "analysis",
                            phase: analysis.phase,
                            title:
                              analysis.title || analysis.name || "Analysis",
                            statsSummary: analysis.statsSummary || {},
                            interpretation:
                              analysis.interpretation || analysis.summary || "",
                          },
                          includeReport: item.reportIncluded,
                        })
                      }
                    >
                      {item.metadata?.legacyDerived
                        ? "Add to Project"
                        : "Manage Placement"}
                    </button>
                    {!item.metadata?.legacyDerived && (
                      <button
                        className="danger"
                        onClick={() =>
                          removeWithConfirmation({
                            title: "Remove from project?",
                            message:
                              "This removes only the project placement. The canonical analysis and report content remain available.",
                            label: "Remove Placement",
                            onRemove: () =>
                              placement.removePlacement(item.placementId),
                          })
                        }
                      >
                        Remove from Project
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="No analysis placements"
              body="Place a completed analysis into the project knowledge structure."
            />
          )}
        </div>
      );
    }
    if (tab === "Reports")
      return projectReports.length ? (
        <>
          <div className="ph-grid">
            {projectReports.map((report) => {
              const analysis = projectAnalyses.find(
                (item) =>
                  item.id === report.analysisId || item.id === report.sourceId,
              );
              return (
                <button
                  type="button"
                  className="ph-card ph-card-button"
                  key={report.id}
                  onClick={() =>
                    analysis
                      ? setOpenResult(analysis)
                      : navigate("/report", {
                          state: { reportItemId: report.id, projectId: id },
                        })
                  }
                >
                  <span>REPORT ASSET</span>
                  <h3>{report.title}</h3>
                  <p>{formatDate(report.timestamp)}</p>
                </button>
              );
            })}
          </div>
          {openResult && (
            <SavedAnalysisResult
              analysis={openResult}
              onClose={() => setOpenResult(null)}
            />
          )}
        </>
      ) : (
        <Empty
          title="No project reports"
          body="Add document or analysis outputs to the Report Builder."
          action={
            <Link className="btn-primary" to="/report">
              Open Report Builder
            </Link>
          }
        />
      );
    if (tab === "Team")
      return (
        <div className="ph-manage">
          <header>
            <div>
              <span>PROJECT TEAM</span>
              <h2>Team and accountability</h2>
            </div>
            <button
              className="btn-primary"
              onClick={() =>
                updateCollection("team", [
                  ...team,
                  {
                    id: `team-${Date.now()}`,
                    name: "",
                    role: "",
                    department: "",
                    email: "",
                  },
                ])
              }
            >
              + Add Member
            </button>
          </header>
          {team.length ? (
            <div className="ph-edit-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Email</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {team.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <input
                          value={member.name || ""}
                          onChange={(event) =>
                            updateCollection(
                              "team",
                              team.map((item) =>
                                item.id === member.id
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={member.role || ""}
                          onChange={(event) =>
                            updateCollection(
                              "team",
                              team.map((item) =>
                                item.id === member.id
                                  ? { ...item, role: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={member.department || ""}
                          onChange={(event) =>
                            updateCollection(
                              "team",
                              team.map((item) =>
                                item.id === member.id
                                  ? { ...item, department: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={member.email || ""}
                          onChange={(event) =>
                            updateCollection(
                              "team",
                              team.map((item) =>
                                item.id === member.id
                                  ? { ...item, email: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            updateCollection(
                              "team",
                              team.filter((item) => item.id !== member.id),
                            )
                          }
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No team members"
              body="Add project team members and clarify accountability."
            />
          )}
        </div>
      );
    if (tab === "Timeline")
      return (
        <div className="ph-manage">
          <header>
            <div>
              <span>PROJECT TIMELINE</span>
              <h2>Milestones and target dates</h2>
            </div>
            <button
              className="btn-primary"
              onClick={() =>
                updateCollection("timeline", [
                  ...timeline,
                  {
                    id: `milestone-${Date.now()}`,
                    milestone: "",
                    owner: "",
                    date: "",
                    status: "Not Started",
                  },
                ])
              }
            >
              + Add Milestone
            </button>
          </header>
          {timeline.length ? (
            <div className="ph-edit-table">
              <table>
                <thead>
                  <tr>
                    <th>Milestone</th>
                    <th>Owner</th>
                    <th>Target Date</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((milestone) => (
                    <tr key={milestone.id}>
                      <td>
                        <input
                          value={milestone.milestone || ""}
                          onChange={(event) =>
                            updateCollection(
                              "timeline",
                              timeline.map((item) =>
                                item.id === milestone.id
                                  ? { ...item, milestone: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={milestone.owner || ""}
                          onChange={(event) =>
                            updateCollection(
                              "timeline",
                              timeline.map((item) =>
                                item.id === milestone.id
                                  ? { ...item, owner: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={milestone.date || ""}
                          onChange={(event) =>
                            updateCollection(
                              "timeline",
                              timeline.map((item) =>
                                item.id === milestone.id
                                  ? { ...item, date: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={milestone.status || "Not Started"}
                          onChange={(event) =>
                            updateCollection(
                              "timeline",
                              timeline.map((item) =>
                                item.id === milestone.id
                                  ? { ...item, status: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        >
                          <option>Not Started</option>
                          <option>In Progress</option>
                          <option>Complete</option>
                          <option>Delayed</option>
                        </select>
                      </td>
                      <td>
                        <button
                          onClick={() =>
                            updateCollection(
                              "timeline",
                              timeline.filter(
                                (item) => item.id !== milestone.id,
                              ),
                            )
                          }
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="No milestones"
              body="Add milestones to establish the project timeline."
            />
          )}
        </div>
      );
    return evidence.length ? (
      <div className="ph-manager">
        <header>
          <div>
            <span>EVIDENCE LIBRARY</span>
            <h2>Reusable project evidence</h2>
          </div>
          <select
            value={evidenceFilter}
            onChange={(event) => setEvidenceFilter(event.target.value)}
          >
            <option>All</option>
            {[...new Set(evidence.map((item) => item.category || "Other"))].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </header>
        <div className="ph-grid">
          {evidence
            .filter(
              (item) =>
                evidenceFilter === "All" ||
                (item.category || "Other") === evidenceFilter,
            )
            .map((item) => (
              <article className="ph-card ph-evidence" key={item.id}>
                <span>{item.category || item.assetType || "EVIDENCE"}</span>
                <h3>{item.title}</h3>
                <p>
                  {item.summary ||
                    `Saved from ${item.sourceType || "a project asset"}.`}
                </p>
                <dl>
                  <div>
                    <dt>Dataset</dt>
                    <dd>{item.dataset || "Not linked"}</dd>
                  </div>
                  <div>
                    <dt>Date</dt>
                    <dd>{formatDate(item.date || item.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Author</dt>
                    <dd>{item.author || "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt>Report</dt>
                    <dd>
                      {(item.linkedReportIds || item.reportIds || []).length}{" "}
                      linked
                    </dd>
                  </div>
                  <div>
                    <dt>Documents</dt>
                    <dd>
                      {
                        (item.linkedDocumentIds || item.documentIds || [])
                          .length
                      }{" "}
                      linked
                    </dd>
                  </div>
                </dl>
                <footer>
                  <small>{formatDate(item.createdAt)}</small>
                  <button
                    onClick={() =>
                      removeWithConfirmation({
                        title: "Remove evidence?",
                        message: `“${item.title}” will be removed from the Evidence Library. The source analysis is retained.`,
                        label: "Remove Evidence",
                        onRemove: () => removeEvidence(id, item.id),
                      })
                    }
                  >
                    Remove
                  </button>
                </footer>
              </article>
            ))}
        </div>
      </div>
    ) : (
      <Empty
        title="Evidence Library is ready"
        body={
          suiteId === "project-management"
            ? "Save approval records, vendor documents, meeting minutes, sign-offs, inspection reports, and other supporting data here. Evidence stores references to existing records rather than duplicating them."
            : "Save completed histograms, control charts, capability studies, hypothesis tests, ANOVA, regression, DOE, FMEA, and other analysis outputs here. Evidence stores references to existing assets rather than duplicating calculations."
        }
      />
    );
  };

  return (
    <div className="project-hub">
      <header className="ph-header">
        <div className="ph-breadcrumb">
          <Link to="/projects">Projects</Link>
          <span>/</span>
          <strong>{project.name}</strong>
        </div>
        <div className="ph-title">
          <div>
            <span>PROJECT HUB</span>
            <h1>{project.name}</h1>
            <p>{project.goal || "Operational Excellence project workspace"}</p>
          </div>
          <div>
            <span>
              Owner<strong>{project.owner || "Not assigned"}</strong>
            </span>
            <span>
              Sponsor<strong>{project.champion || "Not assigned"}</strong>
            </span>
            <span>
              Status<strong>{project.status || "Active"}</strong>
            </span>
            <span>
              Phase<strong>{currentPhase}</strong>
            </span>
            <span>
              Target<strong>{formatDate(targetDate)}</strong>
            </span>
            <span>
              Completion<strong>{completion}%</strong>
            </span>
          </div>
        </div>
        <nav>
          {visibleTabs.map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item === "Project Home" ? "Dashboard" : item}
              {item === "Evidence Library" && evidence.length > 0 ? (
                <i>{evidence.length}</i>
              ) : null}
            </button>
          ))}
          {activeTabId && (
            <HelpButton surfaceId={activeTabId} suiteId={suiteId} label={tab} />
          )}
        </nav>
      </header>
      <main>
        <div className="ph-hub-actions">
          <Link to={`/projects/${id}/charter`}>Open Charter</Link>
          <Link to="/worksheet" state={{ projectId: id }}>Add Dataset</Link>
          <Link to={`/templates?project=${encodeURIComponent(id)}`}>Create Document</Link>
          {suiteId === "operational-excellence" && (
            <Link to="/hypothesis" state={{ projectId: id }}>Run Analysis</Link>
          )}
          <button onClick={() => setTab("Evidence Library")}>
            Open Evidence Library
          </button>
          <Link to="/report" state={{ projectId: id }}>Build Report</Link>
        </div>
        {renderTab()}
        {tab === "Project Home" && (
          <section className="ph-section">
            <div className="ph-section-title">
              <div>
                <span>RECENT ACTIVITY</span>
                <h2>Latest project updates</h2>
              </div>
            </div>
            {recentActivity.length ? (
              <div className="ph-activity">
                {recentActivity.map((item, index) => (
                  <div key={`${item.type}-${item.title}-${index}`}>
                    <i>{item.type.charAt(0)}</i>
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.type} · {formatDate(item.date)}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ph-muted">
                Project activity will appear as documents, datasets, analyses,
                evidence, and reports are created.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

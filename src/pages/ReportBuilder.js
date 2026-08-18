import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useReport } from "../context/ReportContext";
import { useProjects } from "../context/ProjectsContext";
import { documentRepository } from "../repositories/documentRepository";
import { assembleReportModel } from "../foundation/reportAssembly";
import { lifecycleForProject } from "../foundation/lifecycle";
import { projectHubRoute, PROJECT_HUB_BACK_LABEL } from "../utils/projectResume";
import HelpButton from "../components/HelpButton";
import {
  allPrintArtifactIds,
  createPrintModel,
  PRINT_MODES,
} from "../foundation/reportPrint";
import ReportPrintOptions from "./ReportPrintOptions";
import ReportPrintPreview from "./ReportPrintPreview";
import "../pages/Templates.css";

const standaloneTemplateId = (document) => document.content?.templateId || "";

export function StandaloneArtifacts() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const organizationId = profile?.default_organization_id;
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    if (!organizationId) {
      setDocuments([]);
      setStatus("ready");
      return () => { active = false; };
    }
    setStatus("loading");
    setError("");
    documentRepository.listStandalone(organizationId)
      .then((rows) => {
        if (!active) return;
        setDocuments([...rows].sort((left, right) =>
          String(right.updated_at || "").localeCompare(String(left.updated_at || "")),
        ));
        setStatus("ready");
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message || "Standalone artifacts could not be loaded from Aureqin.");
        setStatus("error");
      });
    return () => { active = false; };
  }, [organizationId, reload]);

  const openDocument = (document) => {
    const templateId = standaloneTemplateId(document);
    if (!templateId) return;
    navigate(`/documents/${encodeURIComponent(templateId)}?standalone=${encodeURIComponent(document.id)}`);
  };

  return (
    <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }} aria-labelledby="standalone-artifacts-heading">
      <div className="templates-header" style={{ marginBottom: "1rem" }}>
        <h2 id="standalone-artifacts-heading">Standalone Artifacts</h2>
        <p>Project-independent documents saved to your Aureqin organization.</p>
      </div>
      {status === "loading" && <p>Loading standalone artifacts…</p>}
      {status === "error" && (
        <div className="alert alert-danger">
          {error}
          <button className="btn-secondary" onClick={() => setReload((value) => value + 1)}>Retry</button>
        </div>
      )}
      {status === "ready" && !documents.length && (
        <p style={{ color: "var(--text-secondary)" }}>No standalone artifacts yet.</p>
      )}
      {status === "ready" && documents.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Title</th><th>Template / Type</th><th>Phase</th><th>Updated</th><th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const templateId = standaloneTemplateId(document);
                return (
                  <tr key={document.id}>
                    <td>{document.title || document.content?.title || "Untitled artifact"}</td>
                    <td>{templateId || "Unknown document type"}</td>
                    <td>{document.lifecycle_phase || document.dmaic_phase || document.content?.phase || "—"}</td>
                    <td>{document.updated_at ? new Date(document.updated_at).toLocaleString() : "—"}</td>
                    <td><button className="btn-secondary" disabled={!templateId} onClick={() => openDocument(document)}>Open</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ReportBuilder() {
  const {
    items,
    removeReportItem,
    toggleIncludeRawData,
    reorderItems,
    clearReport,
    storageWarning,
    dismissStorageWarning,
  } = useReport();
  const { projects, addArtifact } = useProjects();
  const { profile } = useAuth();
  const location = useLocation();
  // When Report Builder is opened from a specific project (Project Hub's "Build Report"), it must
  // show only that project's own documents/analyses/artifacts — the previous behavior inferred
  // "the project" from whichever report item happened to be first in the entire cross-project,
  // cross-suite items list, so a PM project's report could surface OE tools and DMAIC artifacts
  // left over from browsing an OE project earlier. contextProjectId, when present, is the single
  // source of truth for both which project this report is and which items belong in it — a project
  // only ever has one suite, so scoping by project inherently scopes by suite too.
  const contextProjectId = location.state?.projectId || "";
  const project = contextProjectId
    ? projects.find((entry) => entry.id === contextProjectId)
    : projects.find(
        (entry) => entry.id === items.find((item) => item.projectId)?.projectId,
      );
  const scopedItems = contextProjectId
    ? items.filter((item) => item.projectId === contextProjectId)
    : items;
  const suiteId = project ? lifecycleForProject(project).id : null;
  const [reportTitle, setReportTitle] = useState("Project Report");
  const [preparedBy, setPreparedBy] = useState(()=>profile?.full_name||profile?.display_name||profile?.name||"");
  const titleEdited=useRef(false);
  const [printOptionsOpen, setPrintOptionsOpen] = useState(false),
    [printMode, setPrintMode] = useState(PRINT_MODES.ENTIRE),
    [selectedPrintIds, setSelectedPrintIds] = useState(new Set()),
    [printModel, setPrintModel] = useState(null),
    [printError, setPrintError] = useState("");
  useEffect(()=>{if(project&&!titleEdited.current&&reportTitle==="Project Report")setReportTitle(`${project.name} — Project Report`)},[project,reportTitle]);
  const reportModel = useMemo(
      () => assembleReportModel(scopedItems, project || {}),
      [scopedItems, project],
    ),
    visibleItems = reportModel.items,
    PHASES = reportModel.sections.map((section) => section.phase),
    finalLifecycleStage = PHASES.at(-1) || "Project";
  const move = (item, direction) => {
    const index = items.findIndex((entry) => entry.id === item.id),
      target = index + direction;
    if (index >= 0 && target >= 0 && target < items.length)
      reorderItems(index, target);
  };
  const openPrintOptions = () => {
    setPrintMode(PRINT_MODES.ENTIRE);
    setSelectedPrintIds(new Set(allPrintArtifactIds(reportModel)));
    setPrintError("");
    setPrintOptionsOpen(true);
  };
  const continueToPrint = () => {
    const next = createPrintModel(reportModel, printMode, selectedPrintIds);
    if (!next.items.length) {
      setPrintError("Select at least one artifact to continue.");
      return;
    }
    setPrintModel(next);
    setPrintOptionsOpen(false);
  };
  const savePdf = () => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" }),
      margin = 16,
      width = 178;
    let y = 18,
      page = 1;
    const pageBreak = (needed) => {
      if (y + needed > 280) {
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text(
          `AUREQIN · ${project?.name || reportTitle} · Page ${page}`,
          margin,
          292,
        );
        pdf.addPage();
        page += 1;
        y = 18;
      }
    };
    const text = (value, size = 10, bold = false, color = [32, 43, 61]) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(
        String(value || "Not yet established"),
        width,
      );
      pageBreak(lines.length * size * 0.4 + 3);
      pdf.text(lines, margin, y);
      y += lines.length * size * 0.4 + 3;
    };
    pdf.setFillColor(20, 50, 88);
    pdf.rect(0, 0, 210, 42, "F");
    pdf.setTextColor(255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("AUREQIN", margin, 14);
    pdf.setFontSize(20);
    pdf.text(reportTitle, margin, 26);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `${project?.name || "Project"} · Prepared by ${preparedBy || "Not specified"} · ${new Date().toLocaleDateString()}`,
      margin,
      35,
    );
    y = 52;
    text("PROJECT SUMMARY", 11, true, [20, 50, 88]);
    text(project?.goal || "Project summary not yet established.", 10);
    [
      ["Status", project?.status],
      [`${reportModel.lifecycle.methodology} stage`, project?.currentPhase],
      ["Owner", project?.owner],
      ["Sponsor", project?.champion],
      ["Target date", project?.targetDate],
    ].forEach(([label, value]) =>
      text(`${label}: ${value || "Not yet established"}`, 9),
    );
    PHASES.forEach((phase) => {
      const phaseItems = visibleItems.filter((item) => item.phase === phase);
      if (!phaseItems.length) return;
      pageBreak(18);
      y += 4;
      text(phase.toUpperCase(), 16, true, [20, 50, 88]);
      phaseItems.forEach((item, index) => {
        pageBreak(24);
        text(`${index + 1}. ${item.title}`, 12, true);
        if (item.interpretation) text(item.interpretation, 9);
        Object.entries(item.statsSummary || {}).forEach(([key, value]) =>
          text(`${key}: ${value}`, 9, true, [66, 82, 105]),
        );
        if (item.chartImage) {
          try {
            pageBreak(75);
            pdf.addImage(
              item.chartImage,
              "JPEG",
              margin,
              y,
              width,
              Math.min(70, width * 0.55),
            );
            y += 74;
          } catch {}
        }
        const values = item.documentSnapshot?.values || {};
        Object.entries(values)
          .filter(([, value]) => typeof value === "string" && value.trim())
          .slice(0, 8)
          .forEach(([key, value]) => {
            text(
              key
                .replace(/([a-z])([A-Z])/g, "$1 $2")
                .replace(/^./, (letter) => letter.toUpperCase()),
              9,
              true,
              [66, 82, 105],
            );
            text(value.replace(/<[^>]*>/g, " "), 9);
          });
      });
    });
    pageBreak(24);
    y += 5;
    text("PROJECT CLOSURE", 14, true, [20, 50, 88]);
    text(
      project?.closureSummary ||
        "Closure information has not yet been established.",
      9,
    );
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(
      `AUREQIN · ${project?.name || reportTitle} · Page ${page}`,
      margin,
      292,
    );
    pdf.save(
      `${(project?.name || reportTitle).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-project-report.pdf`,
    );
  };
  useEffect(() => {
    const button = [
      ...document.querySelectorAll(".templates-page button"),
    ].find((entry) => entry.textContent.trim() === "Save PDF");
    if (!button || !project) return;
    const register = () =>
      addArtifact(project.id, {
        type: "generated-pdf",
        title: reportTitle,
        mimeType: "application/pdf",
        fileName: `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-project-report.pdf`,
        phase: finalLifecycleStage,
        status: "generated",
        description: "Locally generated project report PDF.",
        content: {
          reportItemIds: visibleItems.map((item) => item.id),
          preparedBy,
          generatedAt: new Date().toISOString(),
        },
      });
    button.addEventListener("click", register);
    return () => button.removeEventListener("click", register);
  }, [
    addArtifact,
    finalLifecycleStage,
    preparedBy,
    project,
    reportTitle,
    visibleItems,
  ]);
  if (printModel)
    return (
      <ReportPrintPreview
        reportTitle={reportTitle}
        preparedBy={preparedBy}
        project={project}
        reportModel={printModel}
        onBack={() => setPrintModel(null)}
      />
    );
  return (
    <div className="templates-page">
      <div>
        {storageWarning && (
          <div className="alert alert-danger">
            {storageWarning}
            <button className="btn-secondary" onClick={dismissStorageWarning}>
              Dismiss
            </button>
          </div>
        )}
        <div className="templates-header">
          <h1>Report Builder<HelpButton surfaceId="report-builder" suiteId={suiteId}/></h1>
          <p>
            Review the project in {reportModel.lifecycle.methodology} sequence,
            then print or generate a local PDF.
          </p>
          {contextProjectId && <Link to={projectHubRoute(contextProjectId)}>&larr; Back to {PROJECT_HUB_BACK_LABEL}</Link>}
        </div>
        <StandaloneArtifacts />
        {!scopedItems.length && (
          <section className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem", textAlign: "center" }}>
            <h2>Project Artifacts</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              No project assets added yet. Add a document workspace or completed
              analysis to build a connected project report here.
            </p>
          </section>
        )}
        {scopedItems.length > 0 && <>
        <h2 style={{ marginBottom: "1rem" }}>Project Artifacts</h2>
        <div className="card" style={{ padding: "1rem 1.5rem", marginBottom: "1rem" }}><span style={{ color: "var(--text-secondary)" }}>Project</span><h3 style={{ margin: ".25rem 0 0" }}>{project?.name || "Project context unavailable"}</h3></div>
        <div
          className="card"
          style={{ padding: "1.5rem", marginBottom: "1.5rem" }}
        >
          <div className="form-grid">
            <div className="form-group">
              <label>Report Title</label>
              <input
                value={reportTitle}
                onChange={(event) => {titleEdited.current=true;setReportTitle(event.target.value)}}
              />
            </div>
            <div className="form-group">
              <label>Prepared By</label>
              <input
                value={preparedBy}
                onChange={(event) => setPreparedBy(event.target.value)}
                placeholder="Name"
              />
            </div>
          </div>
        </div>
        {PHASES.map((phase) => {
          const phaseItems = visibleItems.filter(
            (item) => item.phase === phase,
          );
          return phaseItems.length ? (
            <section key={phase} style={{ marginBottom: "1.5rem" }}>
              <h2
                style={{
                  color: "var(--accent-light)",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: ".6rem",
                }}
              >
                {phase.toUpperCase()}
              </h2>
              {phaseItems.map((item) => (
                <article
                  key={item.id}
                  className="card"
                  style={{ padding: "1.25rem", marginBottom: "1rem" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: ".7rem",
                          fontWeight: 800,
                          letterSpacing: ".1em",
                        }}
                      >
                        {item.assetType || "PROJECT ASSET"}
                      </span>
                      <h3>{item.title}</h3>
                      <p style={{ color: "var(--text-secondary)" }}>
                        {item.interpretation}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: ".4rem" }}>
                      <button
                        className="btn-secondary"
                        onClick={() => move(item, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => move(item, 1)}
                      >
                        ↓
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => removeReportItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {item.chartImage && (
                    <img
                      src={item.chartImage}
                      alt={item.title}
                      style={{ maxWidth: "100%", borderRadius: 8 }}
                    />
                  )}
                  <label
                    style={{
                      display: "flex",
                      gap: ".5rem",
                      marginTop: ".75rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.includeRawData}
                      onChange={() => toggleIncludeRawData(item.id)}
                    />
                    Include raw data table
                  </label>
                </article>
              ))}
            </section>
          ) : null;
        })}
        <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={openPrintOptions}>
            Print
          </button>
          <button className="btn-primary" onClick={savePdf}>
            Save PDF
          </button>
          <button
            className="btn-secondary"
            disabled
            title="Configure an Outlook or mail provider to enable secure sending."
          >
            Email / Send · Not configured
          </button>
          <button className="btn-secondary" onClick={clearReport}>
            Clear All
          </button>
        </div>
        </>}
      </div>
      {printOptionsOpen && (
        <ReportPrintOptions
          reportModel={reportModel}
          mode={printMode}
          setMode={setPrintMode}
          selectedIds={selectedPrintIds}
          setSelectedIds={setSelectedPrintIds}
          error={printError}
          onCancel={() => setPrintOptionsOpen(false)}
          onContinue={continueToPrint}
        />
      )}
    </div>
  );
}

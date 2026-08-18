// Central, queryable contextual-help content for every suite-aware help surface in the app —
// Project Hub tabs, Document Workspace sections, the Document Library, Project Binder, Report
// Builder, Analysis Catalog, Evidence Library, the Project Workspace home screen, and
// WorkspaceShell's sequence navigation (see helpFor() below). This is deliberately a plain data
// object, not JSX or per-component conditionals: every entry is keyed by surfaceId then suiteId (or
// 'shared' for suite-agnostic surfaces), so any component — or a future AI layer — can look up
// "what does this button/tab/panel do, for this project's suite" with one function call, and so
// help content can be edited, audited, or generated without touching component code. HelpPanel.js
// is the one reusable UI that renders whatever helpFor() returns; components should not hand-roll
// their own help copy.
export const HELP_CONTENT = {
  "project-home": {
    shared: {
      title: "Project Home",
      summary: "The project's dashboard — status, phase, target date, completion, and recent activity in one place.",
      whenToUse: "Start here whenever you open a project to see what's changed and where work stands before diving into a specific tab.",
      example: "A sponsor checks Project Home before a steering meeting to see completion % and the last five updates without opening every document.",
      connectsTo: "Recent activity links straight to the document, dataset, or analysis it came from.",
    },
  },
  "project-settings": {
    shared: {
      title: "Project Settings",
      summary: "Core project identity: name, goal, owner, sponsor, target date, status, and current phase.",
      whenToUse: "Update this when project ownership changes, the target date moves, or the project advances to a new phase.",
      example: "A PM reassigns the project owner here after a team transition, so every other surface (Binder readiness, reports) reflects the new owner immediately.",
      connectsTo: "Owner and sponsor feed the Project Binder's readiness checks and every printed report's cover page.",
    },
  },
  risks: {
    "project-management": {
      title: "Risks",
      summary: "The project's risk register: identified risks, probability/impact, response, and status.",
      whenToUse: "Log a risk as soon as it's identified, not after it becomes an issue — this tab is for things that might happen, not things that already have.",
      example: "A vendor delivery date looks uncertain: log it here with a mitigation and an owner before it slips.",
      connectsTo: "Distinct from the Risk Register document (Planning stage) — this tab is the live, project-level register; the document is the formal PMBOK artifact.",
    },
  },
  actions: {
    "project-management": {
      title: "Actions",
      summary: "Open action items with an owner, priority, status, and due date.",
      whenToUse: "Capture a commitment the moment it's made in a meeting or review, so it doesn't only live in someone's notes.",
      example: "\"Sam to confirm vendor SLA by Friday\" gets logged here with Sam as owner and a due date, not just mentioned in Meeting Minutes.",
      connectsTo: "Project Binder's readiness check flags actions with no owner or due date.",
    },
  },
  issues: {
    "project-management": {
      title: "Issues",
      summary: "Problems that have already happened and need resolution — distinct from Risks, which are things that might happen.",
      whenToUse: "Log an issue the moment a risk materializes or a blocker appears, with a target resolution date.",
      example: "A risk about vendor delay \"triggers\" — log it as an Issue here with a resolution owner, and update the Risk Register's status to Triggered.",
      connectsTo: "An unresolved Issue with no owner is exactly what the Execution-stage readiness check looks for.",
    },
  },
  decisions: {
    "project-management": {
      title: "Decisions",
      summary: "A running log of project-level decisions, separate from the formal Decision Log document.",
      whenToUse: "Record any decision worth being able to answer \"why did we do that?\" about later — scope calls, vendor choices, escalations.",
      example: "The team decides to descope a feature to hit the target date: log the decision, the rationale, and who approved it.",
      connectsTo: "For a fully governed, audit-ready record with authority level and alternatives considered, use the Decision Log document (Execution stage, Governance domain).",
    },
  },
  approvals: {
    "project-management": {
      title: "Approvals",
      summary: "Formal sign-off records — who approved what, and when.",
      whenToUse: "Record an approval as soon as it's given, not retroactively when someone asks for proof.",
      example: "The sponsor approves the Charter at the Initiation gate review — record the approval here with their name and the date.",
      connectsTo: "Project Binder's readiness check looks for at least one recorded approval with a name and status.",
    },
  },
  documents: {
    "operational-excellence": {
      title: "Documents",
      summary: "Every DMAIC document this project has opened — Charter through Control Plan — with completion and quality scores.",
      whenToUse: "Open a document here to continue filling it out, or to review one that's already complete before a gate review.",
      example: "Before an Analyze gate review, check this tab to confirm the Statistical Analysis Summary shows 100% completion.",
      connectsTo: "The Document Library (Create Document) is where you start a document that isn't here yet.",
    },
    "project-management": {
      title: "Documents",
      summary: "Every PM document this project has opened — Charter through Project Closure Report — with completion and quality scores.",
      whenToUse: "Open a document here to continue filling it out, or to review one that's already complete before a stage gate.",
      example: "Before a Planning gate review, check this tab to confirm the WBS and Risk Register both show 100% completion.",
      connectsTo: "The Document Library (Create Document) is where you start a document that isn't here yet.",
    },
  },
  datasets: {
    shared: {
      title: "Datasets",
      summary: "Statistical datasets uploaded or created for this project's analyses.",
      whenToUse: "Open this when you need to review, rename, or archive the raw data behind an analysis.",
      example: "A capability study references a dataset of 200 measurements — open it here to correct a mis-entered value before rerunning the analysis.",
      connectsTo: "The Data Worksheet (Add Dataset) is where a new dataset is created or imported.",
    },
  },
  analyses: {
    "operational-excellence": {
      title: "Analyses",
      summary: "Every statistical analysis result saved to this project — hypothesis tests, capability studies, regressions, and more.",
      whenToUse: "Review a saved analysis to check its conclusion, or reopen it before including it in a report.",
      example: "Before writing the Analyze-phase summary, review every saved hypothesis test here to confirm which ones were statistically significant.",
      connectsTo: "The Analysis Catalog (Run Analysis) is where a new analysis is started.",
    },
  },
  placements: {
    "operational-excellence": {
      title: "Placements",
      summary: "Where each saved analysis sits in this project's DMAIC workflow — which phase and which workflow cluster.",
      whenToUse: "Use this to correct an analysis that landed in the wrong phase or cluster, or to add a suggested placement to the project.",
      example: "A regression was auto-suggested under Analyze → Relationships & Prediction but actually supports an Improve-phase decision — move it here.",
      connectsTo: "Only analyses have a placement; documents and evidence are already scoped to a phase by their template.",
    },
  },
  "evidence-library": {
    "operational-excellence": {
      title: "Evidence Library",
      summary: "Completed analysis outputs saved as durable evidence — histograms, control charts, capability studies, hypothesis tests, ANOVA, regression, DOE, FMEA, and similar analysis outputs.",
      whenToUse: "Save an analysis here once it's final and you want it referenced from documents or reports without re-running the calculation.",
      example: "A finished process capability study gets saved as evidence, then linked from the Control Plan instead of being redone.",
      connectsTo: "Evidence stores a reference to an existing analysis or document, not raw data (that's Datasets) and not the working document itself (that's Documents) — it's the citable, completed output.",
    },
    "project-management": {
      title: "Evidence Library",
      summary: "Supporting records for this project — approval records, vendor documents, meeting minutes, sign-offs, inspection reports, and other supporting data.",
      whenToUse: "Save something here once it's a finished, citable record you want the project to be able to point to later.",
      example: "A signed vendor SOW or a client acceptance sign-off gets saved as evidence, then referenced from the Project Closure Report.",
      connectsTo: "Evidence is for finished, referenceable records — the Documents tab is for the PM documents you're actively filling out, and Datasets is for OE-style statistical data (rarely used on PM projects).",
    },
  },
  artifacts: {
    shared: {
      title: "Artifacts",
      summary: "Free-form files and outputs attached to the project that don't fit a structured document template.",
      whenToUse: "Upload something here when it's a real deliverable or supporting file — a diagram, a spreadsheet, a scanned form — that doesn't have its own document template.",
      example: "A hand-drawn process map photographed on a whiteboard gets uploaded here until it's formalized into a Process Map document.",
      connectsTo: "If what you're adding matches an existing document template, use Documents instead so it gets structured fields and a completion score.",
    },
  },
  "project-binder": {
    "operational-excellence": {
      title: "Project Binder",
      summary: "A single readiness view across every DMAIC stage: what's required, what's present, and an overall readiness percentage.",
      whenToUse: "Check this before a gate review to see exactly what's missing, not just that \"something\" is incomplete.",
      example: "Before a Measure gate review, the Binder shows the Data Collection Plan is missing — add it before the review, not during it.",
      connectsTo: "Each stage's required documents come from a central data map (Charter for Define, Data Collection Plan for Measure, and so on) — this isn't a guess, it's a checklist.",
    },
    "project-management": {
      title: "Project Binder",
      summary: "A single readiness view across every PM Focus Area (Initiation through Closing): what's required, what's present, and an overall readiness percentage.",
      whenToUse: "Check this before a stage gate to see exactly what's missing, not just that \"something\" is incomplete.",
      example: "Before a Planning gate, the Binder shows the Schedule Baseline is missing even though the WBS and Risk Register are both done — every required document for a stage must be present, not just one of them.",
      connectsTo: "Each Focus Area's required documents come from a central data map (Charter + Business Case for Initiation, WBS + Risk Register + Schedule Baseline for Planning, and so on). Readiness % is the share of all checks (owner assigned, sponsor assigned, target date, every stage's required documents, analysis evidence, risks, actions, approvals) that are complete rather than missing or needing attention.",
    },
  },
  reports: {
    shared: {
      title: "Reports",
      summary: "Report items saved to this project via \"+ Add to Report\" from documents, analyses, and artifacts.",
      whenToUse: "Review what's queued for the project's report, reorder it, or remove an item before opening the full Report Builder.",
      example: "Before a steering committee review, check this tab to confirm the right documents are queued in the right order.",
      connectsTo: "Build Report opens the full Report Builder, which assembles everything queued here into one exportable report.",
    },
  },
  "report-builder": {
    "operational-excellence": {
      title: "Report Builder",
      summary: "Assembles this project's queued documents, analyses, and artifacts into one exportable DMAIC report.",
      whenToUse: "Build a report when you need a single document to hand to a sponsor, gate reviewer, or auditor — not for day-to-day tracking.",
      example: "A Champion review needs a PDF covering Define through the current phase — the Report Builder assembles exactly that from what's already been added to the project's report.",
      connectsTo: "Only items added via \"+ Add to Report\" (from a document, analysis, or artifact) appear here — it doesn't pull in everything in the project automatically.",
    },
    "project-management": {
      title: "Report Builder",
      summary: "Assembles this project's queued PM documents and artifacts into one exportable status/governance report.",
      whenToUse: "Build a report for a sponsor, steering committee, or governance review — not for day-to-day tracking (use Status Report / Executive Dashboard for that).",
      example: "A monthly steering committee packet needs the current Status Report, EVM Dashboard, and Risk Register — the Report Builder assembles exactly that from what's already been added to the project's report.",
      connectsTo: "Only items added via \"+ Add to Report\" from a PM document or artifact in this project appear here — OE tools and other projects' items are excluded.",
    },
  },
  team: {
    shared: {
      title: "Team",
      summary: "The people assigned to this project and their roles.",
      whenToUse: "Update this when someone joins, leaves, or changes role on the project.",
      example: "A new analyst joins mid-project — add them here so they show up as an assignable owner elsewhere.",
      connectsTo: "Feeds owner/sponsor fields used throughout the Binder, Charter, and reports.",
    },
  },
  timeline: {
    shared: {
      title: "Timeline",
      summary: "Milestones and key dates for the project, independent of any single document's schedule fields.",
      whenToUse: "Use this for a project-level view of what's coming up, across every document and stage.",
      example: "A gate review date gets added here so it shows up regardless of which document's schedule table it also lives in.",
      connectsTo: "Open action items with no owner or date are flagged by the Project Binder's readiness checks.",
    },
  },
  "analysis-catalog": {
    "operational-excellence": {
      title: "Analysis Catalog",
      summary: "Every governed statistical method available in Aureqin, searchable by name or family.",
      whenToUse: "Browse here when you know what question you're answering (comparing means, checking a relationship, testing a proportion) but aren't sure which method fits.",
      example: "Comparing before/after cycle times for the same units → search \"paired\" to find the Paired t-Test instead of guessing.",
      connectsTo: "Opening a method here connects it to the project's active dataset automatically when one is selected.",
    },
  },
  "project-workspace-home": {
    shared: {
      title: "Print All / Save to File",
      summary: "Print All opens the browser print dialog with every document this project has a saved record for, assembled in lifecycle order with a cover page. Save to File does the same but downloads a PDF instead.",
      whenToUse: "Use these when you need the whole project's documentation at once — for a physical binder, an offline review, or an archive copy — not for sharing a single document (use that document's own Print/Export PDF instead).",
      example: "Before an audit, Save to File produces one PDF covering the Charter through every document opened so far, in stage order, ready to hand over.",
      connectsTo: "Only documents with a saved record are included — a document that's never been opened won't appear as an empty placeholder.",
    },
  },
  "workspace-shell-sequence": {
    "operational-excellence": {
      title: "Sequence Navigation",
      summary: "Moves between documents in this project's DMAIC order — the curated Define lead-in, then Measure, Analyze, Improve, and Control in turn.",
      whenToUse: "Use Sequence (not History) to follow the project's intended path from one document to the next, especially right after finishing one.",
      example: "Finishing the Charter and clicking \"Next item\" advances to SIPOC, the next document in the Define sequence — not just the last page you happened to visit.",
      connectsTo: "History (← Previous) returns to whatever screen you were on before, which may not be the previous document in the sequence.",
    },
    "project-management": {
      title: "Sequence Navigation",
      summary: "Moves between documents in this project's PMBOK Focus Area order — the shared Charter/Stakeholder Register/Business Case lead-in, then Initiation through Closing in turn.",
      whenToUse: "Use Sequence (not History) to follow the project's intended path from one document to the next, especially right after finishing one.",
      example: "Finishing the Business Case and clicking \"Next item\" advances into the Initiation stage's remaining documents, then Planning — not just the last page you happened to visit.",
      connectsTo: "History (← Previous) returns to whatever screen you were on before, which may not be the previous document in the sequence.",
    },
  },
  "project-health-dashboard": {
    "project-management": {
      title: "Project Health Dashboard",
      summary: "Five traffic-light cards — Schedule, Cost, Risk, Actions and Issues, Approvals and Decisions — computed live from your project's own documents, plus an overall weighted score.",
      whenToUse: "Check this first when picking up a project: it tells you which area needs attention before you open any single document.",
      example: "Cost Health turns Red when CPI drops below 0.9 (or no EVM data has been entered yet) — click through to EVM Dashboard to see why.",
      connectsTo: "Every card links straight to the document it reads from (e.g. Risk Exposure → Risk Register), and computeProjectHealth() is the same pure function an AI daily brief uses.",
    },
  },
};

// Looks up help content for a surface, preferring the project's specific suite and falling back to
// a suite-agnostic 'shared' entry when one exists (and to null, never a thrown error, when neither
// does) — the one function every help-rendering component should call rather than reading
// HELP_CONTENT's shape directly.
export function helpFor(surfaceId, suiteId) {
  const bySurface = HELP_CONTENT[surfaceId];
  if (!bySurface) return null;
  return bySurface[suiteId] || bySurface.shared || null;
}

// The full list of surfaceIds with help content — lets any consumer (a future AI layer included)
// enumerate what help exists without needing to know the surfaces up front.
export const HELP_SURFACE_IDS = Object.keys(HELP_CONTENT);

import fs from "fs";
import path from "path";
import {
  PROJECT_CHARTER_EMPTY,
  PROJECT_CHARTER_SCHEMA_VERSION,
} from "../config/charterTemplate";
import { charterRecordForSave } from "../pages/ProjectCharter";
import {
  normalizeProject,
  projectFromRow,
  projectToRow,
} from "../context/ProjectsContext";
import {
  canonicalDocument,
  canonicalTollgateState,
  eligibleTollgateReviewers,
  evaluateTollgateReadiness,
  reviewerIdentity,
  tollgateReviewerEligibility,
} from "./tollgate";
const charter = charterRecordForSave(
  {
    ...PROJECT_CHARTER_EMPTY,
    projectSummary: "Executive project summary",
    targetDate: "2026-12-01",
    businessCase: "A material customer and financial case.",
    problemStatement:
      "Defect rate is 12 percent above the approved customer threshold.",
    goalStatement: "Reduce defect rate from 12 percent to below 1 percent.",
    scopeIn: "Assembly and final inspection",
    scopeOut: "Supplier manufacturing",
    team: [{ name: "Belt", role: "Lead" }],
    stakeholders: [{ name: "Sponsor" }],
    timeline: [{ date: "2026-09-01" }],
    financialImpact: "Estimated annual value 100000",
    risks: [{ risk: "Delay", mitigation: "Escalate" }],
    assumptions: "Demand remains stable",
    constraints: "Existing equipment",
    approvals: [{ name: "Sponsor", status: "Approved" }],
  },
  "2026-08-20T10:00:00Z",
);
const savedDocument = (templateId, values, phase = "Define") => ({
  id: `document-${templateId}`,
  templateId,
  projectId: "project-1",
  title: templateId,
  phase,
  completion: 100,
  quality: 100,
  values,
  updatedAt: "2026-08-20T11:00:00Z",
});
test("normal Charter, SIPOC, owner, and sponsor updates replace the initial blocked Define snapshot", () => {
  const initial = normalizeProject({
      id: "project-1",
      organizationId: "org-1",
      name: "QA",
      suiteId: "operational-excellence",
      owner: "",
      champion: "",
      documents: {},
    }),
    blocked = evaluateTollgateReadiness(initial, "Define");
  expect(blocked.blockers.map((item) => item.code)).toEqual(
    expect.arrayContaining(["charter", "owner", "sponsor"]),
  );
  expect(blocked.warnings.map((item) => item.code)).toContain("sipoc");
  const updated = normalizeProject({
      ...initial,
      owner: "Black Belt",
      champion: "Sponsor",
      sharedFields: {
        ...initial.sharedFields,
        owner: "Black Belt",
        sponsor: "Sponsor",
      },
      charter,
      documents: {
        "document-sipoc": savedDocument("sipoc", {
          sipocRows: [
            {
              supplier: "A",
              input: "B",
              process: "C",
              output: "D",
              customer: "E",
            },
          ],
        }),
      },
    }),
    ready = evaluateTollgateReadiness(updated, "Define", { documents: [] });
  expect(ready.readyToSubmit).toBe(true);
  expect(ready.blockers).toEqual([]);
  expect(ready.warnings.map((item) => item.code)).not.toContain("sipoc");
  expect(ready.completedRequirements.map((item) => item.code)).toEqual(
    expect.arrayContaining(["charter", "owner", "sponsor", "sipoc"]),
  );
});
test("the regression fixture is the exact flat record shape written by ProjectCharter save", () => {
  expect(charter.schemaVersion).toBe(PROJECT_CHARTER_SCHEMA_VERSION);
  expect(charter.values).toBeUndefined();
  expect(charter.problemStatement).toContain("12 percent");
  expect(charter.scopeIn).toBe("Assembly and final inspection");
});
test("canonical project document identity wins over a stale caller projection", () => {
  const stale = { ...savedDocument("sipoc", {}), completion: 0, values: {} },
    current = savedDocument("sipoc", { sipocRows: [{ supplier: "Current" }] }),
    project = normalizeProject({
      id: "project-1",
      owner: "Belt",
      champion: "Sponsor",
      charter,
      documents: { "document-sipoc": current },
    }),
    state = canonicalTollgateState(project, { documents: [stale] });
  expect(canonicalDocument(state, "sipoc")).toBe(current);
  expect(
    evaluateTollgateReadiness(project, "Define", {
      documents: [stale],
    }).warnings.map((item) => item.code),
  ).not.toContain("sipoc");
});
test("refresh hydration preserves the same canonical readiness result", () => {
  const project = normalizeProject({
      id: "project-1",
      organizationId: "org-1",
      createdBy: "user-1",
      name: "QA",
      owner: "Belt",
      champion: "Sponsor",
      charter,
      documents: {
        "document-sipoc": savedDocument("sipoc", {
          sipocRows: [{ supplier: "A" }],
        }),
        "document-voc": savedDocument("voc", {
          vocRows: [{ customer: "A", requirement: "B" }],
        }),
      },
    }),
    before = evaluateTollgateReadiness(project, "Define"),
    row = { ...projectToRow(project), created_at: "2026-08-20T00:00:00Z" },
    hydrated = projectFromRow(row),
    after = evaluateTollgateReadiness(hydrated, "Define");
  expect(after.readyToSubmit).toBe(before.readyToSubmit);
  expect(after.blockers).toEqual(before.blockers);
  expect(after.warnings).toEqual(before.warnings);
  expect(after.evidenceSnapshot.projectId).toBe("project-1");
});
test.each([
  {
    phase: "Measure",
    documents: [
      savedDocument(
        "data-collection-plan",
        { collectionRows: [{ metric: "Cycle time" }] },
        "Measure",
      ),
      savedDocument(
        "operational-definitions",
        {
          definitionRows: [
            {
              metric: "Cycle time",
              definition: "Elapsed time from release to completion",
            },
          ],
        },
        "Measure",
      ),
      savedDocument(
        "process-map",
        { processNodes: [{ label: "Current state" }] },
        "Measure",
      ),
      savedDocument(
        "baseline-metrics",
        { baselineRows: [{ metric: "Cycle time", current: 12 }] },
        "Measure",
      ),
    ],
    datasets: [{ id: "data-1" }],
  },
  {
    phase: "Analyze",
    documents: [
      savedDocument(
        "root-cause-verification",
        { rootCauses: [{ cause: "Setup" }] },
        "Analyze",
      ),
    ],
    analyses: [{ id: "analysis-1", phase: "Analyze" }],
    evidence: [{ id: "finding-1", phase: "Analyze" }],
  },
  {
    phase: "Improve",
    documents: [
      savedDocument(
        "solution-selection-matrix",
        { solutions: [{ solution: "Fixture" }] },
        "Improve",
      ),
      savedDocument(
        "pilot-plan",
        { pilotRows: [{ activity: "Pilot" }] },
        "Improve",
      ),
    ],
    analyses: [{id:"validation-1",toolId:"hypothesis",phase:"Improve"}],
  },
  {
    phase: "Control",
    documents: [
      savedDocument(
        "control-plan",
        { controlRows: [{ metric: "Defects" }] },
        "Control",
      ),
      savedDocument("monitoring-plan",{monitoringRows:[{metric:"Defects"}]},"Control"),
    ],
    evidence: [{ id: "control-1", phase: "Control" }],
  },
])(
  "$phase resolves representative normal-workflow dependencies from canonical project state",
  ({ phase, documents = [], datasets = [], analyses = [], evidence = [] }) => {
    const project = normalizeProject({
      id: "project-1",
      owner: "Belt",
      champion: "Sponsor",
      charter,
      documents: Object.fromEntries(documents.map((item) => [item.id, item])),
      evidenceLibrary: evidence,
    });
    const result = evaluateTollgateReadiness(project, phase, {
      datasets,
      analyses,
    });
    expect(result.blockers).toEqual([]);
  },
);
test("blocked submission has a real disabled predicate and visible disabled style", () => {
  const source = fs.readFileSync(
      path.join(__dirname, "../components/ProjectTollgates.js"),
      "utf8",
    ),
    css = fs.readFileSync(
      path.join(__dirname, "../components/ProjectTollgatesStates.css"),
      "utf8",
    );
  expect(source).toMatch(/disabled=\{\s*!readiness\.readyToSubmit\s*\|\|\s*saving/);
  expect(css).toContain(".oe-tollgates button:disabled");
});
test("canonical Project Team hydrates eligible reviewers and excludes the submitter", () => {
  const project = normalizeProject({
      id: "project-1",
      team: [
        { id: "team-1", name: "Submitter", email: "OWNER@EXAMPLE.COM" },
        { id: "team-2", name: "Reviewer", email: "Reviewer@Example.com" },
        { id: "team-3", name: "Account reviewer", userId: "reviewer-user" },
      ],
    }),
    hydrated = projectFromRow({
      ...projectToRow(project),
      created_at: "2026-08-20T00:00:00Z",
    }),
    reviewers = eligibleTollgateReviewers(hydrated, {
      id: "owner-user",
      email: "owner@example.com",
    });
  expect(reviewers.map(reviewerIdentity)).toEqual([
    "reviewer@example.com",
    "reviewer-user",
  ]);
  expect(hydrated.team).toEqual(project.team);
});
test("reviewer UX returns to canonical Project Team and prohibits self approval", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../components/ProjectTollgates.js"),
    "utf8",
  );
  expect(source).toContain("eligibleTollgateReviewers(project, user)");
  expect(source).toContain("defineRemediationDestinations(project.id).team");
  expect(source).toContain("Self-approval is prohibited");
  expect(source).not.toContain("allowSelfApproval");
});
test("reviewer eligibility requires only a user id or account email and explains exclusions",()=>{
  const user={id:"submitter-id",email:"owner@example.com"};
  expect(tollgateReviewerEligibility({name:"Incomplete"},user)).toEqual(expect.objectContaining({eligible:false,code:"missing-identity"}));
  expect(tollgateReviewerEligibility({name:"Self",email:"OWNER@example.com"},user)).toEqual(expect.objectContaining({eligible:false,code:"self-approval"}));
  expect(tollgateReviewerEligibility({name:"Email reviewer",email:"reviewer@example.com"},user)).toEqual(expect.objectContaining({eligible:true,code:"eligible"}));
  expect(tollgateReviewerEligibility({name:"ID reviewer",userId:"reviewer-id"},user)).toEqual(expect.objectContaining({eligible:true,code:"eligible"}));
});
test("completing an existing Team member makes that same record eligible",()=>{
  const project={id:"project-1",team:[{id:"team-1",name:"Michael Scott",email:""}]},user={id:"owner",email:"owner@example.com"};
  expect(eligibleTollgateReviewers(project,user)).toEqual([]);
  const completed={...project,team:[{...project.team[0],email:"michael@example.com"}]};
  expect(eligibleTollgateReviewers(completed,user)).toEqual([expect.objectContaining({id:"team-1"})]);
});

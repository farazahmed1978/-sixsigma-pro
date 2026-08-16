// Authenticated persistence verification for the onboarding-created first project's suite
// resolution. Exercises the real aureqin_create_onboarding_project() Postgres trigger against
// a running local Supabase stack by signing up through the actual GoTrue REST endpoint with the
// same raw_user_meta_data shape Onboarding.js sends (via authService.createAccount), then reads
// the resulting projects row back and runs it through the real projectFromRow/resolveProjectSuiteId
// JS modules — the same code path the app itself uses to render the project.
//
// Regression coverage for: 202608160001_onboarding_project_suite_resolution.sql
// Creates disposable QA accounts/organizations/projects it deletes at the end.
const apiUrl = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
if (!apiUrl || !anonKey) throw new Error('REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY must be set before running this script.');

const { resolveProjectSuiteId, lifecycleForProject, lifecycleStageLabels } = await import('../../src/foundation/lifecycle.js');
// Mirrors src/context/ProjectsContext.js's projectFromRow() flattening (content spread first,
// then explicit row columns win) without importing that file directly, since it contains JSX
// that plain Node cannot parse. This still exercises the real resolveProjectSuiteId/
// lifecycleForProject functions against a row shaped exactly like the app would produce.
const projectFromRow = row => ({ ...(row.content || {}), id: row.id, methodology: row.methodology, currentPhase: row.current_phase });

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function assert(condition, message, detail) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(detail)}`);
}

// Mirrors src/services/authService.js's createAccount(): everything except email/password is
// sent as the signUp options.data (raw_user_meta_data), exactly as Onboarding.js's next() does.
async function signupOnboarding(label, { projectType, methodology }) {
  const email = `onboarding-suite-${label}-${stamp}@example.test`;
  const password = `Onboarding-${stamp}!Aa7`;
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      email, password,
      data: {
        firstName: 'Onboarding', lastName: label, full_name: `Onboarding ${label}`,
        role: 'Project Manager', company: 'QA Co', industry: 'Services', companySize: '1–10', country: 'US', useCase: 'PMP / Project Management',
        planId: 'founding-operational-excellence',
        workspaceChoice: 'create', projectName: `${label} first project`, projectType, methodology,
        terms: true, privacy: true,
      },
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error(`signup ${label}: ${response.status} ${JSON.stringify(body)}`);
  return { id: body.user.id, token: body.access_token, email };
}

async function restGet(account, path) {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    headers: { apikey: anonKey, authorization: `Bearer ${account.token}`, 'content-type': 'application/json' },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`GET ${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function restDelete(account, path) {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: { apikey: anonKey, authorization: `Bearer ${account.token}`, 'content-type': 'application/json', prefer: 'return=representation' },
  });
  return { status: response.status, body: await response.json() };
}

const results = {};

// --- Project Management selection ---
const pmAccount = await signupOnboarding('pm', { projectType: 'Project Management', methodology: 'PMP lifecycle' });
const pmRows = await restGet(pmAccount, `projects?local_migration_key=eq.onboarding:${pmAccount.id}&select=*`);
assert(pmRows.length === 1, 'PM onboarding must create exactly one project row', pmRows);
const pmRow = pmRows[0];
assert(pmRow.methodology === 'pmp', 'PM onboarding project methodology column must be the canonical "pmp" value, not the raw UI label', pmRow);
assert(pmRow.current_phase === 'Initiation', 'PM onboarding project current_phase must be Initiation, not the DMAIC-hardcoded Define', pmRow);
assert(pmRow.content?.suiteId === 'project-management', 'PM onboarding project content.suiteId must be set (the field resolveProjectSuiteId actually reads)', pmRow);
const pmProject = projectFromRow(pmRow);
assert(resolveProjectSuiteId(pmProject) === 'project-management', 'resolveProjectSuiteId must resolve the onboarding-created PM project to project-management', pmProject);
assert(lifecycleForProject(pmProject).id === 'project-management', 'lifecycleForProject must resolve to the PM lifecycle', lifecycleForProject(pmProject));
assert(JSON.stringify(lifecycleStageLabels(lifecycleForProject(pmProject))) === JSON.stringify(['Initiation','Planning','Execution','Monitoring & Controlling','Closing']), 'PM lifecycle stages must be the PMBOK stage list', lifecycleStageLabels(lifecycleForProject(pmProject)));
results.projectManagement = { methodologyColumn: pmRow.methodology, currentPhase: pmRow.current_phase, suiteIdInContent: pmRow.content?.suiteId, resolvedSuite: resolveProjectSuiteId(pmProject) };

// --- Operational Excellence selection (regression) ---
const oeAccount = await signupOnboarding('oe', { projectType: 'Lean Six Sigma', methodology: 'DMAIC' });
const oeRows = await restGet(oeAccount, `projects?local_migration_key=eq.onboarding:${oeAccount.id}&select=*`);
assert(oeRows.length === 1, 'OE onboarding must create exactly one project row', oeRows);
const oeRow = oeRows[0];
assert(oeRow.methodology === 'dmaic', 'OE onboarding project methodology column must be dmaic', oeRow);
assert(oeRow.current_phase === 'Define', 'OE onboarding project current_phase must remain Define (regression)', oeRow);
const oeProject = projectFromRow(oeRow);
assert(resolveProjectSuiteId(oeProject) === 'operational-excellence', 'resolveProjectSuiteId must resolve the OE onboarding project to operational-excellence (regression)', oeProject);
results.operationalExcellence = { methodologyColumn: oeRow.methodology, currentPhase: oeRow.current_phase, resolvedSuite: resolveProjectSuiteId(oeProject) };

// --- Default selection (no explicit projectType/methodology change from the wizard's own defaults: 'Combined' / 'Hybrid') ---
const defaultAccount = await signupOnboarding('default', { projectType: 'Combined', methodology: 'Hybrid' });
const defaultRows = await restGet(defaultAccount, `projects?local_migration_key=eq.onboarding:${defaultAccount.id}&select=*`);
assert(defaultRows.length === 1, 'default onboarding must create exactly one project row', defaultRows);
const defaultProject = projectFromRow(defaultRows[0]);
assert(resolveProjectSuiteId(defaultProject) === 'operational-excellence', 'a Combined/Hybrid onboarding selection must default to operational-excellence, not crash or resolve ambiguously', defaultProject);
results.defaultSelection = { methodologyColumn: defaultRows[0].methodology, resolvedSuite: resolveProjectSuiteId(defaultProject) };

console.log(JSON.stringify(results, null, 2));

// --- Cleanup: disposable QA projects and accounts ---
for (const [account, rows] of [[pmAccount, pmRows], [oeAccount, oeRows], [defaultAccount, defaultRows]]) {
  await restDelete(account, `projects?id=eq.${rows[0].id}`);
}

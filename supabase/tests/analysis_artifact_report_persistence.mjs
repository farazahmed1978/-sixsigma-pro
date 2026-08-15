// Authenticated persistence verification for the canonical analysis -> artifact/Binder -> report
// workflow. Exercises the real cloudRepository/analysisRepository/datasetRepository/projectRepository
// modules (not mocks) against a running local Supabase stack, using the same singleton client
// cloudRepository uses internally.
//
// Regression coverage for: 202608150001_analysis_artifact_report_canonical_grants.sql
// Before that migration, authenticated INSERT into public.analyses (and artifacts/reports) failed
// with PostgreSQL/PostgREST 42501 "permission denied" because those three tables were never added
// to the canonical authenticated grant list, even though RLS was already enabled and policied for
// them. This script proves table-level access now works while RLS remains the row-level authority.
//
// Kept as a separate script from pm_repository_persistence.mjs on purpose: this is a Foundation
// (non-PM) domain fix and should stay independently runnable/reviewable.
const apiUrl = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
if (!apiUrl || !anonKey) throw new Error('REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY must be set before running this script.');

const { supabase } = await import('../../src/lib/supabase.js');
const { cloudRepository } = await import('../../src/repositories/cloudRepository.js');
const { analysisRepository } = await import('../../src/repositories/analysisRepository.js');
const { datasetRepository } = await import('../../src/repositories/datasetRepository.js');
const { projectRepository } = await import('../../src/repositories/projectRepository.js');

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function assert(condition, message, detail) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(detail)}`);
}

async function signupRaw(label) {
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `aar-${label}-${stamp}@example.test`,
      password: `AAR-${stamp}!Aa7`,
      data: { full_name: `AAR ${label}` },
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error(`signup ${label}: ${response.status} ${JSON.stringify(body)}`);
  return { id: body.user.id, token: body.access_token, email: body.user.email };
}

async function outsiderRest(account, path, options = {}) {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: anonKey, authorization: `Bearer ${account.token}`, 'content-type': 'application/json', ...(options.prefer ? { prefer: options.prefer } : {}), ...(options.headers || {}) },
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const results = { grantRegressionTable: 'analyses/artifacts/reports', tables: {}, organizationIsolation: {}, applicationLayerProjectFiltering: {} };

const outsider = await signupRaw('outsider');

const ownerSignup = await supabase.auth.signUp({
  email: `aar-owner-${stamp}@example.test`,
  password: `AAR-${stamp}!Aa7`,
  options: { data: { full_name: 'AAR owner' } },
});
assert(!ownerSignup.error, 'owner signup via supabase client', ownerSignup.error);
const ownerId = ownerSignup.data.user.id;
const ownerProfile = await supabase.from('profiles').select('default_organization_id').eq('id', ownerId).single();
assert(!ownerProfile.error, 'owner profile lookup', ownerProfile.error);
const ownerOrg = ownerProfile.data.default_organization_id;

const projectA = await projectRepository.save({ organization_id: ownerOrg, created_by: ownerId, name: `AAR Project A ${stamp}`, status: 'active', methodology: 'lean-six-sigma', current_phase: 'Measure' });
const projectB = await projectRepository.save({ organization_id: ownerOrg, created_by: ownerId, name: `AAR Project B ${stamp}`, status: 'active', methodology: 'lean-six-sigma', current_phase: 'Measure' });

// Datasets/dataset_versions are prerequisites: the analyses table has a provenance trigger
// (202608130005) that rejects any new-style INSERT lacking a real dataset_version_ids entry,
// a non-empty variable_mapping, and an executed_at timestamp.
const dataset = await cloudRepository.upsert('datasets', { project_id: projectA.id, organization_id: ownerOrg, created_by: ownerId, title: `AAR dataset ${stamp}`, status: 'active', row_count: 10, column_count: 2 });
const datasetVersion = await cloudRepository.upsert('dataset_versions', { dataset_id: dataset.id, project_id: projectA.id, organization_id: ownerOrg, created_by: ownerId, version: 1, status: 'active', content: { columns: ['x', 'y'] } });

// This insert is the exact regression the QA pass caught: before the grant migration it failed
// with 42501 permission denied, never reaching RLS evaluation.
const analysis = await analysisRepository.save({
  project_id: projectA.id, organization_id: ownerOrg, created_by: ownerId, title: `AAR analysis ${stamp}`,
  method: 'capability-analysis', dataset_version_ids: [datasetVersion.id], variable_mapping: { x: 'column_a' },
  executed_at: new Date().toISOString(), content: { marker: 'inserted' },
});
assert(analysis.id, 'authenticated insert into public.analyses must succeed now that the canonical grant exists', analysis);
assert(analysis.provenance_status === 'complete', 'a well-formed analysis insert must satisfy the provenance trigger', analysis);
results.tables.analyses = { createSucceeded: true };

const analysisRead = await cloudRepository.get('analyses', analysis.id);
assert(analysisRead.id === analysis.id, 'authenticated read of the created analysis must succeed', analysisRead);
results.tables.analyses.readSucceeded = true;

const artifact = await cloudRepository.upsert('artifacts', { project_id: projectA.id, organization_id: ownerOrg, created_by: ownerId, title: `AAR artifact ${stamp}`, source_type: 'analysis', source_id: analysis.id, content: { chartType: 'capability-histogram' } });
assert(artifact.id, 'authenticated insert into public.artifacts must succeed now that the canonical grant exists', artifact);
results.tables.artifacts = { createSucceeded: true };
const artifactRead = await cloudRepository.get('artifacts', artifact.id);
assert(artifactRead.source_id === analysis.id, 'authenticated read of the created artifact must succeed and preserve the analysis link', artifactRead);
results.tables.artifacts.readSucceeded = true;

// Reports use client-generated ids and upsert-as-create-or-update, matching the real
// ReportContext.js persistence pattern (not the PM true-insert/version contract).
const reportId = crypto.randomUUID();
const report = await cloudRepository.upsert('reports', { id: reportId, project_id: projectA.id, organization_id: ownerOrg, created_by: ownerId, status: 'active', methodology: 'lean-six-sigma', title: `AAR report ${stamp}`, content: { analysisId: analysis.id, artifactId: artifact.id, marker: 'inserted' } });
assert(report.id === reportId, 'authenticated insert into public.reports must succeed now that the canonical grant exists', report);
results.tables.reports = { createSucceeded: true };

const reportUpdated = await cloudRepository.upsert('reports', { id: reportId, project_id: projectA.id, organization_id: ownerOrg, created_by: ownerId, status: 'active', methodology: 'lean-six-sigma', title: `AAR report ${stamp}`, content: { analysisId: analysis.id, artifactId: artifact.id, marker: 'updated' } });
assert(reportUpdated.content.marker === 'updated', 'authenticated update of the created report must persist', reportUpdated);
results.tables.reports.updateSucceeded = true;
const reportRead = await cloudRepository.get('reports', reportId);
assert(reportRead.content.marker === 'updated', 'authenticated read of the updated report must reflect the latest write', reportRead);
results.tables.reports.readSucceeded = true;

// Application-layer project filtering: list() is always called with an explicit project_id filter,
// so a second project's rows in the same organization must not leak into projectA's view.
const datasetsInProjectA = await datasetRepository.list(projectA.id);
assert(datasetsInProjectA.some(row => row.id === dataset.id), 'datasetRepository.list(projectA) must include the created dataset', datasetsInProjectA);
const analysesInProjectB = await cloudRepository.list('analyses', { project_id: projectB.id });
assert(!analysesInProjectB.some(row => row.id === analysis.id), 'analyses filtered to projectB must not include projectA rows', analysesInProjectB);
results.applicationLayerProjectFiltering = { datasetsScopedToProject: true, analysesScopedToProject: true };

// Organization isolation: RLS on analyses/artifacts/reports (202608070001) is organization-scoped
// via axentra_org_role, not project-scoped (no dedicated per-project policy exists for these three
// tables, unlike the PM tables' own migration). The outsider account, who has no membership in
// ownerOrg, must be unable to read or write these rows even though they hold a valid authenticated
// token that now has the same table-level grant.
for (const [table, id] of [['analyses', analysis.id], ['artifacts', artifact.id], ['reports', reportId]]) {
  const read = await outsiderRest(outsider, `${table}?id=eq.${id}&select=id`);
  assert(read.status === 200 && read.body.length === 0, `${table} organization isolation: outsider must not read owner rows`, read);
  const update = await outsiderRest(outsider, `${table}?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ title: 'forbidden' }) });
  assert(update.status === 200 && update.body.length === 0, `${table} organization isolation: outsider update must affect zero rows`, update);
  const del = await outsiderRest(outsider, `${table}?id=eq.${id}`, { method: 'DELETE', prefer: 'return=representation' });
  assert(del.status === 200 && del.body.length === 0, `${table} organization isolation: outsider delete must affect zero rows`, del);
  results.organizationIsolation[table] = { readRejected: true, updateRejected: true, deleteRejected: true };
}

console.log(JSON.stringify(results, null, 2));

// Cleanup: disposable QA rows/projects. object_links/findings etc. are untouched.
await cloudRepository.remove('reports', reportId);
await cloudRepository.remove('artifacts', artifact.id);
await cloudRepository.remove('analyses', analysis.id);
await cloudRepository.remove('dataset_versions', datasetVersion.id);
await cloudRepository.remove('datasets', dataset.id);
await supabase.from('projects').delete().in('id', [projectA.id, projectB.id]);

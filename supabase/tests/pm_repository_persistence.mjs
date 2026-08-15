// PM Phase 1 authenticated repository verification.
// Exercises the real src/repositories/pmRepository.js module (not a mock) against a running
// local Supabase stack, using the same singleton client cloudRepository uses internally.
// Read-only against Foundation architecture; creates disposable QA rows it deletes at the end.
const apiUrl = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
if (!apiUrl || !anonKey) throw new Error('REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY must be set before running this script.');

const { supabase } = await import('../../src/lib/supabase.js');
const { pmRepository, PM_SUITE_IDENTIFIER } = await import('../../src/repositories/pmRepository.js');
const { projectRepository } = await import('../../src/repositories/projectRepository.js');

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TABLES = ['tasks', 'risks', 'issues', 'decisions', 'approvals', 'activities'];

function assert(condition, message, detail) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(detail)}`);
}

async function signupRaw(label) {
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `pm-phase1-${label}-${stamp}@example.test`,
      password: `PM-phase1-${stamp}!Aa7`,
      data: { full_name: `PM Phase1 ${label}` },
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

const results = { suite: PM_SUITE_IDENTIFIER, tables: {}, isolation: {}, ownership: {}, failurePropagation: {} };

// The outsider account never signs in through the shared client singleton, so it cannot disturb
// the owner session pmRepository relies on; it only ever talks to REST directly for isolation probes.
const outsider = await signupRaw('outsider');
const outsiderOrgProbe = await outsiderRest(outsider, `profiles?id=eq.${outsider.id}&select=default_organization_id`);
const outsiderOrg = outsiderOrgProbe.body[0].default_organization_id;
const outsiderProjectInsert = await outsiderRest(outsider, 'projects', { method: 'POST', prefer: 'return=representation', body: JSON.stringify({ organization_id: outsiderOrg, created_by: outsider.id, name: `Outsider Project ${stamp}` }) });
assert(outsiderProjectInsert.status === 201, 'outsider project create', outsiderProjectInsert);
const outsiderProjectId = outsiderProjectInsert.body[0].id;

// The owner signs up through the real Supabase client instance, so the pmRepository module under
// test runs authenticated exactly as it would from the browser.
const ownerSignup = await supabase.auth.signUp({
  email: `pm-phase1-owner-${stamp}@example.test`,
  password: `PM-phase1-${stamp}!Aa7`,
  options: { data: { full_name: 'PM Phase1 owner' } },
});
assert(!ownerSignup.error, 'owner signup via supabase client', ownerSignup.error);
const ownerId = ownerSignup.data.user.id;
const ownerProfile = await supabase.from('profiles').select('default_organization_id').eq('id', ownerId).single();
assert(!ownerProfile.error, 'owner profile lookup', ownerProfile.error);
const ownerOrg = ownerProfile.data.default_organization_id;

const projectA = await projectRepository.save({ organization_id: ownerOrg, created_by: ownerId, name: `PM Phase1 A ${stamp}`, status: 'active', methodology: 'pmp', current_phase: 'Initiation' });
const projectB = await projectRepository.save({ organization_id: ownerOrg, created_by: ownerId, name: `PM Phase1 B ${stamp}`, status: 'active', methodology: 'pmp', current_phase: 'Initiation' });

const createdIds = {};

for (const table of TABLES) {
  const record = {
    project_id: projectA.id, organization_id: ownerOrg, created_by: ownerId,
    title: `${table} ${stamp}`, content: { marker: 'inserted' }, status: 'active',
    methodology: 'pmp', lifecycle_phase: 'Planning', priority: 'high',
    owner_id: ownerId, metadata: { qa: true },
    suite: 'platform', // deliberately wrong, to prove the repository enforces the canonical value
  };
  const created = await pmRepository[table].create(record);
  createdIds[table] = created.id;

  assert(created.suite === PM_SUITE_IDENTIFIER, `${table} create must enforce the canonical PM suite identifier, not the caller-supplied value`, created);
  assert(created.organization_id === ownerOrg && created.project_id === projectA.id && created.created_by === ownerId, `${table} create must preserve ownership fields`, created);
  assert(created.methodology === 'pmp' && created.lifecycle_phase === 'Planning' && created.priority === 'high', `${table} create must preserve shared metadata/lifecycle fields`, created);

  const fetched = await pmRepository[table].get(created.id);
  assert(fetched.id === created.id, `${table} get round-trip`, fetched);

  const inProjectA = await pmRepository[table].list(projectA.id);
  assert(inProjectA.some(row => row.id === created.id), `${table} list(projectA) must include the created row`, inProjectA);

  const inProjectB = await pmRepository[table].list(projectB.id);
  assert(!inProjectB.some(row => row.id === created.id), `${table} project isolation: list(projectB) must not include projectA rows`, inProjectB);

  const outsiderRead = await outsiderRest(outsider, `${table}?id=eq.${created.id}&select=id`);
  assert(outsiderRead.status === 200 && outsiderRead.body.length === 0, `${table} organization isolation: outsider must not read owner rows`, outsiderRead);

  const updated = await pmRepository[table].update({ ...created, title: `${table} updated ${stamp}`, content: { marker: 'updated' }, suite: 'operational-excellence' });
  assert(updated.suite === PM_SUITE_IDENTIFIER, `${table} update must re-enforce the canonical PM suite identifier`, updated);
  assert(updated.content.marker === 'updated', `${table} update must persist`, updated);

  const outsiderUpdate = await outsiderRest(outsider, `${table}?id=eq.${created.id}`, { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ title: 'forbidden' }) });
  assert(outsiderUpdate.status === 200 && outsiderUpdate.body.length === 0, `${table} organization isolation: outsider update must affect zero rows`, outsiderUpdate);

  const outsiderDelete = await outsiderRest(outsider, `${table}?id=eq.${created.id}`, { method: 'DELETE', prefer: 'return=representation' });
  assert(outsiderDelete.status === 200 && outsiderDelete.body.length === 0, `${table} organization isolation: outsider delete must affect zero rows`, outsiderDelete);

  results.tables[table] = { created: true, suiteEnforcedOnCreate: true, suiteEnforcedOnUpdate: true, ownershipPreserved: true, lifecycleMetadataPreserved: true, projectIsolation: true, organizationIsolation: true };
}

// Ownership-mismatch persistence failure must propagate, not be silently swallowed.
for (const table of TABLES) {
  let threw = null;
  try {
    await pmRepository[table].create({ project_id: outsiderProjectId, organization_id: ownerOrg, created_by: ownerId, title: 'must be rejected' });
  } catch (error) {
    threw = error.message || String(error);
  }
  assert(threw, `${table} create with mismatched project/organization ownership must throw rather than silently persist`, threw);
  results.failurePropagation[table] = threw;
}

// Delete-where-appropriate: remove the QA rows created above.
for (const table of TABLES) {
  await pmRepository[table].remove(createdIds[table]);
  const gone = await pmRepository[table].get(createdIds[table]).catch(error => ({ error: error.message }));
  assert(gone?.error, `${table} delete must remove the row`, gone);
}

console.log(JSON.stringify(results, null, 2));

// Cleanup: disposable QA projects and accounts. object_links/findings etc. are untouched.
await supabase.from('projects').delete().in('id', [projectA.id, projectB.id]);
await outsiderRest(outsider, `projects?id=eq.${outsiderProjectId}`, { method: 'DELETE' });

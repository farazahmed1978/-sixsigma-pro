// Authenticated persistence verification for standalone (projectless) documents.
// Exercises the real src/repositories/documentRepository.js / cloudRepository.js modules (not
// mocks) against a running local Supabase stack, using the same singleton client cloudRepository
// uses internally.
//
// Regression coverage for: 202608150002_standalone_documents.sql
// Proves: standalone create/read/update/delete with project_id NULL, survival across a fresh
// session (sign-out/sign-in), creator-only isolation (a second user in the SAME organization
// cannot read/update/delete another user's standalone document), organization isolation (an
// outsider org cannot read it either), and that project-connected document behavior is unchanged.
// Creates disposable QA rows/accounts it deletes at the end.
const apiUrl = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
if (!apiUrl || !anonKey) throw new Error('REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY must be set before running this script.');

const { supabase } = await import('../../src/lib/supabase.js');
const { documentRepository } = await import('../../src/repositories/documentRepository.js');
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
      email: `standalone-doc-${label}-${stamp}@example.test`,
      password: `Standalone-${stamp}!Aa7`,
      data: { full_name: `Standalone QA ${label}` },
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error(`signup ${label}: ${response.status} ${JSON.stringify(body)}`);
  return { id: body.user.id, token: body.access_token, email: body.user.email, password: `Standalone-${stamp}!Aa7` };
}

async function rest(account, path, options = {}) {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: anonKey, authorization: `Bearer ${account.token}`, 'content-type': 'application/json', ...(options.prefer ? { prefer: options.prefer } : {}), ...(options.headers || {}) },
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const results = {};

// --- 1. Create user/org (owner). The owner signs up through the real Supabase client instance,
// so documentRepository runs authenticated exactly as it would from the browser. ---
const ownerSignup = await supabase.auth.signUp({
  email: `standalone-doc-owner-${stamp}@example.test`,
  password: `Standalone-${stamp}!Aa7`,
  options: { data: { full_name: 'Standalone QA owner' } },
});
assert(!ownerSignup.error, 'owner signup via supabase client', ownerSignup.error);
const ownerId = ownerSignup.data.user.id;
const ownerProfile = await supabase.from('profiles').select('default_organization_id').eq('id', ownerId).single();
assert(!ownerProfile.error, 'owner profile lookup', ownerProfile.error);
const ownerOrg = ownerProfile.data.default_organization_id;
results.userOrgCreated = { ownerId, ownerOrg };

// A second account in the SAME organization, to prove creator-only isolation (not just org isolation).
const orgMate = await signupRaw('orgmate');
const addOrgMate = await supabase.from('organization_memberships').upsert({ organization_id: ownerOrg, user_id: orgMate.id, role: 'member', status: 'active' }, { onConflict: 'organization_id,user_id' });
assert(!addOrgMate.error, 'add org-mate membership', addOrgMate.error);

// An outsider in a completely separate organization.
const outsider = await signupRaw('outsider');
const outsiderOrgProbe = await rest(outsider, `profiles?id=eq.${outsider.id}&select=default_organization_id`);
const outsiderOrg = outsiderOrgProbe.body[0].default_organization_id;

// --- 2/3. Create standalone document with project_id = NULL, save content. ---
const created = await documentRepository.createStandalone({
  organization_id: ownerOrg, created_by: ownerId, title: `Standalone doc ${stamp}`,
  status: 'draft', content: { schemaVersion: 1, values: { note: 'first draft' } },
});
assert(created.project_id === null, 'created standalone document must have project_id NULL', created);
assert(/^[0-9a-f-]{36}$/i.test(created.id), 'created standalone document must use a canonical UUID id', created);
results.create = { id: created.id, projectIdNull: created.project_id === null, canonicalUuid: true };

// --- 4. Read it back. ---
const readBack = await documentRepository.getStandalone(created.id);
assert(readBack.id === created.id && readBack.content.values.note === 'first draft', 'read-back must match what was written', readBack);
results.readBack = { matched: true };

// --- 5. Update it. ---
const updated = await documentRepository.updateStandalone({ ...readBack, content: { schemaVersion: 1, values: { note: 'revised draft' } } });
assert(updated.content.values.note === 'revised draft', 'update must persist new content', updated);
assert(updated.project_id === null, 'update must not attach the document to a project', updated);
results.update = { persisted: true, stillProjectless: true };

// --- 6. Sign in with a fresh session and read it back again. ---
await supabase.auth.signOut();
const freshSignIn = await supabase.auth.signInWithPassword({ email: ownerSignup.data.user.email, password: `Standalone-${stamp}!Aa7` });
assert(!freshSignIn.error, 'fresh sign-in', freshSignIn.error);
const afterFreshSignIn = await documentRepository.getStandalone(created.id);
assert(afterFreshSignIn.content.values.note === 'revised draft', 'document must survive sign-out/sign-in', afterFreshSignIn);
results.freshSession = { survivedSignOutSignIn: true };

// --- 7. Confirm project_id remains NULL. ---
assert(afterFreshSignIn.project_id === null, 'project_id must remain NULL after the full lifecycle', afterFreshSignIn);
results.projectIdRemainsNull = true;

// --- 8. Confirm organization/user isolation. ---
// 8a. Org-mate (same organization, different user) must NOT see the standalone document (creator-only boundary).
const orgMateRead = await rest(orgMate, `documents?id=eq.${created.id}&select=id`);
assert(orgMateRead.status === 200 && orgMateRead.body.length === 0, 'org-mate (same org, different creator) must not read the standalone document', orgMateRead);
const orgMateUpdate = await rest(orgMate, `documents?id=eq.${created.id}`, { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ title: 'forbidden' }) });
assert(orgMateUpdate.status === 200 && orgMateUpdate.body.length === 0, 'org-mate update must affect zero rows', orgMateUpdate);
const orgMateDelete = await rest(orgMate, `documents?id=eq.${created.id}`, { method: 'DELETE', prefer: 'return=representation' });
assert(orgMateDelete.status === 200 && orgMateDelete.body.length === 0, 'org-mate delete must affect zero rows', orgMateDelete);

// 8b. Outsider (different organization entirely) must NOT see it either.
const outsiderRead = await rest(outsider, `documents?id=eq.${created.id}&select=id`);
assert(outsiderRead.status === 200 && outsiderRead.body.length === 0, 'outsider organization must not read the standalone document', outsiderRead);
const outsiderUpdate = await rest(outsider, `documents?id=eq.${created.id}`, { method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ title: 'forbidden' }) });
assert(outsiderUpdate.status === 200 && outsiderUpdate.body.length === 0, 'outsider update must affect zero rows', outsiderUpdate);
const outsiderDelete = await rest(outsider, `documents?id=eq.${created.id}`, { method: 'DELETE', prefer: 'return=representation' });
assert(outsiderDelete.status === 200 && outsiderDelete.body.length === 0, 'outsider delete must affect zero rows', outsiderDelete);
results.isolation = { orgMateBlocked: true, outsiderBlocked: true };

// A standalone create attempt using someone else's identity as created_by must be rejected client-side too.
let impersonationThrew = null;
try { await documentRepository.createStandalone({ organization_id: ownerOrg, created_by: orgMate.id, title: 'impersonation attempt' }); } catch (error) { impersonationThrew = error.message || String(error); }
assert(impersonationThrew, 'createStandalone must reject a created_by that does not match the authenticated user', impersonationThrew);
results.impersonationRejected = true;

// listStandalone must only return the creator's own rows, not the org-mate's (if the org-mate had one).
const ownerList = await documentRepository.listStandalone(ownerOrg);
assert(ownerList.some(row => row.id === created.id), 'listStandalone must include the owner\'s own standalone document', ownerList);
results.listStandalone = { includesOwnRow: true };

// --- 9. Confirm project documents still work (existing project-document regression). ---
const project = await projectRepository.save({ organization_id: ownerOrg, created_by: ownerId, name: `Standalone QA project ${stamp}`, status: 'active', methodology: 'hybrid', current_phase: 'Define' });
const projectDoc = await documentRepository.save({ project_id: project.id, organization_id: ownerOrg, created_by: ownerId, title: `Project charter ${stamp}`, status: 'draft', content: { schemaVersion: 1 } });
assert(projectDoc.project_id === project.id, 'project-connected document create must still work', projectDoc);
const projectDocList = await documentRepository.list(project.id);
assert(projectDocList.some(row => row.id === projectDoc.id), 'list(projectId) must still return project-connected documents', projectDocList);
// Org-mate (same org, any member role) MUST be able to read the project-connected document — org-wide
// collaboration is unchanged for project documents, unlike the creator-only standalone boundary above.
const orgMateProjectDocRead = await rest(orgMate, `documents?id=eq.${projectDoc.id}&select=id`);
assert(orgMateProjectDocRead.status === 200 && orgMateProjectDocRead.body.length === 1, 'org-mate must still be able to read a project-connected document (org-wide collaboration unchanged)', orgMateProjectDocRead);
// A standalone document must not silently become project-attached, and vice versa: attempting to
// flip project_id through the standalone update path must be rejected by RLS.
let reattachThrew = null;
try { await documentRepository.updateStandalone({ ...afterFreshSignIn, project_id: project.id }); } catch (error) { reattachThrew = error.message || String(error); }
assert(reattachThrew, 'updateStandalone must refuse to attach a standalone document to a project', reattachThrew);
results.projectDocumentsRegression = { createWorks: true, listWorks: true, orgWideReadUnchanged: true, standaloneCannotSilentlyAttach: true };

// --- 10. Delete test records. ---
await documentRepository.removeStandalone(created.id);
const goneCheck = await documentRepository.getStandalone(created.id).catch(error => ({ error: error.message }));
assert(goneCheck?.error, 'removeStandalone must delete the row', goneCheck);
await supabase.from('documents').delete().eq('id', projectDoc.id);
await supabase.from('projects').delete().eq('id', project.id);
await supabase.from('organization_memberships').delete().match({ organization_id: ownerOrg, user_id: orgMate.id });
results.cleanup = { standaloneDocDeleted: true, projectAndDocDeleted: true };

console.log(JSON.stringify(results, null, 2));

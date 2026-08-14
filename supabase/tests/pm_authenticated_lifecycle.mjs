const apiUrl = process.env.SUPABASE_API_URL || 'http://127.0.0.1:54321';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function signup(label) {
  const response = await fetch(`${apiUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `pm-foundation-${label}-${stamp}@example.test`,
      password: `PM-foundation-${stamp}!Aa7`,
      data: { full_name: `PM Foundation ${label}` },
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) throw new Error(`signup ${label}: ${response.status} ${JSON.stringify(body)}`);
  return { id: body.user.id, token: body.access_token };
}

function headers(account, prefer) {
  return {
    apikey: publishableKey,
    authorization: `Bearer ${account.token}`,
    'content-type': 'application/json',
    ...(prefer ? { prefer } : {}),
  };
}

async function rest(account, path, options = {}) {
  const response = await fetch(`${apiUrl}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers(account, options.prefer), ...(options.headers || {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { status: response.status, body };
}

function assert(condition, message, detail) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(detail)}`);
}

const owner = await signup('owner');
const outsider = await signup('outsider');
const ownerProfile = await rest(owner, `profiles?id=eq.${owner.id}&select=default_organization_id`);
const outsiderProfile = await rest(outsider, `profiles?id=eq.${outsider.id}&select=default_organization_id`);
const ownerOrg = ownerProfile.body[0].default_organization_id;
const outsiderOrg = outsiderProfile.body[0].default_organization_id;

async function createProject(account, organizationId, name) {
  const result = await rest(account, 'projects', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({ organization_id: organizationId, created_by: account.id, name }),
  });
  assert(result.status === 201, `create project ${name}`, result);
  return result.body[0].id;
}

const projectA = await createProject(owner, ownerOrg, `Project A ${stamp}`);
const projectB = await createProject(owner, ownerOrg, `Project B ${stamp}`);
const outsiderProject = await createProject(outsider, outsiderOrg, `Outsider Project ${stamp}`);
const lifecycleTables = ['tasks', 'risks', 'issues', 'decisions', 'approvals'];
const results = {};

for (const table of lifecycleTables) {
  const inserted = await rest(owner, table, {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify({ project_id: projectA, organization_id: ownerOrg, created_by: owner.id, title: `${table} ${stamp}`, content: { marker: 'inserted' } }),
  });
  assert(inserted.status === 201, `${table} insert`, inserted);
  const id = inserted.body[0].id;
  const read = await rest(owner, `${table}?id=eq.${id}&select=id,project_id,organization_id,title,content`);
  assert(read.status === 200 && read.body.length === 1, `${table} read`, read);
  const otherProjectRead = await rest(owner, `${table}?project_id=eq.${projectB}&id=eq.${id}&select=id`);
  assert(otherProjectRead.status === 200 && otherProjectRead.body.length === 0, `${table} cross-project query isolation`, otherProjectRead);
  const outsiderRead = await rest(outsider, `${table}?id=eq.${id}&select=id`);
  assert(outsiderRead.status === 200 && outsiderRead.body.length === 0, `${table} cross-organization read`, outsiderRead);
  const updated = await rest(owner, `${table}?id=eq.${id}`, {
    method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ title: `${table} updated ${stamp}`, content: { marker: 'updated' } }),
  });
  assert(updated.status === 200 && updated.body[0].content.marker === 'updated', `${table} update`, updated);
  const outsiderUpdate = await rest(outsider, `${table}?id=eq.${id}`, {
    method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ title: 'forbidden' }),
  });
  assert(outsiderUpdate.status === 200 && outsiderUpdate.body.length === 0, `${table} cross-organization update`, outsiderUpdate);
  const outsiderDelete = await rest(outsider, `${table}?id=eq.${id}`, { method: 'DELETE', prefer: 'return=representation' });
  assert(outsiderDelete.status === 200 && outsiderDelete.body.length === 0, `${table} cross-organization delete`, outsiderDelete);
  const deleted = await rest(owner, `${table}?id=eq.${id}`, { method: 'DELETE', prefer: 'return=representation' });
  assert(deleted.status === 200 && deleted.body.length === 1, `${table} delete`, deleted);
  results[table] = { insert: 201, select: 200, update: 200, delete: 200, crossProjectRows: 0, outsiderReadRows: 0, outsiderUpdateRows: 0, outsiderDeleteRows: 0 };
}

const activity = await rest(owner, 'activities', {
  method: 'POST', prefer: 'return=representation',
  body: JSON.stringify({ project_id: projectA, organization_id: ownerOrg, created_by: owner.id, title: `activity ${stamp}`, content: { marker: 'activity' } }),
});
assert(activity.status === 201, 'activities insert', activity);
const activityRead = await rest(owner, `activities?id=eq.${activity.body[0].id}&select=id,project_id,organization_id`);
const outsiderActivityRead = await rest(outsider, `activities?id=eq.${activity.body[0].id}&select=id`);
assert(activityRead.status === 200 && activityRead.body.length === 1, 'activities read', activityRead);
assert(outsiderActivityRead.status === 200 && outsiderActivityRead.body.length === 0, 'activities cross-organization read', outsiderActivityRead);
results.activities = { insert: 201, select: 200, outsiderReadRows: 0 };

const mismatchedOwnership = {};
for (const table of [...lifecycleTables, 'activities']) {
  mismatchedOwnership[table] = await rest(owner, table, {
    method: 'POST', prefer: 'return=representation',
    body: JSON.stringify({ project_id: outsiderProject, organization_id: ownerOrg, created_by: owner.id, title: 'must be rejected' }),
  });
  assert(mismatchedOwnership[table].status >= 400, `${table} project/organization ownership mismatch was accepted`, mismatchedOwnership[table]);
}

console.log(JSON.stringify({ apiUrl, ownerOrg, outsiderOrg, results, mismatchedOwnership }, null, 2));

await rest(owner, `projects?id=in.(${projectA},${projectB})`, { method: 'DELETE' });
await rest(outsider, `projects?id=eq.${outsiderProject}`, { method: 'DELETE' });

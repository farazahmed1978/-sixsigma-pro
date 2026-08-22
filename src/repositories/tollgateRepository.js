import { getSuite } from "../config/suites";
import { supabase } from "../lib/supabase";
import { validateProjectOwnership } from "../services/persistenceSafety";
import {
  TOLLGATE_TYPE,
  authenticatedReviewerIdentity,
  isTollgate,
  normalizeReviewerEmail,
} from "../foundation/tollgate";
const SUITE = getSuite("operational-excellence").id,
  requireCloud = () => {
    if (!supabase) throw new Error("cloud-not-configured");
    return supabase;
  };
const assertScope = async (client, value) => {
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data: project, error } = await client
    .from("projects")
    .select("id,organization_id")
    .eq("id", value.project_id)
    .maybeSingle();
  if (error) throw error;
  validateProjectOwnership({
    userId: user?.id,
    organizationId: value.organization_id,
    projectId: value.project_id,
    createdBy: value.created_by,
    project,
  });
};
const mark = (content) => ({ ...content, item_type: TOLLGATE_TYPE });
const listAssignedBy = async (client, column, value, operator = "eq") => {
  if (!value) return [];
  let query = client
    .from("approvals")
    .select("*")
    .eq("suite", SUITE)
    .eq("content->>item_type", TOLLGATE_TYPE)
    .in("status", ["Submitted", "In Review"]);
  query =
    operator === "ilike" ? query.ilike(column, value) : query.eq(column, value);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};
const assertReviewUpdateScope = async (client, value) => {
  const {
    data: { user },
  } = await client.auth.getUser();
  const identity = authenticatedReviewerIdentity(user);
  if (!identity.id)
    throw new Error(
      "Authenticated user is required for this Tollgate decision.",
    );
  const { data: project, error } = await client
    .from("projects")
    .select("id,organization_id")
    .eq("id", value.project_id)
    .maybeSingle();
  if (error) throw error;
  if (!project || project.organization_id !== value.organization_id)
    throw new Error("The target project does not exist or is not accessible.");
  const assignedId = String(value.content?.assignedReviewerId || ""),
    assignedEmail = normalizeReviewerEmail(
      value.content?.assignedReviewerEmail,
    ),
    submitter = String(value.content?.submittedBy || "");
  const { data: membership, error: membershipError } = await client
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", value.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) throw membershipError;
  const privileged = ["owner", "admin"].includes(membership?.role),
    assigned =
      (assignedId && assignedId === identity.id) ||
      (assignedEmail && assignedEmail === identity.email);
  if (submitter === identity.id || (!privileged && !assigned))
    throw new Error("tollgate-review-not-authorized");
};
export const tollgateRepository = {
  async list(projectId) {
    const { data, error } = await requireCloud()
      .from("approvals")
      .select("*")
      .eq("project_id", projectId)
      .eq("suite", SUITE)
      .eq("content->>item_type", TOLLGATE_TYPE)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
  async listAssigned(user) {
    const client = requireCloud(),
      identity = authenticatedReviewerIdentity(user),
      [byId, byEmail] = await Promise.all([
        listAssignedBy(client, "content->>assignedReviewerId", identity.id),
        listAssignedBy(
          client,
          "content->>assignedReviewerEmail",
          identity.email,
          "ilike",
        ),
      ]);
    return [
      ...new Map([...byId, ...byEmail].map((row) => [row.id, row])).values(),
    ];
  },
  async create(record) {
    const client = requireCloud(),
      value = { ...record, suite: SUITE, content: mark(record.content) };
    await assertScope(client, value);
    const { data, error } = await client
      .from("approvals")
      .insert(value)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(record) {
    if (!record.id) throw new Error("tollgate-update-requires-id");
    const client = requireCloud(),
      value = { ...record, suite: SUITE, content: mark(record.content) },
      version = (Number(record.version) || 1) + 1;
    await assertReviewUpdateScope(client, value);
    let query = client
      .from("approvals")
      .update({ ...value, version })
      .eq("id", record.id)
      .eq("suite", SUITE)
      .eq("content->>item_type", TOLLGATE_TYPE);
    if (record.version != null) query = query.eq("version", record.version);
    const { data, error } = await query.select().single();
    if (error) throw error;
    if (!isTollgate(data)) throw new Error("tollgate-not-found");
    return data;
  },
  async organizationRole(organizationId, userId) {
    const { data, error } = await requireCloud()
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.role || "";
  },
};

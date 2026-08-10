export const CONTRACT_SCHEMA_VERSION = 1;

export const OBJECT_TYPES = Object.freeze([
  'task', 'milestone', 'risk', 'issue', 'action', 'approval', 'resource',
  'cost', 'benefit', 'kpi', 'comment', 'dataset', 'dataset_version',
  'analysis', 'finding', 'decision', 'evidence', 'artifact', 'report', 'activity_event',
]);

const now = () => new Date().toISOString();
const makeId = type => `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const list = value => Array.isArray(value) ? value.filter(Boolean) : [];

export function createPlatformObject(type, input = {}) {
  if (!OBJECT_TYPES.includes(type)) throw new Error(`Unsupported platform object type: ${type}`);
  const createdAt = input.createdAt || input.created_at || now();
  return {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    objectType: type,
    id: input.id || makeId(type),
    organizationId: input.organizationId || input.organization_id || '',
    projectId: input.projectId || input.project_id || '',
    createdBy: input.createdBy || input.created_by || '',
    ownerId: input.ownerId || input.owner_id || input.assigneeId || input.assignee_id || '',
    title: input.title || input.name || '',
    description: input.description || '',
    status: input.status || 'active',
    priority: input.priority || '',
    source: input.source || 'aureqin',
    sourceType: input.sourceType || input.source_type || '',
    sourceId: input.sourceId || input.source_id || '',
    suite: input.suite || 'platform',
    methodology: input.methodology || '',
    lifecyclePhase: input.lifecyclePhase || input.lifecycle_phase || input.phase || '',
    createdAt,
    updatedAt: input.updatedAt || input.updated_at || createdAt,
    version: Number(input.version) || 1,
    links: list(input.links),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
  };
}

export function adaptLegacyObject(type, legacy = {}, scope = {}) {
  return createPlatformObject(type, {
    ...legacy,
    organizationId: legacy.organizationId || scope.organizationId,
    projectId: legacy.projectId || scope.projectId,
    createdBy: legacy.createdBy || scope.createdBy,
    source: legacy.source || 'legacy',
    sourceType: legacy.sourceType || `legacy_${type}`,
    metadata: { ...(legacy.metadata || {}), legacySchemaVersion: legacy.schemaVersion || 0 },
  });
}

export function createResource(input = {}) {
  const resourceType = input.resourceType || input.resource_type || 'person';
  if (!['person', 'team', 'machine', 'work_center', 'facility'].includes(resourceType)) {
    throw new Error(`Unsupported resource type: ${resourceType}`);
  }
  return {
    ...createPlatformObject('resource', input),
    resourceType,
    capacity: input.capacity ?? null,
    calendarId: input.calendarId || '',
    capabilities: Array.isArray(input.capabilities) ? input.capabilities : [],
    siteId: input.siteId || '',
    availability: input.availability || {},
  };
}

export function createObjectLink(input = {}) {
  if (!input.fromType || !input.fromId || !input.toType || !input.toId) throw new Error('Object links require fromType, fromId, toType, and toId.');
  return {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    id: input.id || makeId('link'),
    organizationId: input.organizationId || '',
    projectId: input.projectId || '',
    fromType: input.fromType,
    fromId: input.fromId,
    toType: input.toType,
    toId: input.toId,
    relationship: input.relationship || 'references',
    createdBy: input.createdBy || '',
    createdAt: input.createdAt || now(),
    metadata: input.metadata || {},
  };
}

export function createActivityEvent(input = {}) {
  if (!input.eventType) throw new Error('Activity events require an eventType.');
  return {
    ...createPlatformObject('activity_event', { ...input, title: input.title || input.eventType }),
    eventType: input.eventType,
    actorId: input.actorId || input.createdBy || '',
    objectType: input.subjectType || input.objectType || '',
    objectId: input.subjectId || input.objectId || '',
    occurredAt: input.occurredAt || input.createdAt || now(),
    summary: input.summary || '',
    // Payloads are deliberately metadata-only; callers must not include secrets or raw datasets.
    metadata: input.metadata || {},
  };
}

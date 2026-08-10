import { CONTRACT_SCHEMA_VERSION, createObjectLink, createPlatformObject } from './sharedContracts';

export const VALIDATION_STATUS = Object.freeze({
  VALIDATED: 'VALIDATED',
  PARTIALLY_VALIDATED: 'PARTIALLY VALIDATED',
  UNVALIDATED: 'UNVALIDATED',
});

export function createDatasetVersion(input = {}) {
  if (!input.datasetId) throw new Error('Dataset versions require a datasetId.');
  const version = Number(input.version);
  if (!Number.isInteger(version) || version < 1) throw new Error('Dataset version must be a positive integer.');
  return {
    ...createPlatformObject('dataset_version', input),
    datasetId: input.datasetId,
    version,
    parentVersionId: input.parentVersionId || '',
    fingerprint: input.fingerprint || '',
    rowCount: Number(input.rowCount) || 0,
    columnCount: Number(input.columnCount) || 0,
    schema: Array.isArray(input.schema) ? input.schema : [],
    changeSummary: input.changeSummary || '',
  };
}

export function createAnalysisMetadata(input = {}) {
  const datasetIds = input.datasetIds || (input.datasetId ? [input.datasetId] : []);
  const versionIds = input.datasetVersionIds || (input.datasetVersionId ? [input.datasetVersionId] : []);
  const versionLinks = input.datasetVersionLinks || versionIds.map((datasetVersionId, index) => ({ datasetVersionId, datasetRole: index === 0 ? 'primary' : 'supporting' }));
  return {
    ...createPlatformObject('analysis', input),
    analysisId: input.analysisId || input.id || '',
    method: input.method || input.toolType || input.toolId || 'analysis',
    methodVersion: input.methodVersion || '1',
    datasetIds,
    datasetVersionIds: versionIds,
    // Persist these as rows in analysis_dataset_versions; the ID array is a compatibility/cache field.
    datasetVersionLinks: versionLinks,
    // Legacy numeric version remains readable while stable version IDs are introduced.
    legacyDatasetVersion: Number(input.datasetVersion) || null,
    parameters: input.parameters || input.inputConfiguration || {},
    variableMapping: input.variableMapping || {},
    resultSchemaVersion: input.resultSchemaVersion || '1',
    validationStatus: input.validationStatus || VALIDATION_STATUS.UNVALIDATED,
    executedAt: input.executedAt || input.createdAt || new Date().toISOString(),
  };
}

export function serializeAnalysisMetadata(input) {
  return JSON.stringify(createAnalysisMetadata(input));
}

export function deserializeAnalysisMetadata(serialized) {
  return createAnalysisMetadata(JSON.parse(serialized));
}

export function createFinding(input = {}) {
  if (!input.analysisId && !input.sourceId) throw new Error('A finding must reference an analysis or source object.');
  return {
    ...createPlatformObject('finding', input),
    findingType: input.findingType || 'statistical_finding',
    analysisId: input.analysisId || '',
    resultPath: input.resultPath || '',
    severity: input.severity || 'info',
    statement: input.statement || input.description || '',
    evidenceIds: Array.isArray(input.evidenceIds) ? input.evidenceIds : [],
  };
}

export function linkFindingTo(finding, targetType, targetId, relationship = 'generated') {
  return createObjectLink({
    organizationId: finding.organizationId,
    projectId: finding.projectId,
    fromType: 'finding', fromId: finding.id,
    toType: targetType, toId: targetId,
    relationship, createdBy: finding.createdBy,
  });
}

export const PROVENANCE_SCHEMA_VERSION = CONTRACT_SCHEMA_VERSION;

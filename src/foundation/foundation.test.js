import { createActivityEvent, createObjectLink, createPlatformObject, createResource, adaptLegacyObject } from './sharedContracts';
import { createAnalysisMetadata, createDatasetVersion, createFinding, deserializeAnalysisMetadata, linkFindingTo, serializeAnalysisMetadata, VALIDATION_STATUS } from './provenance';
import { compareExpected, runValidationCase, validateMethod, validationStatus } from './validation';
import { STATISTICAL_VALIDATION_CATALOG } from './validationCatalog';
import { createAssumptionRule, createDecisionRule, evaluateGuidance } from './guidance';
import { createChartModel, ExportRendererRegistry } from './exportModels';
import { createAuthorizedRepository } from './authorization';

describe('Foundation-0 shared contracts', () => {
  test('adapts legacy objects without losing their identifiers or extension data', () => {
    const task = adaptLegacyObject('task', { id: 'legacy-1', name: 'Contain defect', custom: 'retained', metadata: { lane: 'Quality' } }, { projectId: 'p1', organizationId: 'o1' });
    expect(task).toMatchObject({ id: 'legacy-1', title: 'Contain defect', projectId: 'p1', organizationId: 'o1', source: 'legacy' });
    expect(task.metadata).toMatchObject({ lane: 'Quality', legacySchemaVersion: 0 });
  });

  test('supports non-human resources and validates trace links', () => {
    expect(createResource({ title: 'Line 4', resourceType: 'machine', capabilities: ['milling'], siteId: 'site-1' })).toMatchObject({ resourceType: 'machine', capabilities: ['milling'], siteId: 'site-1' });
    expect(() => createResource({ resourceType: 'unsupported' })).toThrow('Unsupported resource type');
    expect(createObjectLink({ fromType: 'finding', fromId: 'f1', toType: 'action', toId: 'a1' }).relationship).toBe('references');
  });

  test('creates metadata-only activity events', () => {
    const event = createActivityEvent({ eventType: 'dataset.changed', subjectType: 'dataset', subjectId: 'd1', metadata: { changedColumns: 2 } });
    expect(event).toMatchObject({ eventType: 'dataset.changed', objectType: 'dataset', objectId: 'd1' });
    expect(event).not.toHaveProperty('rawData');
  });

  test('rejects unsupported platform objects', () => expect(() => createPlatformObject('secret')).toThrow());
});

describe('provenance and reproducibility', () => {
  test('round-trips analysis metadata and stable dataset version links', () => {
    const version = createDatasetVersion({ id: 'dv1', datasetId: 'd1', version: 3, rowCount: 10 });
    const analysis = createAnalysisMetadata({ id: 'a1', analysisId: 'a1', method: 'one-way-anova', methodVersion: '1', datasetIds: ['d1'], datasetVersionIds: [version.id], parameters: { alpha: .05 }, variableMapping: { response: 'Y' } });
    expect(deserializeAnalysisMetadata(serializeAnalysisMetadata(analysis))).toMatchObject({ method: 'one-way-anova', datasetVersionIds: ['dv1'], datasetVersionLinks: [{ datasetVersionId: 'dv1', datasetRole: 'primary' }], validationStatus: VALIDATION_STATUS.UNVALIDATED });
  });

  test('links findings to downstream work without copying result text', () => {
    const finding = createFinding({ id: 'f1', analysisId: 'a1', projectId: 'p1', statement: 'Process is unstable' });
    expect(linkFindingTo(finding, 'action', 'act1', 'creates')).toMatchObject({ fromId: 'f1', toId: 'act1', relationship: 'creates' });
  });
});

describe('statistical validation harness', () => {
  const verifiedCase = { id: 'sum', input: [1, 2, 3], expected: { referenceVerified: true, outputs: { estimate: 6 } }, tolerances: { estimate: { absolute: 0 } } };

  test('compares nested numerical outputs using absolute and relative tolerance', () => {
    const result = compareExpected({ estimate: 1.0000001, ci: [0, 2] }, { estimate: 1, ci: [0, 2] }, { default: { absolute: 1e-6 } });
    expect(result.pass).toBe(true);
  });

  test('runs verified cases and derives evidence-based statuses', () => {
    const result = runValidationCase(verifiedCase, values => ({ estimate: values.reduce((sum, value) => sum + value, 0) }));
    expect(result.status).toBe('PASSED');
    expect(validationStatus([verifiedCase], [result])).toBe(VALIDATION_STATUS.VALIDATED);
    const pending = { id: 'pending', input: [], expected: null };
    expect(validationStatus([verifiedCase, pending], [result])).toBe(VALIDATION_STATUS.PARTIALLY_VALIDATED);
    expect(validationStatus([verifiedCase], [])).toBe(VALIDATION_STATUS.UNVALIDATED);
  });

  test('never executes or validates unverified reference fixtures', () => {
    const calculator = jest.fn();
    const pending = { ...verifiedCase, expected: { referenceVerified: false, outputs: { estimate: 6 } } };
    expect(runValidationCase(pending, calculator).status).toBe('PENDING_REFERENCE');
    expect(calculator).not.toHaveBeenCalled();
  });

  test('catalog wires five representative families but reports them honestly', () => {
    expect(STATISTICAL_VALIDATION_CATALOG).toHaveLength(5);
    STATISTICAL_VALIDATION_CATALOG.forEach(manifest => expect(validateMethod(manifest, manifest.runner).status).toBe(VALIDATION_STATUS.UNVALIDATED));
  });
});

describe('deterministic guidance and export boundaries', () => {
  test('evaluates versioned rules deterministically with explicit diagnostics', () => {
    const rules = [createDecisionRule({ id: 'two-groups', priority: 10, when: ctx => ctx.groups === 2, recommendation: { method: 'two-sample-t' }, assumptionRuleIds: ['numeric'] })];
    const assumptions = [createAssumptionRule({ id: 'numeric', evaluate: ctx => ({ status: ctx.responseType === 'numeric' ? 'PASS' : 'FAIL' }) })];
    expect(evaluateGuidance({ groups: 2, responseType: 'numeric' }, rules, assumptions).recommended).toMatchObject({ ruleId: 'two-groups', diagnostics: [{ ruleId: 'numeric', status: 'PASS', explanation: '' }] });
  });

  test('renders semantic chart models through a format-specific registry', () => {
    const model = createChartModel({ id: 'chart1', chartType: 'line', series: [{ values: [1, 2] }] });
    const registry = new ExportRendererRegistry().register('chart', 'svg', value => `<svg data-id="${value.id}" />`);
    expect(registry.render(model, 'svg')).toContain('chart1');
    expect(() => registry.render(model, 'pdf')).toThrow('No pdf renderer');
  });
});

describe('authorization boundary', () => {
  test('requires authentication and explicit RLS scopes before retrieval', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 'allowed' }]);
    const repository = createAuthorizedRepository({ getSession: async () => ({ user: { id: 'u1' } }), query });
    await expect(repository.retrieve({ organizationId: 'o1', projectId: 'p1', objectType: 'finding' })).resolves.toEqual([{ id: 'allowed' }]);
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ authenticatedUserId: 'u1', organizationId: 'o1', projectId: 'p1' }));
    await expect(repository.retrieve({ projectId: 'p1', objectType: 'finding' })).rejects.toThrow('explicit organization');
  });

  test('does not query when no authenticated user exists', async () => {
    const query = jest.fn();
    const repository = createAuthorizedRepository({ getSession: async () => null, query });
    await expect(repository.retrieve({ organizationId: 'o1', projectId: 'p1', objectType: 'finding' })).rejects.toThrow('Authentication required');
    expect(query).not.toHaveBeenCalled();
  });
});

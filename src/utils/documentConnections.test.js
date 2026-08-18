import {applyDocumentConnections, detectStaleConnections, resyncProvenanceEntry, isConnectionValueUnedited} from './documentConnections';
import {DOCUMENT_CONNECTIONS, connectionsForTarget} from '../config/artifactContext';

const doc = (id, values, updatedAt = '2026-01-01T00:00:00.000Z') => ({[`document-${id}`]: {id: `document-${id}`, templateId: id, updatedAt, values}});
const project = documents => ({id: 'p1', documents});

describe('DOCUMENT_CONNECTIONS registry', () => {
  test('every connection has a unique id and a valid kind', () => {
    const ids = DOCUMENT_CONNECTIONS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    DOCUMENT_CONNECTIONS.forEach(c => expect(['table', 'aggregate', 'narrative', 'conditional-scalar-row']).toContain(c.kind));
  });

  test('connectionsForTarget resolves the right subset', () => {
    const toChangeLog = connectionsForTarget('change-log');
    expect(toChangeLog).toHaveLength(1);
    expect(toChangeLog[0].sourceDocId).toBe('change-request');
  });
});

describe('table connection: risk-register -> raid-log', () => {
  test('maps every field, creates rows from scratch', () => {
    const proj = project(doc('risk-register', {riskRows: [{id: 'r1', riskId: 'R1', risk: 'Vendor delay', probability: 3, impact: 4, owner: 'Sam', response: 'Qualify backup', status: 'Open'}]}));
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'raid-log', targetValues: {}});
    expect(values.raidRiskRows).toHaveLength(1);
    expect(values.raidRiskRows[0]).toMatchObject({id: 'R1', description: 'Vendor delay', probability: 3, impact: 4, owner: 'Sam', response: 'Qualify backup', status: 'Open'});
  });

  test('never overwrites a cell the user already filled in', () => {
    const proj = project(doc('risk-register', {riskRows: [{id: 'r1', riskId: 'R1', risk: 'Vendor delay', probability: 3, impact: 4, owner: 'Sam', status: 'Open'}]}));
    const {values} = applyDocumentConnections({
      project: proj, targetDocId: 'raid-log',
      targetValues: {raidRiskRows: [{id: 'row-a', description: 'User already wrote this description', owner: ''}]},
    });
    expect(values.raidRiskRows[0].description).toBe('User already wrote this description');
    expect(values.raidRiskRows[0].owner).toBe('Sam'); // blank cell still gets filled
  });

  test('leaves the target untouched when the source document does not exist yet', () => {
    const proj = project({});
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'raid-log', targetValues: {raidRiskRows: []}});
    expect(values.raidRiskRows).toEqual([]);
  });
});

describe('table connection: progressive enrichment of the same target row by two different sources', () => {
  test('benefits-management-plan seeds the row, benefits-tracking-register later fills in the rest by position', () => {
    const proj = project({
      ...doc('benefits-management-plan', {benefitRows: [{id: 'b1', benefit: 'Reduce onboarding time', metric: 'days to first order', baseline: 14, target: 5}]}),
      ...doc('benefits-tracking-register', {benefitRows: [{id: 't1', currentValue: 6, variance: 1, status: 'Tracking'}]}),
    });
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'benefits-realization-review', targetValues: {}});
    expect(values.benefitsAssessmentRows).toHaveLength(1);
    expect(values.benefitsAssessmentRows[0]).toMatchObject({benefit: 'Reduce onboarding time', metric: 'days to first order', baseline: 14, target: 5, actual: 6, variance: 1, realizationStatus: 'Tracking'});
  });
});

describe('aggregate connection: cost-baseline total -> evm-dashboard bac', () => {
  test('sums the costByPhaseRows total column', () => {
    const proj = project(doc('cost-baseline', {costByPhaseRows: [{id: 'c1', total: 1200}, {id: 'c2', total: 800}]}));
    const {values, provenance} = applyDocumentConnections({project: proj, targetDocId: 'evm-dashboard', targetValues: {}});
    expect(values.bac).toBe(2000);
    expect(provenance.bac.sourceDocId).toBe('cost-baseline');
  });

  test('does not overwrite an already-entered BAC', () => {
    const proj = project(doc('cost-baseline', {costByPhaseRows: [{id: 'c1', total: 1200}]}));
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'evm-dashboard', targetValues: {bac: '5000'}});
    expect(values.bac).toBe('5000');
  });

  test('ignores non-numeric totals gracefully', () => {
    const proj = project(doc('cost-baseline', {costByPhaseRows: [{id: 'c1', total: ''}, {id: 'c2', total: 'n/a'}]}));
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'evm-dashboard', targetValues: {}});
    expect(values.bac).toBeUndefined();
  });
});

describe('narrative connection: evm-dashboard -> final-project-report', () => {
  test('builds a starting-point narrative from CPI/EAC/VAC and from SPI', () => {
    const proj = project(doc('evm-dashboard', {CPI: '1.13', EAC: '444.44', VAC: '55.56', SPI: '0.90'}));
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'final-project-report', targetValues: {}});
    expect(values.costPerformanceSummary).toContain('CPI is 1.13');
    expect(values.costPerformanceSummary).toContain('VAC is 55.56');
    expect(values.schedulePerformanceSummary).toContain('SPI is 0.90');
  });

  test('does not populate when the EVM Dashboard has no data yet', () => {
    const proj = project(doc('evm-dashboard', {}));
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'final-project-report', targetValues: {}});
    expect(values.costPerformanceSummary).toBeUndefined();
  });

  test('never overwrites a narrative the user already wrote', () => {
    const proj = project(doc('evm-dashboard', {CPI: '1.13'}));
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'final-project-report', targetValues: {costPerformanceSummary: 'My own analysis.'}});
    expect(values.costPerformanceSummary).toBe('My own analysis.');
  });
});

describe('conditional-scalar-row connection: change-request -> change-log', () => {
  test('appends a row only when the change request is approved', () => {
    const proj = project(doc('change-request', {changeRequestId: 'CR-014', changeTitle: 'Add tier', requestor: 'Finance', dateSubmitted: '2026-05-01', recommendation: 'Approve'}));
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'change-log', targetValues: {}});
    expect(values.changeRegisterRows).toHaveLength(1);
    expect(values.changeRegisterRows[0]).toMatchObject({changeId: 'CR-014', title: 'Add tier', requestor: 'Finance', dateSubmitted: '2026-05-01', status: 'Approved'});
  });

  test('does not append a row when the change request is not approved', () => {
    const proj = project(doc('change-request', {changeRequestId: 'CR-014', recommendation: 'Reject'}));
    const {values} = applyDocumentConnections({project: proj, targetDocId: 'change-log', targetValues: {}});
    expect(values.changeRegisterRows || []).toHaveLength(0);
  });

  test('does not duplicate the row on a second open', () => {
    const proj = project(doc('change-request', {changeRequestId: 'CR-014', recommendation: 'Approve'}));
    const first = applyDocumentConnections({project: proj, targetDocId: 'change-log', targetValues: {}});
    const second = applyDocumentConnections({project: proj, targetDocId: 'change-log', targetValues: first.values});
    expect(second.values.changeRegisterRows).toHaveLength(1);
  });
});

describe('detectStaleConnections', () => {
  test('flags a provenance entry whose source document has been updated since population', () => {
    const proj = project(doc('cost-baseline', {costByPhaseRows: [{id: 'c1', total: 1200}]}, '2026-02-01T00:00:00.000Z'));
    const provenance = {bac: {sourceDocId: 'cost-baseline', sourceUpdatedAt: '2026-01-01T00:00:00.000Z', populatedValue: 1000}};
    const stale = detectStaleConnections({project: proj, provenance});
    expect(stale).toHaveLength(1);
    expect(stale[0].provenanceKey).toBe('bac');
  });

  test('does not flag when the source has not changed since population', () => {
    const proj = project(doc('cost-baseline', {costByPhaseRows: []}, '2026-01-01T00:00:00.000Z'));
    const provenance = {bac: {sourceDocId: 'cost-baseline', sourceUpdatedAt: '2026-01-01T00:00:00.000Z', populatedValue: 1000}};
    expect(detectStaleConnections({project: proj, provenance})).toHaveLength(0);
  });
});

describe('resyncProvenanceEntry', () => {
  test('pulls the fresh value for a table cell even though the target already has the (stale) old value', () => {
    const proj = project(doc('risk-register', {riskRows: [{id: 'r1', riskId: 'R1', risk: 'Vendor delay', probability: 5, impact: 5, owner: 'Sam', status: 'Open'}]}, '2026-02-01T00:00:00.000Z'));
    const provenance = {'raidRiskRows:0:description': {kind: 'table', connectionId: 'risk-register.riskRows->raid-log.raidRiskRows', sourceDocId: 'risk-register', sourceField: 'riskRows', sourceKey: 'risk', rowIndex: 0, targetField: 'raidRiskRows', targetKey: 'description', sourceUpdatedAt: '2026-01-01T00:00:00.000Z', populatedValue: 'Old description'}};
    const targetValues = {raidRiskRows: [{id: 'row-a', description: 'Old description'}]};
    const {values, provenance: nextProvenance} = resyncProvenanceEntry({project: proj, targetValues, provenanceKey: 'raidRiskRows:0:description', provenance});
    expect(values.raidRiskRows[0].description).toBe('Vendor delay');
    expect(nextProvenance['raidRiskRows:0:description'].populatedValue).toBe('Vendor delay');
  });
});

describe('isConnectionValueUnedited', () => {
  test('true when the current value still matches what was auto-populated', () => {
    expect(isConnectionValueUnedited('Sam', {populatedValue: 'Sam'})).toBe(true);
  });
  test('false once the user has changed the value', () => {
    expect(isConnectionValueUnedited('Someone Else', {populatedValue: 'Sam'})).toBe(false);
  });
  test('false when there is no provenance entry', () => {
    expect(isConnectionValueUnedited('Sam', undefined)).toBe(false);
  });
});

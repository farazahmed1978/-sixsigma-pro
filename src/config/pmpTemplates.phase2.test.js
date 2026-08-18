import {PMP_TEMPLATES} from './pmpTemplates';

// The 41 documents Phase 2 replaced from the generic three-section wrapper with purpose-built
// schemas. Kept as an explicit list (mirroring the task's own enumeration) rather than inferred by
// exclusion, so a future document accidentally left generic — or accidentally added here before it
// actually has a purpose-built schema — fails loudly instead of silently passing.
const PHASE_2_DOCUMENT_NAMES = [
  // Planning
  'Project Management Plan','Configuration Management Plan','Change Management Plan',
  'Scope Management Plan','Scope Statement','WBS Dictionary','Requirements Management Plan',
  'Schedule Management Plan','Cost Management Plan','Cost Baseline',
  'Resource Management Plan','Resource Calendar',
  'Communications Management Plan','Stakeholder Engagement Plan',
  'Risk Management Plan','Risk Report',
  'Procurement Management Plan','Quality Management Plan',
  // Execution
  'Issue Log','Action Item Log','RAID Log','Change Request','Procurement Documents',
  'Vendor Evaluation','Lessons Learned Register','Team Performance Reviews',
  // Monitoring & Controlling
  'Status Report','Executive Dashboard','Variance Report','Milestone Report','Change Log',
  'Quality Audit','Risk Review','KPI Dashboard',
  // Closing
  'Final Project Report','Lessons Learned Report','Project Closure Report','Transition Plan',
  'Acceptance Signoff','Benefits Realization Review','Archive Checklist',
];

const templateByName = name => PMP_TEMPLATES.find(item => item.name === name);
const allFields = template => template.sections.flatMap(section => section.fields);
const GENERIC_SECTION_TITLES = ['Purpose and Governance', 'Managed Items', 'Review and Approval'];
const GENERIC_GUIDANCE_FRAGMENTS = [
  'Maintain structured, accountable records and current status.',
  'Document decisions, exceptions, and approval conditions.',
];

test('every Phase 2 document name resolves to a real PMP_TEMPLATES entry', () => {
  PHASE_2_DOCUMENT_NAMES.forEach(name => {
    expect(templateByName(name)).toBeTruthy();
  });
});

test('all 41 Phase 2 documents are accounted for (no more, no fewer)', () => {
  expect(PHASE_2_DOCUMENT_NAMES).toHaveLength(41);
});

describe.each(PHASE_2_DOCUMENT_NAMES)('%s', name => {
  const template = templateByName(name);

  test('does not use the generic three-section wrapper', () => {
    const titles = template.sections.map(section => section.title);
    expect(titles).not.toEqual(GENERIC_SECTION_TITLES);
    const guidanceTexts = template.sections.map(section => section.guidance);
    GENERIC_GUIDANCE_FRAGMENTS.forEach(fragment => {
      expect(guidanceTexts).not.toContain(fragment);
    });
  });

  test('every section has a substantive, non-generic guidance string', () => {
    template.sections.forEach(section => {
      expect(typeof section.guidance).toBe('string');
      expect(section.guidance.length).toBeGreaterThanOrEqual(30);
    });
  });

  test('every section title names what it actually contains (no blank or placeholder titles)', () => {
    template.sections.forEach(section => {
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.title).not.toBe('Managed Items');
    });
  });

  test('at least one section has a concrete example, not placeholder text', () => {
    const exampleSections = template.sections.filter(section => typeof section.example === 'string' && section.example.length > 0);
    expect(exampleSections.length).toBeGreaterThanOrEqual(1);
    exampleSections.forEach(section => {
      expect(section.example.toLowerCase()).not.toContain('fill in');
      expect(section.example.toLowerCase()).not.toContain('placeholder');
    });
  });

  test('every table field has real columns, each with a label', () => {
    allFields(template).filter(field => field.type === 'table').forEach(field => {
      expect(Array.isArray(field.columns)).toBe(true);
      expect(field.columns.length).toBeGreaterThan(0);
      field.columns.forEach(column => {
        expect(column.label).toBeTruthy();
        expect(column.key || column.id).toBeTruthy();
      });
    });
  });

  test('every select field (standalone or table column) has real options', () => {
    allFields(template).filter(field => field.type === 'select').forEach(field => {
      expect(Array.isArray(field.options)).toBe(true);
      expect(field.options.length).toBeGreaterThan(0);
    });
    allFields(template).filter(field => field.type === 'table').forEach(field => {
      field.columns.filter(column => column.type === 'select').forEach(column => {
        expect(Array.isArray(column.options)).toBe(true);
        expect(column.options.length).toBeGreaterThan(0);
      });
    });
  });

  test('every standalone field has a camelCase id (the convention updateValue(field.id, value) requires)', () => {
    allFields(template).forEach(field => {
      expect(field.id).toBeTruthy();
      expect(field.id).toMatch(/^[a-z][a-zA-Z0-9]*$/);
    });
  });

  test('every table column key is camelCase', () => {
    allFields(template).filter(field => field.type === 'table').forEach(field => {
      field.columns.forEach(column => {
        expect(column.key).toMatch(/^[a-z][a-zA-Z0-9]*$/);
      });
    });
  });
});

// Spot checks against the task's own explicit field/section requirements for a representative
// sample — the describe.each block above already verifies structural quality for all 41
// generically; these confirm a few documents match their literal specified shape.
test('Project Management Plan has the specified methodology choice field with the three specified options', () => {
  const template = templateByName('Project Management Plan');
  const methodologyField = allFields(template).find(field => field.id === 'methodology');
  expect(methodologyField.type).toBe('select');
  expect(methodologyField.options).toEqual(['Predictive', 'Agile', 'Hybrid']);
});

test('Risk Management Plan has probability and impact scale tables plus a monitoring frequency choice', () => {
  const template = templateByName('Risk Management Plan');
  const fields = allFields(template);
  expect(fields.some(field => field.id === 'probabilityScaleRows')).toBe(true);
  expect(fields.some(field => field.id === 'impactScaleRows')).toBe(true);
  const monitoringFrequency = fields.find(field => field.id === 'monitoringFrequency');
  expect(monitoringFrequency.options).toEqual(['Weekly', 'Bi-weekly', 'Monthly']);
});

test('Status Report has the specified Green/Yellow/Red overall status choice', () => {
  const template = templateByName('Status Report');
  const overallStatus = allFields(template).find(field => field.id === 'overallStatus');
  expect(overallStatus.options).toEqual(['Green', 'Yellow', 'Red']);
});

test('Issue Log register table has every specified column', () => {
  const template = templateByName('Issue Log');
  const issueTable = allFields(template).find(field => field.id === 'issueRows');
  const keys = issueTable.columns.map(column => column.key);
  expect(keys).toEqual(['issueId', 'title', 'description', 'category', 'priority', 'owner', 'dateIdentified', 'targetResolutionDate', 'resolution', 'status']);
});

test('Acceptance Signoff deliverable signoff table uses the specified signature status options', () => {
  const template = templateByName('Acceptance Signoff');
  const signoffTable = allFields(template).find(field => field.id === 'deliverableSignoffRows');
  const signatureStatusColumn = signoffTable.columns.find(column => column.key === 'signatureStatus');
  expect(signatureStatusColumn.options).toEqual(['Signed', 'Pending', 'Rejected']);
});

test('every already-purpose-built document (marked done, not touched by Phase 2) is unaffected', () => {
  ['WBS', 'Requirements Traceability Matrix', 'Schedule Baseline', 'Risk Register', 'Decision Log', 'Benefits Tracking Register'].forEach(name => {
    const template = templateByName(name);
    expect(template.sections.map(section => section.title)).not.toEqual(GENERIC_SECTION_TITLES);
  });
});

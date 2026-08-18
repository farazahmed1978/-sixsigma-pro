import {PMP_TEMPLATES} from './pmpTemplates';

const template = id => PMP_TEMPLATES.find(item => item.id === id);
const allFields = tpl => tpl.sections.flatMap(section => section.fields);
const field = (id, fieldId) => allFields(template(id)).find(item => item.id === fieldId);
const column = (id, fieldId, key) => field(id, fieldId).columns.find(item => item.key === key);

// Per-row calculated columns: [docId, tableFieldId, columnKey, populatedRowInput, expectedValue, incompleteRowInput]
// incompleteRowInput always omits at least one of the operands the calculation needs, to verify
// the calculation blanks out rather than guessing (Number(undefined)->NaN or Number('')->0 would
// silently produce a misleading 0, which is worse than leaving the cell blank).
const ROW_CALC_CASES = [
  ['risk-register', 'riskRows', 'exposure', {probability: 3, impact: 4}, 12, {probability: '', impact: 4}],
  ['raid-log', 'raidRiskRows', 'exposure', {probability: 2, impact: 5}, 10, {probability: 2, impact: ''}],
  ['risk-report', 'topRiskRows', 'exposure', {probability: 4, impact: 4}, 16, {probability: '', impact: ''}],
  ['risk-review', 'emergingRiskRows', 'exposure', {probability: 1, impact: 3}, 3, {probability: null, impact: 3}],
  ['benefits-tracking-register', 'benefitRows', 'variance', {targetValue: 100, currentValue: 80}, -20, {targetValue: '', currentValue: 80}],
  ['benefits-realization-review', 'benefitsAssessmentRows', 'variance', {target: 50, actual: 60}, 10, {target: 50, actual: ''}],
  ['milestone-report', 'milestoneStatusRows', 'varianceDays', {plannedDate: '2026-01-01', actualForecastDate: '2026-01-08'}, 7, {plannedDate: '', actualForecastDate: '2026-01-08'}],
  ['executive-dashboard', 'kpiRows', 'variance', {target: 10, actual: 14}, 4, {target: 10, actual: ''}],
  ['kpi-dashboard', 'kpiPerformanceRows', 'variance', {target: 2, currentValue: 1.4}, -0.6, {target: '', currentValue: 1.4}],
  ['vendor-evaluation', 'criteriaScoringRows', 'weightedScore', {vendorScore: 8, weight: 0.3}, 2.4, {vendorScore: 8, weight: ''}],
];

describe.each(ROW_CALC_CASES)('%s.%s.%s calculate()', (docId, fieldId, columnKey, populatedInput, expected, incompleteInput) => {
  const tpl = template(docId);

  test('the template exposes a calculate() function', () => {
    expect(typeof tpl.calculate).toBe('function');
  });

  test('computes the correct value for a fully populated row', () => {
    const result = tpl.calculate({[fieldId]: [{id: 'row-1', ...populatedInput}]});
    expect(result[fieldId][0][columnKey]).toBeCloseTo(expected, 5);
  });

  test('leaves the calculated cell blank when a required input is missing (does not guess a 0)', () => {
    const result = tpl.calculate({[fieldId]: [{id: 'row-2', ...incompleteInput}]});
    expect(result[fieldId][0][columnKey]).toBe('');
  });

  test('handles an empty or missing table array without throwing', () => {
    expect(tpl.calculate({})[fieldId]).toEqual([]);
    expect(tpl.calculate({[fieldId]: []})[fieldId]).toEqual([]);
  });

  test('does not disturb other columns on the row', () => {
    const result = tpl.calculate({[fieldId]: [{id: 'row-3', owner: 'J. Alvarez', ...populatedInput}]});
    expect(result[fieldId][0].owner).toBe('J. Alvarez');
    expect(result[fieldId][0].id).toBe('row-3');
  });

  test(`the ${columnKey} column is marked calculated:true so DocumentWorkspace renders it read-only`, () => {
    expect(column(docId, fieldId, columnKey).calculated).toBe(true);
  });
});

describe('Variance Report calculate() (two independent calculated tables)', () => {
  const tpl = template('variance-report');

  test('scheduleVarianceRows: varianceDays is the day gap between baselineDate and actualForecastDate (positive = behind)', () => {
    const result = tpl.calculate({scheduleVarianceRows: [{id: 'r1', baselineDate: '2026-05-01', actualForecastDate: '2026-05-15'}]});
    expect(result.scheduleVarianceRows[0].varianceDays).toBe(14);
  });

  test('scheduleVarianceRows: negative varianceDays means ahead of baseline', () => {
    const result = tpl.calculate({scheduleVarianceRows: [{id: 'r1', baselineDate: '2026-05-15', actualForecastDate: '2026-05-01'}]});
    expect(result.scheduleVarianceRows[0].varianceDays).toBe(-14);
  });

  test('scheduleVarianceRows: blank when either date is missing', () => {
    const result = tpl.calculate({scheduleVarianceRows: [{id: 'r1', baselineDate: '2026-05-01', actualForecastDate: ''}]});
    expect(result.scheduleVarianceRows[0].varianceDays).toBe('');
  });

  test('costVarianceRows: varianceAmount = actual - budget, variancePercentage = (varianceAmount / budget) * 100 rounded to 1 decimal', () => {
    const result = tpl.calculate({costVarianceRows: [{id: 'r1', budget: 2000, actual: 2300}]});
    expect(result.costVarianceRows[0].varianceAmount).toBe(300);
    expect(result.costVarianceRows[0].variancePercentage).toBe(15);
  });

  test('costVarianceRows: variancePercentage rounds to 1 decimal', () => {
    const result = tpl.calculate({costVarianceRows: [{id: 'r1', budget: 3000, actual: 3100}]});
    expect(result.costVarianceRows[0].varianceAmount).toBe(100);
    expect(result.costVarianceRows[0].variancePercentage).toBeCloseTo(3.3, 1);
  });

  test('costVarianceRows: blank when budget or actual is missing', () => {
    const result = tpl.calculate({costVarianceRows: [{id: 'r1', budget: '', actual: 100}]});
    expect(result.costVarianceRows[0].varianceAmount).toBe('');
    expect(result.costVarianceRows[0].variancePercentage).toBe('');
  });

  test('both calculated columns are marked calculated:true', () => {
    expect(column('variance-report', 'scheduleVarianceRows', 'varianceDays').calculated).toBe(true);
    expect(column('variance-report', 'costVarianceRows', 'varianceAmount').calculated).toBe(true);
    expect(column('variance-report', 'costVarianceRows', 'variancePercentage').calculated).toBe(true);
  });
});

describe('Cost Baseline calculate() (additive rollup treats a missing operand as 0)', () => {
  const tpl = template('cost-baseline');

  test('total = plannedCost + contingency', () => {
    const result = tpl.calculate({costByPhaseRows: [{id: 'r1', plannedCost: 1000, contingency: 200}]});
    expect(result.costByPhaseRows[0].total).toBe(1200);
  });

  test('a partially filled row still totals using 0 for the missing side (a total is a rollup, not a variance)', () => {
    const result = tpl.calculate({costByPhaseRows: [{id: 'r1', plannedCost: 500}]});
    expect(result.costByPhaseRows[0].total).toBe(500);
  });

  test('a fully empty row blanks the total rather than showing 0', () => {
    const result = tpl.calculate({costByPhaseRows: [{id: 'r1'}]});
    expect(result.costByPhaseRows[0].total).toBe('');
  });

  test('the total column is calculated:true and the table declares a Grand Total sum summary', () => {
    expect(column('cost-baseline', 'costByPhaseRows', 'total').calculated).toBe(true);
    const costByPhase = field('cost-baseline', 'costByPhaseRows');
    expect(costByPhase.summaries).toEqual([{key: 'total', label: 'Grand Total', operation: 'sum'}]);
  });
});

describe('Vendor Evaluation weighted score summary', () => {
  test('the table declares a Total Weighted Score sum summary alongside the per-row calculation', () => {
    const criteriaScoring = field('vendor-evaluation', 'criteriaScoringRows');
    expect(criteriaScoring.summaries).toEqual([{key: 'weightedScore', label: 'Total Weighted Score', operation: 'sum'}]);
  });
});

describe('EVM Dashboard calculated fields render read-only (pre-existing calculate(), now flagged)', () => {
  test.each(['CPI', 'SPI', 'CV', 'SV', 'EAC', 'ETC', 'VAC'])('%s is marked calculated:true', id => {
    expect(field('evm-dashboard', id).calculated).toBe(true);
  });

  test('pv/ev/ac/bac inputs remain plain editable fields (not calculated)', () => {
    ['pv', 'ev', 'ac', 'bac'].forEach(id => {
      expect(field('evm-dashboard', id).calculated).toBeUndefined();
    });
  });

  test('calculate() still produces the expected EVM indices', () => {
    const tpl = template('evm-dashboard');
    const result = tpl.calculate({pv: '100', ev: '90', ac: '80', bac: '500'});
    expect(result.CPI).toBe('1.13');
    expect(result.SPI).toBe('0.90');
  });
});

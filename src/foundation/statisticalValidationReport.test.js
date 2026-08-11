import { VALIDATION_STATUS } from './provenance';
import { buildStatisticalValidationSummary, formatStatisticalValidationSummary } from './statisticalValidationReport';

describe('statistical validation CI summary', () => {
  test('covers every production analytics method plus I-MR and reports honest executable status', () => {
    const summary = buildStatisticalValidationSummary();
    expect(summary.methodCount).toBe(52);
    expect(Object.values(summary.statusCounts).reduce((sum, count) => sum + count, 0)).toBe(summary.methodCount);
    expect(summary.methods.filter(item => item.fixtureCount > 0)).toHaveLength(6);
    expect(summary.statusCounts[VALIDATION_STATUS.VALIDATED]).toBe(0);
    expect(summary.statusCounts[VALIDATION_STATUS.PARTIALLY_VALIDATED]).toBe(6);
    expect(summary.statusCounts[VALIDATION_STATUS.UNVALIDATED]).toBe(46);
    expect(summary.methods.every(item => item.status !== VALIDATION_STATUS.VALIDATED || item.promotionBlockers.length === 0)).toBe(true);
    console.log(`\n${formatStatisticalValidationSummary(summary)}\n`);
  });
});

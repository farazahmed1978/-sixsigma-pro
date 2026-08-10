import { buildAssumptionReport, DIAGNOSTIC_STATUS, equalVarianceDiagnostics, independenceDiagnostic, normalityDiagnostic, outlierDiagnostic } from './assumptionDiagnostics';

describe('deterministic assumption diagnostics', () => {
  test('returns structured, versioned normality output with Q-Q data and contextual limitations', () => {
    const result = normalityDiagnostic([-1.1, -.7, -.2, 0, .1, .5, .9, 1.2, .3, -.4]);
    expect(Object.values(DIAGNOSTIC_STATUS)).toContain(result.status);
    expect(result).toMatchObject({ id: 'normality', method: 'Anderson-Darling', ruleVersion: '1.0.0', sampleSize: 10 });
    expect(result.qqData).toHaveLength(10);
    expect(result.shapiroWilk.status).toBe(DIAGNOSTIC_STATUS.NOT_ASSESSABLE);
  });

  test('uses robust Levene and contextual Bartlett diagnostics', () => {
    const results = equalVarianceDiagnostics([[1, 2, 3, 4], [1, 2, 3, 4.1], [1, 2, 3, 4.2]]);
    expect(results.map(result => result.method)).toEqual(['Brown-Forsythe Levene', 'Bartlett']);
    results.forEach(result => expect(Number.isFinite(result.pValue)).toBe(true));
  });

  test('flags potential outliers without changing or labeling source data as errors', () => {
    const source = [1, 2, 2, 3, 100], before = [...source];
    const result = outlierDiagnostic(source);
    expect(result.status).toBe(DIAGNOSTIC_STATUS.WARNING);
    expect(result.message).toContain('investigation');
    expect(source).toEqual(before);
  });

  test('does not pretend independence is assessable from unordered values', () => expect(independenceDiagnostic().status).toBe(DIAGNOSTIC_STATUS.NOT_ASSESSABLE));
  test('builds a reusable report card model', () => expect(buildAssumptionReport({ values: [1,2,3,4,5,6,7,8] }).diagnostics.map(item => item.id)).toEqual(expect.arrayContaining(['normality','outliers','sample-size','independence'])));
});

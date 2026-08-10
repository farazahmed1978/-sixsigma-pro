import { calculateValue, calculatedColumn, completeCaseRows, conversionFailures, createLineage, filteredRowIndices, inferColumnType, isMissing, joinDatasets, missingCount, pivot, profileColumn, profileDataset, recodeColumn, sortedRowIndices, stackColumns, transformColumn, unpivot } from './dataWorkspace';

const columns = [
  { name: 'Group', type: 'categorical', data: ['A', 'B', 'A', 'B', null] },
  { name: 'Value', type: 'numeric', data: [0, 4, '', 8, 10] },
];

describe('data typing and missingness', () => {
  test('does not treat zero as missing and reports conversion failures without coercion', () => {
    expect(isMissing(0)).toBe(false);
    expect(missingCount(columns[1].data)).toBe(1);
    expect(conversionFailures(['1', 'bad', '', 0], 'numeric')).toEqual([{ rowIndex: 1, value: 'bad' }]);
    expect(inferColumnType(['true', false, 'yes']).type).toBe('boolean');
  });

  test('selects complete cases explicitly and records omitted rows', () => {
    expect(completeCaseRows(columns, ['Group', 'Value'])).toMatchObject({ totalRows: 5, omittedRows: 2, handling: 'complete-case' });
  });
});

describe('non-destructive views and profiling', () => {
  test('combines filters and sorting without changing source columns', () => {
    const before = JSON.stringify(columns);
    const filtered = filteredRowIndices(columns, [{ column: 'Group', operator: 'equals', value: 'B' }, { column: 'Value', operator: 'gte', value: 5 }]);
    expect(filtered).toEqual([3]);
    expect(sortedRowIndices(columns, [{ column: 'Value', direction: 'desc' }])).toEqual([4, 3, 1, 0, 2]);
    expect(JSON.stringify(columns)).toBe(before);
  });

  test('profiles numeric and categorical fields with type-appropriate statistics', () => {
    const numeric = profileColumn(columns[1]), categorical = profileColumn(columns[0]);
    expect(numeric).toMatchObject({ n: 4, missing: 1, mean: 5.5, minimum: 0, maximum: 10, range: 10 });
    expect(categorical.uniqueLevels).toBe(2);
    expect(categorical).not.toHaveProperty('mean');
    expect(profileDataset(columns).variablesWithMissing).toEqual(['Group', 'Value']);
  });
});

describe('safe data mutations and lineage', () => {
  test('evaluates structured calculations without eval and rejects invalid math', () => {
    expect(calculateValue({ op: 'multiply', left: { column: 'a' }, right: { value: 3 } }, { a: 4 })).toBe(12);
    expect(() => calculateValue({ op: 'divide', left: { value: 4 }, right: { value: 0 } }, {})).toThrow('Division by zero');
    const derived = calculatedColumn(columns, 'Double', { op: 'multiply', left: { column: 'Value' }, right: { value: 2 } });
    expect(derived.data).toEqual([0, 8, null, 16, 20]);
  });

  test('transforms and recodes into new columns without mutating source', () => {
    const source = { name: 'X', type: 'numeric', data: [1, 2, 3] };
    expect(transformColumn(source, 'center').data).toEqual([-1, 0, 1]);
    expect(transformColumn(source, 'zscore').data[1]).toBe(0);
    expect(recodeColumn(columns[0], [{ operator: 'equals', value: 'A', replacement: 'Alpha' }]).data[0]).toBe('Alpha');
    expect(source.data).toEqual([1, 2, 3]);
  });

  test('creates explicit source/result version lineage', () => {
    expect(createLineage({ sourceDataset: { id: 'd1', versionId: 'dv1' }, resultDatasetId: 'd2', resultVersionId: 'dv2', operation: 'recode' })).toMatchObject({ sourceDatasetIds: ['d1'], sourceVersionIds: ['dv1'], resultDatasetId: 'd2', resultVersionId: 'dv2', operationClass: 'DATA_MUTATION' });
  });
});

describe('routine reshape and join operations', () => {
  test('stacks, unpivots, pivots, and joins by key', () => {
    const wide = [{ name: 'Id', data: [1, 2] }, { name: 'Before', data: [10, 20] }, { name: 'After', data: [12, 22] }];
    expect(stackColumns(wide, ['Before', 'After'])[0].data).toEqual(['Before', 'Before', 'After', 'After']);
    const long = unpivot(wide, ['Id'], ['Before', 'After']);
    expect(long.find(column => column.name === 'Value').data).toEqual([10, 12, 20, 22]);
    expect(pivot(long, ['Id'], 'Variable', 'Value').find(column => column.name === 'After').data).toEqual([12, 22]);
    const joined = joinDatasets(wide, [{ name: 'Id', data: [1, 2] }, { name: 'Owner', data: ['A', 'B'] }], 'Id');
    expect(joined.find(column => column.name === 'Owner').data).toEqual(['A', 'B']);
  });
});

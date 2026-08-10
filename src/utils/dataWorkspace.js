export const DATA_OPERATION_VERSION = 1;
export const COLUMN_TYPES = Object.freeze(['auto', 'numeric', 'categorical', 'text', 'date', 'datetime', 'boolean']);
export const MISSING_TOKENS = Object.freeze(['', null, undefined]);

export const isMissing = value => value === '' || value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));
export const missingCount = values => values.reduce((count, value) => count + (isMissing(value) ? 1 : 0), 0);
export const missingPercentage = values => values.length ? missingCount(values) / values.length * 100 : 0;
export const variablesWithMissing = columns => columns.filter(column => missingCount(column.data || []) > 0).map(column => column.name);

const bool = value => typeof value === 'boolean' || /^(true|false|yes|no)$/i.test(String(value).trim());
const date = value => value instanceof Date || (!Number.isNaN(Date.parse(String(value))) && /[-/:T]/.test(String(value)));

export function inferColumnType(values = []) {
  const present = values.filter(value => !isMissing(value));
  if (!present.length) return { type: 'unknown', confidence: 0 };
  const ratio = predicate => present.filter(predicate).length / present.length;
  if (ratio(bool) === 1) return { type: 'boolean', confidence: 1 };
  if (ratio(value => typeof value === 'number' ? Number.isFinite(value) : String(value).trim() !== '' && Number.isFinite(Number(value))) >= .9) return { type: 'numeric', confidence: ratio(value => Number.isFinite(Number(value))) };
  if (ratio(date) >= .9) return { type: present.some(value => /T|:\d{2}/.test(String(value))) ? 'datetime' : 'date', confidence: ratio(date) };
  return { type: 'categorical', confidence: 1 };
}

export function conversionFailures(values = [], type) {
  if (!COLUMN_TYPES.includes(type)) throw new Error(`Unsupported column type: ${type}`);
  if (type === 'auto' || type === 'text' || type === 'categorical') return [];
  return values.map((value, rowIndex) => ({ value, rowIndex })).filter(({ value }) => {
    if (isMissing(value)) return false;
    if (type === 'numeric') return !Number.isFinite(Number(value));
    if (type === 'boolean') return !bool(value);
    return !date(value);
  });
}

export function typedColumn(column) {
  const inferred = inferColumnType(column.data || []);
  const declaredType = column.type || 'auto';
  const effectiveType = declaredType === 'auto' ? inferred.type : declaredType;
  const failures = conversionFailures(column.data || [], effectiveType === 'unknown' ? 'auto' : effectiveType);
  return { ...column, declaredType, inferredType: inferred.type, inferenceConfidence: inferred.confidence, effectiveType, conversionFailures: failures };
}

export function completeCaseRows(columns, columnNames = columns.map(column => column.name)) {
  const selected = columnNames.map(name => columns.find(column => column.name === name)).filter(Boolean);
  const rowCount = Math.max(0, ...selected.map(column => column.data.length));
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => Object.fromEntries(selected.map(column => [column.name, column.data[rowIndex]])));
  const completeRows = rows.filter(row => columnNames.every(name => !isMissing(row[name])));
  return { rows: completeRows, totalRows: rowCount, omittedRows: rowCount - completeRows.length, handling: 'complete-case' };
}

function quantile(sorted, probability) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * probability;
  const low = Math.floor(index), high = Math.ceil(index);
  return low === high ? sorted[low] : sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

export function profileColumn(column) {
  const typed = typedColumn(column);
  const values = column.data || [];
  const present = values.filter(value => !isMissing(value));
  const base = { name: column.name, type: typed.effectiveType, n: present.length, missing: missingCount(values), missingPercentage: missingPercentage(values) };
  if (typed.effectiveType === 'numeric' && !typed.conversionFailures.length) {
    const numeric = present.map(Number).sort((a, b) => a - b);
    const mean = numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
    const variance = numeric.length > 1 ? numeric.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (numeric.length - 1) : null;
    const min = numeric[0] ?? null, max = numeric[numeric.length - 1] ?? null;
    const q1 = quantile(numeric, .25), q3 = quantile(numeric, .75);
    return { ...base, mean, median: quantile(numeric, .5), standardDeviation: variance === null ? null : Math.sqrt(variance), variance, minimum: min, q1, q3, maximum: max, range: min === null ? null : max - min, iqr: q1 === null ? null : q3 - q1 };
  }
  const frequencies = present.reduce((result, value) => {
    const key = String(value); result[key] = (result[key] || 0) + 1; return result;
  }, {});
  return { ...base, uniqueLevels: Object.keys(frequencies).length, frequencies: Object.entries(frequencies).map(([value, count]) => ({ value, count, percentage: present.length ? count / present.length * 100 : 0 })).sort((a, b) => b.count - a.count) };
}

export const profileDataset = columns => ({ rowCount: Math.max(0, ...columns.map(column => column.data.length)), columnCount: columns.length, columns: columns.map(profileColumn), variablesWithMissing: variablesWithMissing(columns) });

function compare(value, condition) {
  const target = condition.value;
  switch (condition.operator) {
    case 'missing': return isMissing(value);
    case 'not_missing': return !isMissing(value);
    case 'equals': return String(value) === String(target);
    case 'not_equals': return String(value) !== String(target);
    case 'contains': return String(value ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
    case 'starts_with': return String(value ?? '').toLowerCase().startsWith(String(target ?? '').toLowerCase());
    case 'in': return Array.isArray(target) && target.map(String).includes(String(value));
    case 'gt': return Number.isFinite(Number(value)) && Number(value) > Number(target);
    case 'gte': return Number.isFinite(Number(value)) && Number(value) >= Number(target);
    case 'lt': return Number.isFinite(Number(value)) && Number(value) < Number(target);
    case 'lte': return Number.isFinite(Number(value)) && Number(value) <= Number(target);
    case 'between': return Number.isFinite(Number(value)) && Number(value) >= Number(target?.[0]) && Number(value) <= Number(target?.[1]);
    default: throw new Error(`Unsupported filter operator: ${condition.operator}`);
  }
}

export function filteredRowIndices(columns, conditions = [], mode = 'and') {
  const rowCount = Math.max(0, ...columns.map(column => column.data.length));
  return Array.from({ length: rowCount }, (_, index) => index).filter(rowIndex => {
    const checks = conditions.map(condition => {
      const column = columns.find(item => item.name === condition.column);
      if (!column) throw new Error(`Unknown filter column: ${condition.column}`);
      return compare(column.data[rowIndex], condition);
    });
    return !checks.length || (mode === 'or' ? checks.some(Boolean) : checks.every(Boolean));
  });
}

export function sortedRowIndices(columns, sort = [], indices = null) {
  const rows = indices ? [...indices] : Array.from({ length: Math.max(0, ...columns.map(column => column.data.length)) }, (_, index) => index);
  return rows.sort((left, right) => {
    for (const rule of sort) {
      const column = columns.find(item => item.name === rule.column);
      if (!column) throw new Error(`Unknown sort column: ${rule.column}`);
      const a = column.data[left], b = column.data[right];
      if (isMissing(a) || isMissing(b)) { if (isMissing(a) !== isMissing(b)) return isMissing(a) ? 1 : -1; continue; }
      const numeric = Number.isFinite(Number(a)) && Number.isFinite(Number(b));
      const comparison = numeric ? Number(a) - Number(b) : String(a).localeCompare(String(b));
      if (comparison) return rule.direction === 'desc' ? -comparison : comparison;
    }
    return left - right;
  });
}

function operand(node, row) {
  if (node && Object.prototype.hasOwnProperty.call(node, 'column')) return row[node.column];
  if (node && Object.prototype.hasOwnProperty.call(node, 'value')) return node.value;
  return node;
}

export function calculateValue(expression, row) {
  if (!expression?.op) throw new Error('A structured calculation operation is required.');
  const left = operand(expression.left, row), right = operand(expression.right, row);
  if (isMissing(left) || (expression.right !== undefined && isMissing(right))) return null;
  const number = value => { const parsed = Number(value); if (!Number.isFinite(parsed)) throw new Error(`Non-numeric value: ${value}`); return parsed; };
  switch (expression.op) {
    case 'add': return number(left) + number(right);
    case 'subtract': return number(left) - number(right);
    case 'multiply': return number(left) * number(right);
    case 'divide': if (number(right) === 0) throw new Error('Division by zero.'); return number(left) / number(right);
    case 'power': return number(left) ** number(right);
    case 'log10': if (number(left) <= 0) throw new Error('Log requires positive values.'); return Math.log10(number(left));
    case 'ln': if (number(left) <= 0) throw new Error('Natural log requires positive values.'); return Math.log(number(left));
    case 'sqrt': if (number(left) < 0) throw new Error('Square root requires non-negative values.'); return Math.sqrt(number(left));
    case 'abs': return Math.abs(number(left));
    case 'if': return compare(operand(expression.condition.left, row), { operator: expression.condition.operator, value: operand(expression.condition.right, row) }) ? operand(expression.then, row) : operand(expression.else, row);
    default: throw new Error(`Unsupported calculation: ${expression.op}`);
  }
}

const rowsFrom = columns => Array.from({ length: Math.max(0, ...columns.map(column => column.data.length)) }, (_, index) => Object.fromEntries(columns.map(column => [column.name, column.data[index]])));
const columnsFrom = rows => Object.keys(rows[0] || {}).map(name => ({ name, type: 'auto', data: rows.map(row => row[name] ?? null) }));

export function calculatedColumn(columns, name, expression) {
  if (!name?.trim()) throw new Error('Calculated columns require a name.');
  const rows = rowsFrom(columns);
  return { name: name.trim(), type: 'numeric', data: rows.map(row => calculateValue(expression, row)), derivation: { operation: 'calculated_column', expression, sourceColumns: [...new Set(JSON.stringify(expression).match(/"column":"([^"]+)"/g)?.map(value => value.slice(10, -1)) || [])] } };
}

export function transformColumn(column, operation, parameters = {}) {
  const values = column.data || [];
  const present = values.filter(value => !isMissing(value)).map(Number);
  if (present.some(value => !Number.isFinite(value))) throw new Error(`${column.name} contains non-numeric values.`);
  const mean = present.reduce((sum, value) => sum + value, 0) / present.length;
  const sd = present.length > 1 ? Math.sqrt(present.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (present.length - 1)) : 0;
  const min = Math.min(...present), max = Math.max(...present);
  const transform = value => {
    if (isMissing(value)) return null;
    const x = Number(value);
    if (operation === 'zscore') { if (!sd) throw new Error('Cannot standardize a zero-variance column.'); return (x - mean) / sd; }
    if (operation === 'center') return x - mean;
    if (operation === 'scale') { const factor = Number(parameters.factor); if (!Number.isFinite(factor)) throw new Error('A finite scale factor is required.'); return x * factor; }
    if (operation === 'minmax') { if (max === min) throw new Error('Cannot scale a zero-range column.'); return (x - min) / (max - min); }
    return calculateValue({ op: operation, left: { value: x }, right: parameters.exponent === undefined ? undefined : { value: parameters.exponent } }, {});
  };
  return { ...column, name: parameters.name || `${column.name}_${operation}`, type: 'numeric', data: values.map(transform), derivation: { operation, sourceColumns: [column.name], parameters } };
}

export function recodeColumn(column, rules = [], name = `${column.name}_recoded`) {
  return { ...column, name, data: column.data.map(value => { const rule = rules.find(item => compare(value, item)); return rule ? rule.replacement : value; }), derivation: { operation: 'recode', sourceColumns: [column.name], rules } };
}

export function stackColumns(columns, names, valueName = 'Value', sourceName = 'Source') {
  const selected = names.map(name => columns.find(column => column.name === name));
  if (selected.some(column => !column)) throw new Error('Every stacked column must exist.');
  return columnsFrom(selected.flatMap(column => column.data.map(value => ({ [sourceName]: column.name, [valueName]: value }))));
}

export function unpivot(columns, idColumns, valueColumns, variableName = 'Variable', valueName = 'Value') {
  const rows = rowsFrom(columns);
  return columnsFrom(rows.flatMap(row => valueColumns.map(name => ({ ...Object.fromEntries(idColumns.map(id => [id, row[id]])), [variableName]: name, [valueName]: row[name] }))));
}

export function pivot(columns, indexColumns, namesFrom, valuesFrom, aggregate = 'first') {
  const rows = rowsFrom(columns), groups = new Map();
  rows.forEach(row => {
    const key = JSON.stringify(indexColumns.map(name => row[name]));
    if (!groups.has(key)) groups.set(key, { index: Object.fromEntries(indexColumns.map(name => [name, row[name]])), values: {} });
    const bucket = groups.get(key).values[row[namesFrom]] || [];
    bucket.push(row[valuesFrom]); groups.get(key).values[row[namesFrom]] = bucket;
  });
  const aggregateValues = values => aggregate === 'sum' ? values.reduce((sum, value) => sum + Number(value || 0), 0) : aggregate === 'mean' ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length : values[0];
  return columnsFrom([...groups.values()].map(group => ({ ...group.index, ...Object.fromEntries(Object.entries(group.values).map(([name, values]) => [name, aggregateValues(values)])) })));
}

export function joinDatasets(leftColumns, rightColumns, leftKey, rightKey = leftKey, joinType = 'left') {
  const leftRows = rowsFrom(leftColumns), rightRows = rowsFrom(rightColumns);
  const lookup = rightRows.reduce((map, row) => { const key = String(row[rightKey]); if (!map.has(key)) map.set(key, []); map.get(key).push(row); return map; }, new Map());
  const rightNames = rightColumns.map(column => column.name).filter(name => name !== rightKey);
  const result = leftRows.flatMap(left => {
    const matches = lookup.get(String(left[leftKey])) || [];
    if (!matches.length) return joinType === 'inner' ? [] : [{ ...left, ...Object.fromEntries(rightNames.map(name => [name in left ? `${name}_right` : name, null])) }];
    return matches.map(right => ({ ...left, ...Object.fromEntries(rightNames.map(name => [name in left ? `${name}_right` : name, right[name]])) }));
  });
  return columnsFrom(result);
}

export function createLineage({ sourceDataset, resultDatasetId, resultVersionId, operation, parameters = {}, sourceDatasetIds = [] }) {
  return { schemaVersion: DATA_OPERATION_VERSION, operation, parameters, sourceDatasetIds: sourceDatasetIds.length ? sourceDatasetIds : [sourceDataset.id], sourceVersionIds: [sourceDataset.versionId], resultDatasetId, resultVersionId, occurredAt: new Date().toISOString(), operationClass: 'DATA_MUTATION' };
}

export const VIEW_OPERATIONS = Object.freeze(['filter', 'sort']);
export const DATA_MUTATIONS = Object.freeze(['calculated_column', 'recode', 'zscore', 'center', 'scale', 'minmax', 'log10', 'ln', 'sqrt', 'abs', 'power', 'stack', 'unpivot', 'pivot', 'join']);

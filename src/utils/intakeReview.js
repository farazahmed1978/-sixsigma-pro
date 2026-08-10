import { inferColumnType } from './dataWorkspace';

export const INTAKE_REVIEW_VERSION = 1;
export const STANDARD_MISSING_TOKENS = Object.freeze(['', 'NA', 'N/A', 'NULL', 'null']);
const isBlank = value => value === null || value === undefined || String(value).trim() === '';
const rowBlank = row => !row?.length || row.every(isBlank);
const numericText = value => {
  const text = String(value).trim();
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text);
  const percent = /%$/.test(text);
  const cleaned = text.replace(/[,$%]/g, '').replace(/^\((.*)\)$/, '$1');
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  const parsed = Number(cleaned) * (negative ? -1 : 1) * (percent ? .01 : 1);
  return Number.isFinite(parsed) ? { value: parsed, currency: /[$]/.test(text), percent, formatted: cleaned !== text } : null;
};
const uniqueName = (name, used) => { const base = name || 'Column'; let candidate = base, suffix = 2; while (used.has(candidate)) candidate = `${base}_${suffix++}`; used.add(candidate); return candidate; };

function probableHeader(matrix) {
  const widths = matrix.filter(row => !rowBlank(row)).map(row => row.filter(value => !isBlank(value)).length);
  const target = Math.max(0, ...widths);
  const candidates = matrix.slice(0, 12).map((row, index) => { const filled = row.filter(value => !isBlank(value)); const textRatio = filled.length ? filled.filter(value => numericText(value) === null).length / filled.length : 0; const following = matrix.slice(index + 1, index + 4).filter(next => !rowBlank(next)); const consistent = following.filter(next => next.length >= filled.length).length; return { index, score: filled.length === target ? 5 : filled.length / Math.max(1, target), filled: filled.length, textRatio, consistent, total: (filled.length === target ? 5 : filled.length / Math.max(1, target)) + textRatio * 4 + consistent }; }).filter(item => item.filled >= 2);
  return candidates.sort((a, b) => b.total - a.total || a.index - b.index)[0]?.index ?? 0;
}

export function createIntakeReview({ matrix = [], source = 'paste', parserErrors = [], rawText = '' } = {}) {
  const originalMatrix = Array.isArray(matrix) ? matrix.map(row => Array.isArray(row) ? [...row] : [row]) : [];
  const headerRowIndex = probableHeader(originalMatrix), header = originalMatrix[headerRowIndex] || [], dataRows = originalMatrix.slice(headerRowIndex + 1);
  const width = Math.max(header.length, ...originalMatrix.map(row => row.length), 0), issues = [];
  const leadingRows = originalMatrix.slice(0, headerRowIndex).filter(row => !rowBlank(row));
  if (headerRowIndex > 0) issues.push({ id: 'header-row', severity: 'review', message: `Row ${headerRowIndex + 1} appears likely to contain column headers.`, rows: [headerRowIndex], details: `${leadingRows.length} nonblank row(s) appear before it.` });
  const blankRows = dataRows.map((row, index) => rowBlank(row) ? index + headerRowIndex + 1 : null).filter(index => index !== null);
  if (blankRows.length) issues.push({ id: 'blank-rows', severity: 'info', message: `${blankRows.length} completely blank row(s) detected.`, rows: blankRows });
  const blankColumns = Array.from({ length: width }, (_, index) => originalMatrix.every(row => isBlank(row[index])) ? index : null).filter(index => index !== null);
  if (blankColumns.length) issues.push({ id: 'blank-columns', severity: 'info', message: `${blankColumns.length} completely blank column(s) detected.`, columns: blankColumns });
  const normalizedHeaders = header.map(value => String(value ?? '').trim()), duplicateHeaders = normalizedHeaders.filter((name, index) => name && normalizedHeaders.indexOf(name) !== index), missingHeaders = Array.from({ length: width }, (_, index) => isBlank(header[index]) ? index : null).filter(index => index !== null);
  if (duplicateHeaders.length) issues.push({ id: 'duplicate-headers', severity: 'review', message: `Duplicate column name(s): ${[...new Set(duplicateHeaders)].join(', ')}.` });
  if (missingHeaders.length) issues.push({ id: 'missing-headers', severity: 'review', message: `${missingHeaders.length} column name(s) are missing.`, columns: missingHeaders });
  const expectedWidth = header.length || width, inconsistentRows = dataRows.map((row, index) => rowBlank(row) || row.length === expectedWidth ? null : index + headerRowIndex + 1).filter(index => index !== null);
  if (inconsistentRows.length) issues.push({ id: 'inconsistent-rows', severity: 'review', message: `${inconsistentRows.length} row(s) have an inconsistent field count.`, rows: inconsistentRows });
  if (parserErrors.length) issues.push({ id: 'parser-errors', severity: 'review', message: `${parserErrors.length} parser warning(s) require review.`, details: parserErrors.map(error => error.message).join(' ') });
  const missingTokens = [...new Set(dataRows.flat().filter(value => STANDARD_MISSING_TOKENS.includes(String(value ?? '').trim())).map(value => String(value ?? '').trim() || 'blank'))];
  const columns = Array.from({ length: width }, (_, columnIndex) => {
    const values = dataRows.map(row => row[columnIndex] ?? '');
    const present = values.map((value, index) => ({ value, rowIndex: index + headerRowIndex + 1 })).filter(item => !STANDARD_MISSING_TOKENS.includes(String(item.value ?? '').trim()));
    const numeric = present.filter(item => numericText(item.value)).length, likelyNumeric = present.length >= 2 && numeric / present.length >= .8;
    const incompatible = likelyNumeric ? present.filter(item => !numericText(item.value)).slice(0, 10) : [];
    if (incompatible.length) issues.push({ id: `mixed-${columnIndex}`, severity: 'review', message: `${normalizedHeaders[columnIndex] || `Column ${columnIndex + 1}`} is mostly numeric with ${incompatible.length} incompatible value(s) shown.`, columnIndex, values: incompatible });
    const inferredValues = values.map(value => numericText(value)?.value ?? value);
    return { index: columnIndex, name: normalizedHeaders[columnIndex] || `Column${columnIndex + 1}`, inferredType: inferColumnType(inferredValues).type, numericCount: numeric, nonNumericCount: present.length - numeric, currencyCount: present.filter(item => numericText(item.value)?.currency).length, percentageCount: present.filter(item => numericText(item.value)?.percent).length };
  });
  const meaningfulIssues = issues.filter(issue => issue.severity === 'review');
  return { schemaVersion: INTAKE_REVIEW_VERSION, source, rawText, originalMatrix, headerRowIndex, rowCount: dataRows.filter(row => !rowBlank(row)).length, columnCount: width, issues, issueCount: issues.length, requiresReview: meaningfulIssues.length > 0, missingTokens, columns, parserErrors };
}

export function defaultCleanupOptions(review) { return { useHeaderRow: true, headerRowIndex: review.headerRowIndex, removeBlankRows: true, removeBlankColumns: true, trimWhitespace: true, convertNumericText: false, parsePercentages: false, parseCurrency: false, standardizeMissing: true, missingTokens: STANDARD_MISSING_TOKENS, deduplicateHeaders: false, fillMissingHeaders: true }; }

export function applyIntakeCleanup(review, options = defaultCleanupOptions(review)) {
  const applied = [], source = review.originalMatrix.map(row => [...row]), headerIndex = options.useHeaderRow ? Number(options.headerRowIndex) : -1;
  let header = headerIndex >= 0 ? [...(source[headerIndex] || [])] : [], rows = source.filter((_, index) => index !== headerIndex && (headerIndex < 0 || index > headerIndex));
  if (options.removeBlankRows) { rows = rows.filter(row => !rowBlank(row)); applied.push('Remove completely blank rows'); }
  const width = Math.max(header.length, ...rows.map(row => row.length), 0); while (header.length < width) header.push(''); rows = rows.map(row => Array.from({ length: width }, (_, index) => row[index] ?? ''));
  let keep = Array.from({ length: width }, (_, index) => index); if (options.removeBlankColumns) { keep = keep.filter(index => !isBlank(header[index]) || rows.some(row => !isBlank(row[index]))); applied.push('Remove completely blank columns'); }
  const used = new Set(); let headers = keep.map((index, outputIndex) => { let name = options.trimWhitespace ? String(header[index] ?? '').trim() : String(header[index] ?? ''); if (!name && options.fillMissingHeaders) name = `Column${outputIndex + 1}`; return options.deduplicateHeaders ? uniqueName(name, used) : name || `Column${outputIndex + 1}`; });
  if (options.useHeaderRow) applied.push(`Row ${headerIndex + 1} promoted to header`); if (options.trimWhitespace) applied.push('Trim leading/trailing whitespace'); if (options.deduplicateHeaders) applied.push('Deduplicate column names'); if (options.fillMissingHeaders) applied.push('Fill missing column names');
  const tokenSet = new Set((options.missingTokens || []).map(String));
  const cleanedRows = rows.map(row => keep.map(index => { const original = row[index]; let value = options.trimWhitespace && typeof original === 'string' ? original.trim() : original; if (options.standardizeMissing && tokenSet.has(String(value))) return null; const parsed = numericText(value); if (parsed && ((parsed.currency && options.parseCurrency) || (parsed.percent && options.parsePercentages) || (!parsed.currency && !parsed.percent && options.convertNumericText))) return parsed.value; return value; }));
  if (options.standardizeMissing) applied.push(`Standardize missing tokens: ${(options.missingTokens || []).map(token => token === '' ? 'blank' : token).join(', ')}`); if (options.convertNumericText) applied.push('Convert numeric-looking text'); if (options.parseCurrency) applied.push('Parse currency'); if (options.parsePercentages) applied.push('Parse percentages');
  const columns = headers.map((name, index) => ({ name, type: 'auto', data: cleanedRows.map(row => row[index]) }));
  return { columns, previewRows: cleanedRows.slice(0, 12), operations: applied, lineage: { schemaVersion: INTAKE_REVIEW_VERSION, operation: 'data_intake_cleanup', operationClass: 'DATA_MUTATION', source: review.source, parameters: options, operations: applied, occurredAt: new Date().toISOString() }, sourceRepresentation: { source: review.source, rawText: review.rawText, matrix: review.originalMatrix } };
}

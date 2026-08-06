import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

const WorksheetContext = createContext();
const STORAGE_KEY = 'sixsigmapro_datasets_v1';
const ACTIVE_KEY = 'sixsigmapro_active_dataset';
const SCHEMA_VERSION = 1;

const makeId = () => `dataset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const rowCountFor = columns => Math.max(0, ...columns.map(column => column.data?.length || 0));
const historyItem = action => ({ id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, action, at: now() });

function normalizeDataset(dataset) {
  const columns = Array.isArray(dataset.columns) ? dataset.columns.map((column, index) => ({
    name: column.name || `Column${index + 1}`,
    data: Array.isArray(column.data) ? column.data : [],
    type: column.type || 'auto',
  })) : [];
  return {
    schemaVersion: SCHEMA_VERSION,
    id: dataset.id || makeId(),
    projectId: dataset.projectId || '',
    name: dataset.name || 'Worksheet',
    description: dataset.description || '',
    source: dataset.source || 'worksheet',
    analysisIds: Array.isArray(dataset.analysisIds) ? dataset.analysisIds : [],
    columns,
    createdAt: dataset.createdAt || now(),
    updatedAt: dataset.updatedAt || now(),
    history: Array.isArray(dataset.history) ? dataset.history.slice(0, 50) : [],
  };
}

function loadRegistry() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(normalizeDataset) : [];
  } catch {
    return [];
  }
}

export function WorksheetProvider({ children }) {
  const [datasets, setDatasets] = useState(loadRegistry);
  const [activeDatasetId, setActiveDatasetId] = useState(() => localStorage.getItem(ACTIVE_KEY) || '');

  const activeDataset = useMemo(() => datasets.find(dataset => dataset.id === activeDatasetId) || null, [datasets, activeDatasetId]);
  const columns = activeDataset?.columns || [];
  const fileName = activeDataset?.name || '';
  const rowCount = rowCountFor(columns);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets)); } catch (error) { console.warn('Datasets could not be saved:', error); }
  }, [datasets]);
  useEffect(() => {
    if (activeDatasetId) localStorage.setItem(ACTIVE_KEY, activeDatasetId);
    else localStorage.removeItem(ACTIVE_KEY);
  }, [activeDatasetId]);
  useEffect(() => {
    if (activeDatasetId && !datasets.some(dataset => dataset.id === activeDatasetId)) setActiveDatasetId(datasets[0]?.id || '');
  }, [activeDatasetId, datasets]);

  const updateActive = useCallback((updater, action) => {
    setDatasets(previous => previous.map(dataset => {
      if (dataset.id !== activeDatasetId) return dataset;
      const updated = updater(dataset);
      return { ...updated, schemaVersion: SCHEMA_VERSION, updatedAt: now(), history: action ? [historyItem(action), ...(updated.history || dataset.history || [])].slice(0, 50) : updated.history || dataset.history || [] };
    }));
  }, [activeDatasetId]);

  const createDataset = useCallback(({ name = 'New Worksheet', description = '', projectId = '', columns: initialColumns = [] } = {}) => {
    const dataset = normalizeDataset({ id: makeId(), name, description, projectId, columns: initialColumns, history: [historyItem('Dataset created')] });
    setDatasets(previous => [...previous, dataset]);
    setActiveDatasetId(dataset.id);
    return dataset.id;
  }, []);

  const loadData = useCallback((parsedColumns, name, options = {}) => {
    const dataset = normalizeDataset({ id: makeId(), name: name || 'Worksheet', description: options.description || '', projectId: options.projectId || '', source: options.source || 'import', columns: parsedColumns, history: [historyItem('Data imported')] });
    setDatasets(previous => [...previous, dataset]);
    setActiveDatasetId(dataset.id);
    return dataset.id;
  }, []);

  const clearData = useCallback(() => updateActive(dataset => ({ ...dataset, columns: [] }), 'Dataset cleared'), [updateActive]);
  const addColumn = useCallback((name, data) => updateActive(dataset => {
    const exists = dataset.columns.findIndex(column => column.name === name);
    if (exists >= 0) { const next = [...dataset.columns]; next[exists] = { ...next[exists], name, data }; return { ...dataset, columns: next }; }
    return { ...dataset, columns: [...dataset.columns, { name, data, type: 'auto' }] };
  }, `Column ${name} added`), [updateActive]);
  const updateCell = useCallback((colIndex, rowIndex, value) => updateActive(dataset => ({ ...dataset, columns: dataset.columns.map((column, index) => {
    if (index !== colIndex) return column;
    const data = [...column.data]; while (data.length <= rowIndex) data.push(''); data[rowIndex] = value; return { ...column, data };
  }) })), [updateActive]);
  const renameColumn = useCallback((colIndex, newName) => updateActive(dataset => ({ ...dataset, columns: dataset.columns.map((column, index) => index === colIndex ? { ...column, name: newName } : column) }), 'Column renamed'), [updateActive]);
  const deleteColumn = useCallback(colIndex => updateActive(dataset => ({ ...dataset, columns: dataset.columns.filter((_, index) => index !== colIndex) }), 'Column deleted'), [updateActive]);
  const addBlankColumn = useCallback(() => updateActive(dataset => ({ ...dataset, columns: [...dataset.columns, { name: `Column${dataset.columns.length + 1}`, data: new Array(rowCountFor(dataset.columns)).fill(''), type: 'auto' }] }), 'Blank column added'), [updateActive]);
  const addBlankRow = useCallback(() => updateActive(dataset => ({ ...dataset, columns: dataset.columns.map(column => ({ ...column, data: [...column.data, ''] })) }), 'Row added'), [updateActive]);
  const deleteRow = useCallback(rowIndex => updateActive(dataset => ({ ...dataset, columns: dataset.columns.map(column => ({ ...column, data: column.data.filter((_, index) => index !== rowIndex) })) }), 'Row deleted'), [updateActive]);
  const startBlankSheet = useCallback((numCols = 5, numRows = 15, options = {}) => createDataset({ name: options.name || 'New Worksheet', projectId: options.projectId || '', columns: Array.from({ length: numCols }, (_, index) => ({ name: `Column${index + 1}`, data: new Array(numRows).fill(''), type: 'auto' })) }), [createDataset]);

  const renameDataset = useCallback((id, name) => setDatasets(previous => previous.map(dataset => dataset.id === id ? { ...dataset, name: name.trim() || dataset.name, updatedAt: now(), history: [historyItem('Dataset renamed'), ...dataset.history].slice(0, 50) } : dataset)), []);
  const updateDatasetMetadata = useCallback((id, updates) => setDatasets(previous => previous.map(dataset => dataset.id === id ? { ...dataset, ...updates, id: dataset.id, columns: dataset.columns, updatedAt: now(), history: [historyItem('Dataset details updated'), ...dataset.history].slice(0, 50) } : dataset)), []);
  const duplicateDataset = useCallback(id => {
    const source = datasets.find(dataset => dataset.id === id); if (!source) return null;
    const copy = normalizeDataset({ ...source, id: makeId(), name: `${source.name} Copy`, columns: source.columns.map(column => ({ ...column, data: [...column.data] })), createdAt: now(), updatedAt: now(), history: [historyItem('Dataset duplicated')] });
    setDatasets(previous => [...previous, copy]); setActiveDatasetId(copy.id); return copy.id;
  }, [datasets]);
  const deleteDataset = useCallback(id => { setDatasets(previous => previous.filter(dataset => dataset.id !== id)); setActiveDatasetId(current => current === id ? '' : current); }, []);
  const assignDatasetProject = useCallback((id, projectId) => setDatasets(previous => previous.map(dataset => dataset.id === id ? { ...dataset, projectId, updatedAt: now(), history: [historyItem('Project assignment changed'), ...dataset.history].slice(0, 50) } : dataset)), []);
  const changeColumnType = useCallback((colIndex, type) => updateActive(dataset => ({ ...dataset, columns: dataset.columns.map((column, index) => index === colIndex ? { ...column, type } : column) }), `Column type changed to ${type}`), [updateActive]);
  const sortColumn = useCallback((colIndex, direction) => updateActive(dataset => {
    const rows = Array.from({ length: rowCountFor(dataset.columns) }, (_, rowIndex) => dataset.columns.map(column => column.data[rowIndex] ?? ''));
    rows.sort((a, b) => { const av = a[colIndex], bv = b[colIndex]; const an = Number(av), bn = Number(bv); const result = av !== '' && bv !== '' && !Number.isNaN(an) && !Number.isNaN(bn) ? an - bn : String(av).localeCompare(String(bv)); return direction === 'desc' ? -result : result; });
    return { ...dataset, columns: dataset.columns.map((column, index) => ({ ...column, data: rows.map(row => row[index]) })) };
  }, `Rows sorted ${direction === 'desc' ? 'descending' : 'ascending'}`), [updateActive]);

  const getNumericColumns = () => columns.filter(column => column.type === 'numeric' || (column.type === 'auto' && column.data.some(value => value !== '' && !Number.isNaN(parseFloat(value)))));
  const getCategoricalColumns = () => columns.filter(column => column.type === 'categorical' || (column.type === 'auto' && !column.data.every(value => value === '' || !Number.isNaN(parseFloat(value)))));
  const getColumnData = name => { const column = columns.find(item => item.name === name); return column ? column.data.map(value => parseFloat(value)).filter(value => !Number.isNaN(value)) : []; };
  const getRawColumnData = name => columns.find(column => column.name === name)?.data || [];

  return <WorksheetContext.Provider value={{
    columns, fileName, rowCount, hasData: columns.length > 0, datasets, activeDataset, activeDatasetId,
    loadData, clearData, addColumn, updateCell, renameColumn, deleteColumn, addBlankColumn, addBlankRow, deleteRow, startBlankSheet,
    createDataset, switchDataset: setActiveDatasetId, renameDataset, updateDatasetMetadata, duplicateDataset, deleteDataset, assignDatasetProject, changeColumnType, sortColumn,
    getNumericColumns, getCategoricalColumns, getColumnData, getRawColumnData,
  }}>{children}</WorksheetContext.Provider>;
}

export const useWorksheet = () => useContext(WorksheetContext);

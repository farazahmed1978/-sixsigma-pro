import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import {useAuth} from './AuthContext';
import {datasetRepository} from '../repositories/datasetRepository';
import {HYDRATION,nextGeneration,isCurrentGeneration} from '../services/persistenceSafety';
import { calculatedColumn, createLineage, joinDatasets, pivot, recodeColumn, sortedRowIndices, stackColumns, transformColumn, typedColumn, unpivot } from '../utils/dataWorkspace';

const WorksheetContext = createContext();
const STORAGE_KEY = 'sixsigmapro_datasets_v1';
const ACTIVE_KEY = 'sixsigmapro_active_dataset';
const SCHEMA_VERSION = 1;

const makeId = () => crypto.randomUUID();
const makeVersionId = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const rowCountFor = columns => Math.max(0, ...columns.map(column => column.data?.length || 0));
const historyItem = action => ({ id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, action, at: now() });

function normalizeDataset(dataset) {
  const columns = Array.isArray(dataset.columns) ? dataset.columns.map((column, index) => typedColumn({
    name: column.name || `Column${index + 1}`,
    data: Array.isArray(column.data) ? column.data : [],
    type: column.type || 'auto',
    derivation: column.derivation || null,
  })) : [];
  return {
    schemaVersion: SCHEMA_VERSION,
    id: dataset.id || makeId(),
    projectId: dataset.projectId || '',
    organizationId: dataset.organizationId || '',
    createdBy: dataset.createdBy || '',
    name: dataset.name || 'Worksheet',
    description: dataset.description || '',
    source: dataset.source || 'worksheet',
    sourceNote: dataset.sourceNote || '',
    sourceRepresentation: dataset.sourceRepresentation || null,
    intakeReview: dataset.intakeReview || null,
    status: dataset.status || (dataset.archivedAt ? 'archived' : 'active'),
    version: Number(dataset.version) || 1,
    versionId: dataset.versionId || dataset.datasetVersionId || `${dataset.id || 'legacy-dataset'}-version-${Number(dataset.version) || 1}`,
    rowCount: rowCountFor(columns),
    columnCount: columns.length,
    analysisIds: Array.isArray(dataset.analysisIds) ? dataset.analysisIds : [],
    columns,
    createdAt: dataset.createdAt || now(),
    updatedAt: dataset.updatedAt || now(),
    archivedAt: dataset.archivedAt || '',
    history: Array.isArray(dataset.history) ? dataset.history.slice(0, 50) : [],
    lineage: Array.isArray(dataset.lineage) ? dataset.lineage : [],
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
  const {user,profile,configured}=useAuth();
  const [datasets, setDatasets] = useState(() => configured ? [] : loadRegistry());
  const [hydrationStatus,setHydrationStatus]=useState(configured?HYDRATION.HYDRATING:HYDRATION.READY),[persistenceError,setPersistenceError]=useState('');
  const generation=React.useRef(0);
  const [activeDatasetId, setActiveDatasetId] = useState(() => configured ? '' : localStorage.getItem(ACTIVE_KEY) || '');
  const [viewSort, setViewSort] = useState([]);

  const activeDataset = useMemo(() => datasets.find(dataset => dataset.id === activeDatasetId) || null, [datasets, activeDatasetId]);
  const columns = useMemo(() => activeDataset?.columns || [], [activeDataset]);
  const fileName = activeDataset?.name || '';
  const rowCount = rowCountFor(columns);
  const viewRowIndices = useMemo(() => sortedRowIndices(columns, viewSort), [columns, viewSort]);

  useEffect(() => {
    let active=true;
    if(!configured||!user||!profile?.default_organization_id)return()=>{active=false};
    const request=nextGeneration(generation.current);generation.current=request;setDatasets([]);setActiveDatasetId('');setHydrationStatus(HYDRATION.HYDRATING);setPersistenceError('');
    datasetRepository.listOrganization(profile.default_organization_id).then(rows=>{if(active&&isCurrentGeneration(request,generation.current)){setDatasets(rows.map(row=>normalizeDataset({...row.content,id:row.id,projectId:row.project_id,organizationId:row.organization_id,createdBy:row.created_by,name:row.title,description:row.description,source:row.source,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at})));setHydrationStatus(HYDRATION.READY)} }).catch(error=>{if(active&&isCurrentGeneration(request,generation.current)){setHydrationStatus(HYDRATION.ERROR);setPersistenceError(error.message||'Datasets could not be loaded from Aureqin.')}});
    return()=>{active=false};
  },[configured,profile?.default_organization_id,user]);
  useEffect(() => {
    if(!configured||!user||!profile?.default_organization_id)return undefined;
    const persisted=datasets.filter(dataset=>dataset.projectId);
    const timer=window.setTimeout(()=>Promise.all(persisted.map(dataset=>datasetRepository.saveMetadata({id:dataset.id,project_id:dataset.projectId,organization_id:dataset.organizationId||profile.default_organization_id,created_by:dataset.createdBy||user.id,status:dataset.status||'active',methodology:'lean-six-sigma',lifecycle_phase:'Measure',dmaic_phase:'Measure',title:dataset.name,description:dataset.description||'',source:dataset.source||'',version:dataset.version||1,row_count:dataset.rowCount||0,column_count:dataset.columnCount||0,content:dataset,updated_at:new Date().toISOString()}))).catch(error=>console.error('Datasets could not be saved to Aureqin:',error)),250);
    return()=>window.clearTimeout(timer);
  },[configured,datasets,profile?.default_organization_id,user]);
  useEffect(()=>{const cleanup=event=>{generation.current=nextGeneration(generation.current);const projectId=event.detail?.projectId;setDatasets(previous=>previous.filter(dataset=>dataset.projectId!==projectId));setActiveDatasetId(current=>datasets.some(dataset=>dataset.id===current&&dataset.projectId===projectId)?'':current)};window.addEventListener('aureqin:project-deleted',cleanup);return()=>window.removeEventListener('aureqin:project-deleted',cleanup)},[datasets]);
  useEffect(() => {
    if(configured)return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets)); } catch (error) { console.warn('Datasets could not be saved:', error); }
  }, [configured,datasets]);
  useEffect(() => {
    if(configured)return;
    if (activeDatasetId) localStorage.setItem(ACTIVE_KEY, activeDatasetId); else localStorage.removeItem(ACTIVE_KEY);
  }, [activeDatasetId,configured]);
  useEffect(() => {
    if (activeDatasetId && !datasets.some(dataset => dataset.id === activeDatasetId)) setActiveDatasetId(datasets[0]?.id || '');
  }, [activeDatasetId, datasets]);

  const updateActive = useCallback((updater, action) => {
    setDatasets(previous => previous.map(dataset => {
      if (dataset.id !== activeDatasetId) return dataset;
      const updated = updater(dataset);
      return { ...updated, schemaVersion: SCHEMA_VERSION, version:(dataset.version||1)+1, versionId:makeVersionId(), rowCount:rowCountFor(updated.columns||[]), columnCount:(updated.columns||[]).length, updatedAt: now(), history: action ? [historyItem(action), ...(updated.history || dataset.history || [])].slice(0, 50) : updated.history || dataset.history || [] };
    }));
  }, [activeDatasetId]);

  const createDataset = useCallback(({ name = 'New Worksheet', description = '', projectId = '', columns: initialColumns = [] } = {}) => {
    const dataset = normalizeDataset({ id: makeId(), name, description, projectId, organizationId:profile?.default_organization_id||'',createdBy:user?.id||'', columns: initialColumns, history: [historyItem('Dataset created')] });
    setDatasets(previous => [...previous, dataset]);
    setActiveDatasetId(dataset.id);
    return dataset.id;
  }, [profile,user]);

  const createDerivedDataset = useCallback(({ name, derivedColumns, operation, parameters = {}, sourceDatasetIds = [] }) => {
    if (!activeDataset) throw new Error('Select a source dataset first.');
    const id = makeId(), versionId = makeVersionId();
    const lineage = createLineage({ sourceDataset: activeDataset, resultDatasetId: id, resultVersionId: versionId, operation, parameters, sourceDatasetIds });
    const dataset = normalizeDataset({ id, versionId, name: name || `${activeDataset.name} — ${operation}`, description: `Derived from ${activeDataset.name}`, projectId: activeDataset.projectId, organizationId: activeDataset.organizationId, createdBy: user?.id || activeDataset.createdBy, source: 'derived', columns: derivedColumns, lineage: [...(activeDataset.lineage || []), lineage], history: [historyItem(`Derived dataset created: ${operation}`)] });
    setDatasets(previous => [...previous, dataset]); setActiveDatasetId(id); return id;
  }, [activeDataset, user]);

  const loadData = useCallback((parsedColumns, name, options = {}) => {
    const dataset = normalizeDataset({ id: makeId(), name: name || 'Worksheet', description: options.description || '', projectId: options.projectId || '', organizationId:options.organizationId||profile?.default_organization_id||'',createdBy:user?.id||'', source: options.source || 'import',sourceNote:options.sourceNote||'', sourceRepresentation:options.sourceRepresentation||null, intakeReview:options.intakeReview||null, lineage:options.lineage?[options.lineage]:[], columns: parsedColumns, history: [historyItem(options.lineage?.operations?.length?`Data imported with review: ${options.lineage.operations.join('; ')}`:'Data imported')] });
    setDatasets(previous => [...previous, dataset]);
    setActiveDatasetId(dataset.id);
    return dataset.id;
  }, [profile,user]);

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
    const copy = normalizeDataset({ ...source, id: makeId(), version: 1, versionId: makeVersionId(), name: `${source.name} Copy`, columns: source.columns.map(column => ({ ...column, data: [...column.data] })), createdAt: now(), updatedAt: now(), history: [historyItem('Dataset duplicated')] });
    setDatasets(previous => [...previous, copy]); setActiveDatasetId(copy.id); return copy.id;
  }, [datasets]);
  const deleteDataset = useCallback(async id => { if(configured&&datasets.find(item=>item.id===id)?.projectId)await datasetRepository.remove(id);setDatasets(previous => previous.filter(dataset => dataset.id !== id)); setActiveDatasetId(current => current === id ? '' : current); }, [configured,datasets]);
  const archiveDataset = useCallback(id => setDatasets(previous => previous.map(dataset => dataset.id === id ? { ...dataset, archivedAt: dataset.archivedAt ? '' : now(),status:dataset.archivedAt?'active':'archived', updatedAt: now(), history: [historyItem(dataset.archivedAt ? 'Dataset restored' : 'Dataset archived'), ...dataset.history].slice(0, 50) } : dataset)), []);
  const assignDatasetProject = useCallback((id, projectId) => setDatasets(previous => previous.map(dataset => dataset.id === id ? { ...dataset, projectId, updatedAt: now(), history: [historyItem('Project assignment changed'), ...dataset.history].slice(0, 50) } : dataset)), []);
  const changeColumnType = useCallback((colIndex, type) => updateActive(dataset => ({ ...dataset, columns: dataset.columns.map((column, index) => index === colIndex ? typedColumn({ ...column, type }) : column) }), `Column type changed to ${type}`), [updateActive]);
  const sortColumn = useCallback((colIndex, direction) => { const column = columns[colIndex]; if (column) setViewSort([{ column: column.name, direction }]); }, [columns]);
  const clearViewSort = useCallback(() => setViewSort([]), []);
  const switchDataset = useCallback(id => { setViewSort([]); setActiveDatasetId(id); }, []);
  const deriveCalculatedColumn = useCallback((name, expression) => createDerivedDataset({ name: `${activeDataset.name} — calculated`, derivedColumns: [...columns, calculatedColumn(columns, name, expression)], operation: 'calculated_column', parameters: { name, expression } }), [activeDataset, columns, createDerivedDataset]);
  const deriveTransformedColumn = useCallback((columnName, operation, parameters = {}) => { const column = columns.find(item => item.name === columnName); if (!column) throw new Error('Column not found.'); return createDerivedDataset({ name: `${activeDataset.name} — ${operation}`, derivedColumns: [...columns, transformColumn(column, operation, parameters)], operation, parameters: { columnName, ...parameters } }); }, [activeDataset, columns, createDerivedDataset]);
  const deriveRecodedColumn = useCallback((columnName, rules, name) => { const column = columns.find(item => item.name === columnName); if (!column) throw new Error('Column not found.'); return createDerivedDataset({ name: `${activeDataset.name} — recoded`, derivedColumns: [...columns, recodeColumn(column, rules, name)], operation: 'recode', parameters: { columnName, rules, name } }); }, [activeDataset, columns, createDerivedDataset]);
  const deriveJoinedDataset = useCallback((rightDatasetId, leftKey, rightKey, joinType = 'left') => { const right = datasets.find(item => item.id === rightDatasetId); if (!right) throw new Error('Join dataset not found.'); return createDerivedDataset({ name: `${activeDataset.name} + ${right.name}`, derivedColumns: joinDatasets(columns, right.columns, leftKey, rightKey, joinType), operation: 'join', parameters: { leftKey, rightKey, joinType }, sourceDatasetIds: [activeDataset.id, right.id] }); }, [activeDataset, columns, createDerivedDataset, datasets]);
  const deriveStackedDataset = useCallback((columnNames, valueName='Value', sourceName='Source') => createDerivedDataset({ name: `${activeDataset.name} — stacked`, derivedColumns: stackColumns(columns,columnNames,valueName,sourceName), operation:'stack', parameters:{columnNames,valueName,sourceName} }),[activeDataset,columns,createDerivedDataset]);
  const deriveUnpivotedDataset = useCallback((idColumns,valueColumns,variableName='Variable',valueName='Value') => createDerivedDataset({ name:`${activeDataset.name} — unpivoted`,derivedColumns:unpivot(columns,idColumns,valueColumns,variableName,valueName),operation:'unpivot',parameters:{idColumns,valueColumns,variableName,valueName} }),[activeDataset,columns,createDerivedDataset]);
  const derivePivotedDataset = useCallback((indexColumns,namesFrom,valuesFrom,aggregate='first') => createDerivedDataset({ name:`${activeDataset.name} — pivoted`,derivedColumns:pivot(columns,indexColumns,namesFrom,valuesFrom,aggregate),operation:'pivot',parameters:{indexColumns,namesFrom,valuesFrom,aggregate} }),[activeDataset,columns,createDerivedDataset]);

  const getNumericColumns = () => columns.filter(column => column.type === 'numeric' || (column.type === 'auto' && column.data.some(value => value !== '' && !Number.isNaN(parseFloat(value)))));
  const getCategoricalColumns = () => columns.filter(column => column.type === 'categorical' || (column.type === 'auto' && !column.data.every(value => value === '' || !Number.isNaN(parseFloat(value)))));
  const getColumnData = name => { const column = columns.find(item => item.name === name); return column ? column.data.map(value => parseFloat(value)).filter(value => !Number.isNaN(value)) : []; };
  const getRawColumnData = name => columns.find(column => column.name === name)?.data || [];

  return <WorksheetContext.Provider value={{
    columns, fileName, rowCount, hasData: columns.length > 0, datasets, activeDataset, activeDatasetId, viewRowIndices, viewSort,
    loadData, clearData, addColumn, updateCell, renameColumn, deleteColumn, addBlankColumn, addBlankRow, deleteRow, startBlankSheet,
    createDataset, createDerivedDataset, switchDataset, renameDataset, updateDatasetMetadata, duplicateDataset, archiveDataset, deleteDataset, assignDatasetProject, changeColumnType, sortColumn, clearViewSort,
    deriveCalculatedColumn, deriveTransformedColumn, deriveRecodedColumn, deriveJoinedDataset, deriveStackedDataset, deriveUnpivotedDataset, derivePivotedDataset,
    getNumericColumns, getCategoricalColumns, getColumnData, getRawColumnData,
    hydrationStatus,persistenceError,
  }}>{children}</WorksheetContext.Provider>;
}

export const useWorksheet = () => useContext(WorksheetContext);

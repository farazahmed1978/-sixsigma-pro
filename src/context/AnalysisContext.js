import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useWorksheet } from './WorksheetContext';
import { useProjects } from './ProjectsContext';

const AnalysisContext = createContext();
export const ANALYSIS_CONTEXT_SCHEMA_VERSION = 1;

function detectedType(column) {
  if (column.type && column.type !== 'auto') return column.type;
  const values = column.data.filter(value => value !== '' && value !== null && value !== undefined);
  if (!values.length) return 'unknown';
  if (values.filter(value => !Number.isNaN(Number(value))).length / values.length >= .8) return 'numeric';
  if (values.filter(value => /[-/]/.test(String(value)) && !Number.isNaN(Date.parse(value))).length / values.length >= .8) return 'date';
  return 'categorical';
}

export function AnalysisProvider({ children }) {
  const { activeDataset, datasets, columns, rowCount } = useWorksheet();
  const { projects } = useProjects();
  const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);
  const [analysisResults, setAnalysisResults] = useState([]);
  const project = projects.find(item => item.id === activeDataset?.projectId) || null;

  const registerAnalysisResult = useCallback(result => {
    const record = { id: result.id || `analysis-${Date.now()}`, projectId: result.projectId || activeDataset?.projectId || '', datasetIds: result.datasetIds || (activeDataset ? [activeDataset.id] : []), createdAt: result.createdAt || new Date().toISOString(), ...result };
    setAnalysisResults(previous => [record, ...previous]);
    return record.id;
  }, [activeDataset]);

  const value = useMemo(() => ({
    schemaVersion: ANALYSIS_CONTEXT_SCHEMA_VERSION,
    projectId: project?.id || '',
    project,
    datasetId: activeDataset?.id || '',
    datasetName: activeDataset?.name || '',
    dataset: activeDataset,
    columnMetadata: columns.map((column, index) => ({ index, name: column.name, declaredType: column.type || 'auto', detectedType: detectedType(column), rowCount: column.data.length, missingCount: column.data.filter(value => value === '' || value === null || value === undefined).length })),
    worksheetData: columns,
    rowCount,
    availableDatasets: datasets.filter(dataset => dataset.projectId === activeDataset?.projectId).map(dataset => ({ id: dataset.id, projectId: dataset.projectId, name: dataset.name, description: dataset.description, createdAt: dataset.createdAt, updatedAt: dataset.updatedAt, rowCount: Math.max(0, ...dataset.columns.map(column => column.data.length)), columnCount: dataset.columns.length })),
    selectedDatasetIds: selectedDatasetIds.length ? selectedDatasetIds : activeDataset ? [activeDataset.id] : [],
    setSelectedDatasetIds,
    analysisResults,
    registerAnalysisResult,
  }), [activeDataset, analysisResults, columns, datasets, project, rowCount, selectedDatasetIds, registerAnalysisResult]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export const useAnalysis = () => useContext(AnalysisContext);

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useWorksheet } from './WorksheetContext';
import { useProjects } from './ProjectsContext';
import {useAuth} from './AuthContext';
import { createAnalysisMetadata } from '../foundation/provenance';
import {analysisRepository} from '../repositories/analysisRepository';
import {HYDRATION,nextGeneration,isCurrentGeneration} from '../services/persistenceSafety';

const AnalysisContext = createContext();
export const ANALYSIS_CONTEXT_SCHEMA_VERSION = 1;
const STORAGE_KEY = 'sixsigmapro_analyses_v1';
const loadAnalyses = () => { try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };

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
  const { projects, recordActivity } = useProjects();
  const {user,profile,configured}=useAuth();
  const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(() => configured ? [] : loadAnalyses());
  const [hydrationStatus,setHydrationStatus]=useState(configured?HYDRATION.HYDRATING:HYDRATION.READY),[persistenceError,setPersistenceError]=useState('');const generation=useRef(0);
  const project = projects.find(item => item.id === activeDataset?.projectId) || null;

  useEffect(()=>{let active=true;if(!configured||!user||!profile?.default_organization_id)return()=>{active=false};const request=nextGeneration(generation.current);generation.current=request;setAnalysisResults([]);setHydrationStatus(HYDRATION.HYDRATING);setPersistenceError('');analysisRepository.listOrganization(profile.default_organization_id).then(rows=>{if(active&&isCurrentGeneration(request,generation.current)){setAnalysisResults(rows.map(row=>({...row.content,id:row.id,projectId:row.project_id,organizationId:row.organization_id,createdBy:row.created_by,title:row.title,status:row.status,phase:row.dmaic_phase,createdAt:row.created_at,updatedAt:row.updated_at})));setHydrationStatus(HYDRATION.READY)} }).catch(error=>{if(active&&isCurrentGeneration(request,generation.current)){setHydrationStatus(HYDRATION.ERROR);setPersistenceError(error.message||'Analyses could not be loaded from Aureqin.')}});return()=>{active=false}},[configured,profile?.default_organization_id,user]);
  useEffect(() => {if(configured){if(!user||!profile?.default_organization_id)return;const timer=window.setTimeout(()=>Promise.all(analysisResults.filter(item=>item.projectId).map(item=>analysisRepository.save({id:item.id,project_id:item.projectId,organization_id:item.organizationId||profile.default_organization_id,created_by:item.createdBy||user.id,status:item.status||'complete',methodology:item.methodology||'lean-six-sigma',lifecycle_phase:item.phase||'Analyze',dmaic_phase:item.phase||'Analyze',title:item.title||item.name||'Analysis',method:item.method||item.toolType||'',method_version:item.methodVersion||'1',parameters:item.inputConfiguration||{},result_schema_version:item.resultSchemaVersion||'1',validation_status:item.validationStatus||'UNVALIDATED',content:item,updated_at:new Date().toISOString()}))).catch(error=>console.error('Analyses could not be saved to Aureqin:',error)),250);return()=>window.clearTimeout(timer)}try { localStorage.setItem(STORAGE_KEY, JSON.stringify(analysisResults)); } catch (error) { console.warn('Analyses could not be saved:', error); } }, [analysisResults,configured,profile?.default_organization_id,user]);
  useEffect(()=>{const cleanup=event=>{generation.current=nextGeneration(generation.current);setAnalysisResults(previous=>previous.filter(item=>item.projectId!==event.detail?.projectId))};window.addEventListener('aureqin:project-deleted',cleanup);return()=>window.removeEventListener('aureqin:project-deleted',cleanup)},[]);

  const registerAnalysisResult = useCallback(result => {
    const id = result.id || crypto.randomUUID();
    const base = { schemaVersion: ANALYSIS_CONTEXT_SCHEMA_VERSION, id, projectId: result.projectId || activeDataset?.projectId || '',organizationId:result.organizationId||project?.organizationId||profile?.default_organization_id||'',createdBy:result.createdBy||user?.id||'', datasetIds: result.datasetIds || (activeDataset ? [activeDataset.id] : []),datasetVersionIds:result.datasetVersionIds||(activeDataset?.versionId?[activeDataset.versionId]:[]),datasetVersion:result.datasetVersion||activeDataset?.version||1,toolType:result.toolType||result.toolId||'analysis',phase:result.phase||'Analyze',methodology:result.methodology||'lean-six-sigma',inputConfiguration:result.inputConfiguration||{},result:result.result||result.statsSummary||{},interpretation:result.interpretation||'',evidenceIds:result.evidenceIds||[],linkedReportIds: [], linkedDocumentIds: [],status:result.status||'complete', createdAt: result.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), ...result };
    const record = { ...base, reproducibility: createAnalysisMetadata({ ...base, analysisId: id }) };
    setAnalysisResults(previous => [record, ...previous]);
    if (record.projectId) recordActivity?.(record.projectId, { action: `Ran ${record.title || record.name || 'analysis'}`, assetType: 'analysis', assetId: record.id });
    return record.id;
  }, [activeDataset, profile, project, recordActivity, user]);
  const duplicateAnalysis = useCallback(id => { const source=analysisResults.find(item=>item.id===id); if(!source)return null; const copy={...source,id:crypto.randomUUID(),title:`${source.title||source.name||'Analysis'} Copy`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; setAnalysisResults(previous=>[copy,...previous]); return copy.id; },[analysisResults]);
  const deleteAnalysis = useCallback(async id => {if(configured&&analysisResults.some(item=>item.id===id&&item.projectId))await analysisRepository.remove(id);setAnalysisResults(previous=>previous.filter(item=>item.id!==id))},[analysisResults,configured]);
  const updateAnalysis = useCallback((id,updates) => setAnalysisResults(previous=>previous.map(item=>item.id===id?{...item,...updates,updatedAt:new Date().toISOString()}:item)),[]);

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
    duplicateAnalysis,
    deleteAnalysis,
    updateAnalysis,
    hydrationStatus,persistenceError,
  }), [activeDataset, analysisResults, columns, datasets, project, rowCount, selectedDatasetIds, registerAnalysisResult, duplicateAnalysis, deleteAnalysis, updateAnalysis, hydrationStatus, persistenceError]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export const useAnalysis = () => useContext(AnalysisContext);

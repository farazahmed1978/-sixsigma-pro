export const projectDatasetsFor=(datasets,projectId)=>datasets.filter(dataset=>dataset.projectId===projectId&&!dataset.archivedAt);

export function resolveAnalysisDataset({datasets,projectId,requestedDatasetId,currentDatasetId}){
 const available=projectDatasetsFor(datasets,projectId);
 if(requestedDatasetId&&available.some(item=>item.id===requestedDatasetId))return requestedDatasetId;
 if(available.length===1)return available[0].id;
 if(currentDatasetId&&available.some(item=>item.id===currentDatasetId))return currentDatasetId;
 return '';
}

export const analysisRoute=(route,{projectId='',datasetId='',methodId='',workflow=null}={})=>{const query=new URLSearchParams();if(methodId&&route==='/hypothesis')query.set('method',methodId);if(workflow?.projectId||projectId)query.set('project',workflow?.projectId||projectId);if(workflow?.phase)query.set('phase',workflow.phase);['workflowStep','origin','returnTo','completionTarget'].forEach(key=>{if(workflow?.[key])query.set(key,workflow[key])});return{pathname:route,search:query.toString()?`?${query}`:'',state:{projectId:workflow?.projectId||projectId,datasetId,...(workflow?{oeWorkflow:workflow}:{})}}};

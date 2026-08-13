export const projectDatasetsFor=(datasets,projectId)=>datasets.filter(dataset=>dataset.projectId===projectId&&!dataset.archivedAt);

export function resolveAnalysisDataset({datasets,projectId,requestedDatasetId,currentDatasetId}){
 const available=projectDatasetsFor(datasets,projectId);
 if(requestedDatasetId&&available.some(item=>item.id===requestedDatasetId))return requestedDatasetId;
 if(available.length===1)return available[0].id;
 if(currentDatasetId&&available.some(item=>item.id===currentDatasetId))return currentDatasetId;
 return '';
}

export const analysisRoute=(route,{projectId='',datasetId='',methodId=''}={})=>({pathname:route,search:methodId&&route==='/hypothesis'?`?method=${encodeURIComponent(methodId)}`:'',state:{projectId,datasetId}});

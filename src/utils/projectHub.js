export function documentActivityRoute(projectId,activity,documents={}){
  if((activity.assetType||'').toLowerCase()!=='document')return null;
  const document=documents[activity.assetId]||Object.values(documents).find(item=>item.id===activity.assetId);
  const templateId=document?.templateId||String(activity.assetId||'').replace(/^document-/,'');
  if(!templateId)return null;
  return templateId==='charter'?`/projects/${projectId}/charter`:`/projects/${projectId}/documents/${templateId}`;
}
export const worksheetDatasetLocation=(projectId,datasetId='')=>({pathname:'/worksheet',state:{projectId,datasetId}});
export const newDatasetLocation=projectId=>({pathname:'/worksheet',state:{projectId,newDataset:true}});
export const projectDatasetInventory=(datasets,projectId)=>datasets.filter(dataset=>dataset.projectId===projectId);

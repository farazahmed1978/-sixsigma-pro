export const datasetHydrationSnapshot=({userId='',organizationId='',projectId='',rows=[],contextDatasets=[],renderedDatasets=[],error=''})=>({
 user:userId||null,
 org:organizationId||null,
 project:projectId||null,
 query:{table:'datasets',filters:{organization_id:organizationId||null}},
 'rows returned':rows.length,
 datasets:rows.map(row=>({id:row.id,title:row.title,project_id:row.project_id,organization_id:row.organization_id,created_by:row.created_by,status:row.status,archivedAt:row.content?.archivedAt||null})),
 'WorksheetContext rows':contextDatasets.length,
 'WorksheetContext datasets':contextDatasets.map(row=>({id:row.id,name:row.name,projectId:row.projectId,organizationId:row.organizationId,status:row.status,archivedAt:row.archivedAt||null})),
 'Worksheet rendered rows':renderedDatasets.length,
 error:error||null,
});

export function reportDatasetHydration(snapshot){
 if(process.env.NODE_ENV==='production')return;
 window.__AUREQIN_DATASET_HYDRATION__=snapshot;
 console.groupCollapsed('[Dataset Hydration]');
 Object.entries(snapshot).forEach(([key,value])=>console.info(`${key}:`,value));
 console.groupEnd();
}

export function reportDatasetPersistence(snapshot){
 if(process.env.NODE_ENV==='production')return;
 window.__AUREQIN_DATASET_PERSISTENCE__=snapshot;
 console.groupCollapsed('[Dataset Persistence]');
 Object.entries(snapshot).forEach(([key,value])=>console.info(`${key}:`,value));
 console.groupEnd();
}

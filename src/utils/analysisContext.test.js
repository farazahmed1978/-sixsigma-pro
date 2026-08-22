import {analysisRoute,projectDatasetsFor,resolveAnalysisDataset} from './analysisContext';

const datasets=[
 {id:'dataset-1',projectId:'project-1',name:'Dataset 1',version:2,versionId:'version-1',columns:[{name:'CycleTime',data:[41.2,42.1]}]},
 {id:'dataset-2',projectId:'project-1',name:'Dataset 2',version:4,versionId:'version-2',columns:[{name:'Defects',data:[1,2]}]},
 {id:'other',projectId:'project-2',name:'Other',columns:[{name:'Wrong',data:[9]}]},
];

test('project launch preserves project and requires an explicit choice when multiple datasets exist',()=>{
 expect(projectDatasetsFor(datasets,'project-1').map(item=>item.id)).toEqual(['dataset-1','dataset-2']);
 expect(resolveAnalysisDataset({datasets,projectId:'project-1',requestedDatasetId:'',currentDatasetId:''})).toBe('');
});

test('single project dataset is safely preselected and an explicit requested dataset wins',()=>{
 expect(resolveAnalysisDataset({datasets,projectId:'project-2',requestedDatasetId:'',currentDatasetId:''})).toBe('other');
 expect(resolveAnalysisDataset({datasets,projectId:'project-1',requestedDatasetId:'dataset-2',currentDatasetId:'dataset-1'})).toBe('dataset-2');
});

test('analysis navigation preserves an active dataset owned by the originating project',()=>{
 expect(resolveAnalysisDataset({datasets,projectId:'project-1',requestedDatasetId:'',currentDatasetId:'dataset-2'})).toBe('dataset-2');
 expect(projectDatasetsFor(datasets,'project-1').map(item=>item.id)).toEqual(['dataset-1','dataset-2']);
});

test('catalog route carries project, dataset, and canonical hypothesis method',()=>{
 expect(analysisRoute('/hypothesis',{projectId:'project-1',datasetId:'dataset-2',methodId:'one-sample-t'})).toEqual({pathname:'/hypothesis',search:'?method=one-sample-t&project=project-1',state:{projectId:'project-1',datasetId:'dataset-2'}});
});

test('switching is identity-only and never mutates either canonical dataset',()=>{
 const before=JSON.stringify(datasets),first=resolveAnalysisDataset({datasets,projectId:'project-1',requestedDatasetId:'dataset-1'}),second=resolveAnalysisDataset({datasets,projectId:'project-1',requestedDatasetId:'dataset-2'});
 expect([first,second]).toEqual(['dataset-1','dataset-2']);
 expect(JSON.stringify(datasets)).toBe(before);
 expect(datasets.find(item=>item.id===second).columns.map(column=>column.name)).toEqual(['Defects']);
});

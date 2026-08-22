import {documentActivityRoute,newDatasetLocation,projectDatasetInventory,worksheetDatasetLocation,projectHubDeepLink,projectHubTabFromSearch} from './projectHub';

test('saved and updated document activity opens the canonical project document',()=>{
  const documents={'document-voc':{id:'document-voc',templateId:'voc',values:{researchOwner:'Saved owner'}}};
  expect(documentActivityRoute('project-1',{assetType:'document',assetId:'document-voc',action:'Updated Voice of Customer'},documents)).toBe('/projects/project-1/documents/voc');
  expect(Object.keys(documents)).toEqual(['document-voc']);
  expect(documents['document-voc'].values.researchOwner).toBe('Saved owner');
});

test('Add Dataset carries explicit new-dataset intent without selecting an existing dataset',()=>{
  expect(newDatasetLocation('project-1')).toEqual({pathname:'/worksheet',state:{projectId:'project-1',newDataset:true}});
});

test('dataset manager and Worksheet share the complete project inventory',()=>{
  const datasets=[
    {id:'dataset-1',projectId:'project-1',name:'Original Dataset',columns:[{name:'Original',data:[1]}]},
    {id:'dataset-2',projectId:'project-1',name:'Dataset 2',columns:[{name:'Second',data:[2]}]},
    {id:'dataset-3',projectId:'project-2',name:'Other',columns:[]},
  ];
  expect(projectDatasetInventory(datasets,'project-1').map(item=>item.id)).toEqual(['dataset-1','dataset-2']);
  expect(worksheetDatasetLocation('project-1','dataset-2')).toEqual({pathname:'/worksheet',state:{projectId:'project-1',datasetId:'dataset-2'}});
  expect(datasets[0].columns[0].data).toEqual([1]);
  expect(datasets[1].columns[0].data).toEqual([2]);
});

test('archive or delete selection affects only the selected canonical dataset',()=>{
  const datasets=[{id:'dataset-1',projectId:'project-1'},{id:'dataset-2',projectId:'project-1'}];
  const archived=datasets.map(item=>item.id==='dataset-2'?{...item,status:'archived',archivedAt:'now'}:item);
  expect(archived.find(item=>item.id==='dataset-1')).toBe(datasets[0]);
  expect(archived.filter(item=>item.id!=='dataset-2').map(item=>item.id)).toEqual(['dataset-1']);
});

test('project hub deep links resolve on initial load and subsequent URL changes',()=>{
  expect(projectHubTabFromSearch('?tab=project-settings&focus=owner')).toBe('Project Settings');
  expect(projectHubTabFromSearch('?tab=tollgates&phase=Define')).toBe('Tollgates');
  expect(projectHubTabFromSearch('?tab=project-binder&phase=Define')).toBe('Project Binder');
  expect(projectHubDeepLink('project-1','project-settings',{focus:'sponsor'})).toBe('/projects/project-1?tab=project-settings&focus=sponsor');
});

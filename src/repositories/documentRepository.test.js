jest.mock('./cloudRepository',()=>({cloudRepository:{list:jest.fn(),get:jest.fn(),upsert:jest.fn(),remove:jest.fn()}}));

import {cloudRepository} from './cloudRepository';
import {documentRepository} from './documentRepository';

const scope={organization_id:'11111111-1111-1111-1111-111111111111',created_by:'22222222-2222-2222-2222-222222222222'};

beforeEach(()=>{jest.clearAllMocks()});

test('list(projectId) semantics are unchanged for project-connected documents',async()=>{
 cloudRepository.list.mockResolvedValue([]);
 await documentRepository.list('project-a');
 expect(cloudRepository.list).toHaveBeenCalledWith('documents',{project_id:'project-a'});
});

test('save() delegates to cloudRepository.upsert unchanged for project-connected documents',async()=>{
 cloudRepository.upsert.mockResolvedValue({id:'doc-1'});
 const document={...scope,project_id:'project-a',title:'Charter'};
 await documentRepository.save(document);
 expect(cloudRepository.upsert).toHaveBeenCalledWith('documents',document);
});

test('createStandalone forces project_id to null and passes the record through',async()=>{
 cloudRepository.upsert.mockResolvedValue({id:'doc-2',...scope,project_id:null});
 await documentRepository.createStandalone({...scope,title:'Scratch note'});
 expect(cloudRepository.upsert).toHaveBeenCalledWith('documents',expect.objectContaining({...scope,title:'Scratch note',project_id:null}));
});

test('createStandalone refuses a record that already carries a project_id',async()=>{
 await expect(documentRepository.createStandalone({...scope,project_id:'project-a',title:'Scratch note'})).rejects.toThrow('createStandalone cannot accept a project_id');
 expect(cloudRepository.upsert).not.toHaveBeenCalled();
});

test('getStandalone returns a row whose project_id is null',async()=>{
 cloudRepository.get.mockResolvedValue({id:'doc-2',project_id:null,...scope});
 const result=await documentRepository.getStandalone('doc-2');
 expect(result.project_id).toBeNull();
});

test('getStandalone refuses to return a project-connected document fetched by the wrong id',async()=>{
 cloudRepository.get.mockResolvedValue({id:'doc-1',project_id:'project-a',...scope});
 await expect(documentRepository.getStandalone('doc-1')).rejects.toThrow('refuses to operate on a project-connected document');
});

test('listStandalone filters by organization and project_id null',async()=>{
 cloudRepository.list.mockResolvedValue([]);
 await documentRepository.listStandalone(scope.organization_id);
 expect(cloudRepository.list).toHaveBeenCalledWith('documents',{organization_id:scope.organization_id,project_id:null});
});

test('updateStandalone requires an existing id and keeps project_id null',async()=>{
 await expect(documentRepository.updateStandalone({...scope,title:'no id'})).rejects.toThrow('updateStandalone requires an existing id.');
 cloudRepository.upsert.mockResolvedValue({id:'doc-2',...scope,project_id:null});
 await documentRepository.updateStandalone({id:'doc-2',...scope,title:'renamed'});
 expect(cloudRepository.upsert).toHaveBeenCalledWith('documents',expect.objectContaining({id:'doc-2',project_id:null}));
});

test('updateStandalone refuses a record carrying a project_id',async()=>{
 await expect(documentRepository.updateStandalone({id:'doc-1',...scope,project_id:'project-a'})).rejects.toThrow('updateStandalone cannot accept a project_id');
});

test('removeStandalone deletes a standalone row',async()=>{
 cloudRepository.get.mockResolvedValue({id:'doc-2',project_id:null,...scope});
 const result=await documentRepository.removeStandalone('doc-2');
 expect(cloudRepository.remove).toHaveBeenCalledWith('documents','doc-2');
 expect(result).toBe(true);
});

test('removeStandalone refuses to delete a project-connected document',async()=>{
 cloudRepository.get.mockResolvedValue({id:'doc-1',project_id:'project-a',...scope});
 await expect(documentRepository.removeStandalone('doc-1')).rejects.toThrow('refuses to operate on a project-connected document');
 expect(cloudRepository.remove).not.toHaveBeenCalled();
});

test('removeStandalone treats an already-missing row as a successful delete',async()=>{
 cloudRepository.get.mockRejectedValue(new Error('not found'));
 const result=await documentRepository.removeStandalone('doc-missing');
 expect(result).toBe(true);
 expect(cloudRepository.remove).not.toHaveBeenCalled();
});

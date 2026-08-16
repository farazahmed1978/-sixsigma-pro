jest.mock('../lib/supabase',()=>({supabase:{auth:{getUser:jest.fn()},from:jest.fn()}}));

import {supabase} from '../lib/supabase';
import {cloudRepository} from './cloudRepository';

const mockAuthGetUser=supabase.auth.getUser;
const mockFrom=supabase.from;

const buildChain=()=>{
 const chain={};
 ['select','eq','insert','update','upsert','delete'].forEach(method=>{chain[method]=jest.fn(()=>chain)});
 chain.maybeSingle=jest.fn();
 chain.single=jest.fn();
 return chain;
};

let projectsChain,documentsChain;
const scope={organization_id:'11111111-1111-1111-1111-111111111111',project_id:'22222222-2222-2222-2222-222222222222',created_by:'33333333-3333-3333-3333-333333333333'};

beforeEach(()=>{
 jest.clearAllMocks();
 projectsChain=buildChain();
 documentsChain=buildChain();
 mockFrom.mockImplementation(table=>table==='projects'?projectsChain:documentsChain);
 mockAuthGetUser.mockResolvedValue({data:{user:{id:scope.created_by}}});
 projectsChain.maybeSingle.mockResolvedValue({data:{id:scope.project_id,organization_id:scope.organization_id},error:null});
});

test('a project-connected document upsert validates project ownership before writing',async()=>{
 documentsChain.single.mockResolvedValue({data:{id:'doc-1',...scope},error:null});
 await cloudRepository.upsert('documents',{...scope,title:'Charter'});
 expect(projectsChain.select).toHaveBeenCalled();
 expect(documentsChain.upsert).toHaveBeenCalledWith(expect.objectContaining({project_id:scope.project_id}),{onConflict:'id'});
});

test('a project-connected document upsert rejects a project the caller cannot access',async()=>{
 projectsChain.maybeSingle.mockResolvedValue({data:null,error:null});
 await expect(cloudRepository.upsert('documents',{...scope,title:'Charter'})).rejects.toThrow('The target project does not exist or is not accessible.');
 expect(documentsChain.upsert).not.toHaveBeenCalled();
});

test('a standalone document upsert (project_id null) skips project lookup and validates creator ownership instead',async()=>{
 documentsChain.single.mockResolvedValue({data:{id:'doc-2',organization_id:scope.organization_id,created_by:scope.created_by,project_id:null},error:null});
 await cloudRepository.upsert('documents',{organization_id:scope.organization_id,created_by:scope.created_by,project_id:null,title:'Scratch note'});
 expect(projectsChain.select).not.toHaveBeenCalled();
 expect(documentsChain.upsert).toHaveBeenCalledWith(expect.objectContaining({project_id:null}),{onConflict:'id'});
});

test('a standalone document upsert with a project_id omitted entirely is also treated as standalone',async()=>{
 documentsChain.single.mockResolvedValue({data:{id:'doc-3',organization_id:scope.organization_id,created_by:scope.created_by},error:null});
 await cloudRepository.upsert('documents',{organization_id:scope.organization_id,created_by:scope.created_by,title:'Scratch note'});
 expect(projectsChain.select).not.toHaveBeenCalled();
 expect(documentsChain.upsert).toHaveBeenCalled();
});

test('a standalone document upsert rejects a creator mismatch instead of silently writing on someone else\'s behalf',async()=>{
 await expect(cloudRepository.upsert('documents',{organization_id:scope.organization_id,created_by:'someone-else',project_id:null,title:'Scratch note'})).rejects.toThrow('The record owner does not match the authenticated user.');
 expect(documentsChain.upsert).not.toHaveBeenCalled();
});

test('list() filters a null value with IS NULL (.is), not eq.null, so PostgREST does not reject it as an invalid uuid',async()=>{
 const chain={};
 chain.select=jest.fn(()=>chain);
 chain.eq=jest.fn(()=>chain);
 chain.is=jest.fn(()=>chain);
 chain.then=resolve=>resolve({data:[],error:null});
 mockFrom.mockImplementation(()=>chain);
 await cloudRepository.list('documents',{organization_id:scope.organization_id,project_id:null});
 expect(chain.is).toHaveBeenCalledWith('project_id',null);
 expect(chain.eq).toHaveBeenCalledWith('organization_id',scope.organization_id);
});

test('a project-owned table without standalone support rejects a missing project_id instead of writing a global row',async()=>{
 const tasksChain=buildChain();
 mockFrom.mockImplementation(table=>table==='projects'?projectsChain:tasksChain);
 await expect(cloudRepository.upsert('tasks',{organization_id:scope.organization_id,created_by:scope.created_by,title:'Untracked task'})).rejects.toThrow('tasks requires a project_id and does not support standalone records.');
 expect(tasksChain.upsert).not.toHaveBeenCalled();
});

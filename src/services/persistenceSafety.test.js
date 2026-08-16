import {boundedVerify,isCurrentGeneration,nextGeneration,validateProjectOwnership,validateStandaloneOwnership,PROJECT_OWNED_TABLES,STANDALONE_CAPABLE_TABLES} from './persistenceSafety';

const valid={userId:'user-a',organizationId:'org-a',projectId:'project-a',createdBy:'user-a',project:{id:'project-a',organization_id:'org-a'}};

test.each([
  [{...valid,projectId:''},/Project context is required/],
  [{...valid,userId:''},/Authenticated user/],
  [{...valid,organizationId:''},/Organization context/],
  [{...valid,project:null},/does not exist or is not accessible/],
  [{...valid,project:{id:'project-a',organization_id:'org-b'}},/different organization/],
  [{...valid,expectedProjectId:'project-b'},/stale or different project/],
])('rejects unsafe project-owned writes', (input,expected)=>expect(()=>validateProjectOwnership(input)).toThrow(expected));

test('explicit retained project context remains scoped to its original project',()=>{
  expect(validateProjectOwnership(valid)).toBe(true);
  expect(()=>validateProjectOwnership({...valid,projectId:'project-b',project:{id:'project-b',organization_id:'org-a'},expectedProjectId:'project-a'})).toThrow(/stale or different project/);
});

test('late hydration responses are rejected after account, project, or deletion generation changes',()=>{
  const requestGeneration=nextGeneration(0),currentGeneration=nextGeneration(requestGeneration);
  expect(isCurrentGeneration(requestGeneration,currentGeneration)).toBe(false);
  expect(isCurrentGeneration(currentGeneration,currentGeneration)).toBe(true);
});

test('delete verification retries with a bound and succeeds when children disappear',async()=>{
  let checks=0;
  await expect(boundedVerify(async()=>++checks===3,{attempts:4,delay:1})).resolves.toBe(true);
  expect(checks).toBe(3);
});

test('delete verification fails after the configured bound',async()=>{
  let checks=0;
  await expect(boundedVerify(async()=>{checks+=1;return false},{attempts:3,delay:1})).rejects.toThrow(/could not be verified/);
  expect(checks).toBe(3);
});

const validStandalone={userId:'user-a',organizationId:'org-a',createdBy:'user-a',projectId:null};

test.each([
  [{...validStandalone,projectId:'project-a'},/must not reference a project_id/],
  [{...validStandalone,userId:''},/Authenticated user/],
  [{...validStandalone,organizationId:''},/Organization context/],
  [{...validStandalone,createdBy:''},/created_by is required/],
  [{...validStandalone,createdBy:'user-b'},/does not match the authenticated user/],
])('rejects unsafe standalone writes', (input,expected)=>expect(()=>validateStandaloneOwnership(input)).toThrow(expected));

test('a well-formed standalone write is accepted',()=>{
  expect(validateStandaloneOwnership(validStandalone)).toBe(true);
});

test('only documents is registered as standalone-capable, so no other project-owned table can bypass project ownership checks',()=>{
  expect(STANDALONE_CAPABLE_TABLES.has('documents')).toBe(true);
  expect([...STANDALONE_CAPABLE_TABLES].every(table=>PROJECT_OWNED_TABLES.has(table))).toBe(true);
  expect(STANDALONE_CAPABLE_TABLES.size).toBe(1);
});

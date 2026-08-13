import {normalizeProject,projectFromRow,projectToRow} from './ProjectsContext';

test('cloud project hydration restores embedded documents and artifacts with authoritative ownership',()=>{
  const row={id:'50ad67e3-c92a-4cd3-ab18-ed35212f2ca2',organization_id:'c7f2123e-ce93-4d83-bf21-cde773af99eb',created_by:'7c839ddd-f784-4854-b05f-ebebf646494d',name:'QA Persistence Project',status:'active',methodology:'hybrid',current_phase:'Measure',target_date:null,created_at:'2026-08-12T00:00:00.000Z',updated_at:'2026-08-12T01:00:00.000Z',content:{documents:{'doc-1':{id:'doc-1',projectId:'50ad67e3-c92a-4cd3-ab18-ed35212f2ca2'}},artifacts:[{id:'artifact-1',projectId:'50ad67e3-c92a-4cd3-ab18-ed35212f2ca2'}]}};
  const project=projectFromRow(row);
  expect(project.id).toBe(row.id);
  expect(project.organizationId).toBe(row.organization_id);
  expect(project.documents['doc-1'].projectId).toBe(row.id);
  expect(project.artifacts[0].projectId).toBe(row.id);
});

test('cloud serialization keeps the same project identity and complete project content',()=>{
  const project=normalizeProject({id:'50ad67e3-c92a-4cd3-ab18-ed35212f2ca2',organizationId:'c7f2123e-ce93-4d83-bf21-cde773af99eb',createdBy:'7c839ddd-f784-4854-b05f-ebebf646494d',name:'QA Persistence Project',documents:{'doc-1':{id:'doc-1'}},artifacts:[{id:'artifact-1'}]});
  const row=projectToRow(project);
  expect(row.id).toBe(project.id);
  expect(row.organization_id).toBe(project.organizationId);
  expect(row.content.documents['doc-1']).toEqual({id:'doc-1'});
  expect(row.content.artifacts).toEqual([{id:'artifact-1'}]);
});

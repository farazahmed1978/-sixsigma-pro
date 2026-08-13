import {datasetHydrationSnapshot} from './datasetHydrationDiagnostics';

test('diagnostic traces repository rows through context and project rendering without mutation',()=>{
 const rows=[{id:'a',title:'Dataset A',project_id:'p',organization_id:'o',created_by:'u',status:'active',content:{}},{id:'b',title:'Dataset B',project_id:'p',organization_id:'o',created_by:'u',status:'active',content:{}}],context=rows.map(row=>({id:row.id,name:row.title,projectId:row.project_id,organizationId:row.organization_id,status:row.status})),before=JSON.stringify(rows);
 const result=datasetHydrationSnapshot({userId:'u',organizationId:'o',projectId:'p',rows,contextDatasets:context,renderedDatasets:context});
 expect(result.query.filters).toEqual({organization_id:'o'});
 expect(result['rows returned']).toBe(2);
 expect(result['WorksheetContext rows']).toBe(2);
 expect(result['Worksheet rendered rows']).toBe(2);
 expect(result.datasets.map(item=>item.id)).toEqual(['a','b']);
 expect(JSON.stringify(rows)).toBe(before);
});

test('diagnostic distinguishes repository zero rows from later filtering',()=>{
 const missing=datasetHydrationSnapshot({userId:'u',organizationId:'o',projectId:'p',rows:[],contextDatasets:[],renderedDatasets:[]});
 expect(missing['rows returned']).toBe(0);
 expect(missing['WorksheetContext rows']).toBe(0);
 expect(missing['Worksheet rendered rows']).toBe(0);
});

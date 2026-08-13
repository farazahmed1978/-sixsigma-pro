export const DATASET_SCHEMA_COLUMNS=Object.freeze([
 'id','organization_id','project_id','title','description','source','created_by','status','methodology','lifecycle_phase','dmaic_phase','version','row_count','column_count','content','created_at','updated_at',
]);

const DATASET_SCHEMA_COLUMN_SET=new Set(DATASET_SCHEMA_COLUMNS);

export function assertDatasetSchemaPayload(payload){
 const unknown=Object.keys(payload||{}).filter(key=>!DATASET_SCHEMA_COLUMN_SET.has(key));
 if(unknown.length)throw new Error(`Dataset payload contains fields absent from the canonical schema: ${unknown.join(', ')}.`);
 return payload;
}

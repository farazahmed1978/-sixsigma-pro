import fs from 'fs';
import path from 'path';
import {DATASET_SCHEMA_COLUMNS,assertDatasetSchemaPayload} from './datasetSchema';
import {datasetPersistenceRecord} from '../context/WorksheetContext';

const migration=fs.readFileSync(path.resolve(__dirname,'../../supabase/migrations/202608130001_dataset_schema_reconciliation.sql'),'utf8').toLowerCase();

test('dataset reconciliation migration declares every canonical repository column',()=>{
 for(const column of DATASET_SCHEMA_COLUMNS)expect(migration).toMatch(new RegExp(`add column if not exists ${column}\\b`));
});

test('repository dataset payload contains only canonical schema fields',()=>{
 const payload=datasetPersistenceRecord({id:'9e7c22a1-1cfb-4acf-a7ad-acde05402717',projectId:'a38bd060-d13a-4c5d-ae3c-8b19c98edc09',name:'Dataset A',columns:[{name:'CycleTime',data:[10]}],rowCount:1,columnCount:1},{organizationId:'33aa322d-0c84-41c4-a786-2b93c01ed806',userId:'fbc898fc-2d2d-4ffd-9984-a106b622f754'});
 expect(()=>assertDatasetSchemaPayload(payload)).not.toThrow();
 expect(Object.keys(payload).every(key=>DATASET_SCHEMA_COLUMNS.includes(key))).toBe(true);
 expect(payload.content.columns).toHaveLength(1);
});

test('unknown repository fields fail before Supabase is called',()=>{
 expect(()=>assertDatasetSchemaPayload({id:'dataset-id',legacy_payload:{}})).toThrow('legacy_payload');
});

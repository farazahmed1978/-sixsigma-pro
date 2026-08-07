import {cloudRepository} from './cloudRepository';
export const documentRepository={list:projectId=>cloudRepository.list('project_documents',{project_id:projectId}),save:document=>cloudRepository.upsert('project_documents',document,{onConflict:'project_id,document_type'})};

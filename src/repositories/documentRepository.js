import {cloudRepository} from './cloudRepository';
export const documentRepository={list:projectId=>cloudRepository.list('documents',{project_id:projectId}),save:document=>cloudRepository.upsert('documents',document)};

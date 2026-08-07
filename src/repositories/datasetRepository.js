import {cloudRepository} from './cloudRepository';
export const datasetRepository={list:projectId=>cloudRepository.list('datasets',{project_id:projectId}),saveMetadata:dataset=>cloudRepository.upsert('datasets',dataset),saveVersion:version=>cloudRepository.upsert('dataset_versions',version),loadVersion:id=>cloudRepository.get('dataset_versions',id)};

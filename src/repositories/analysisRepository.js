import {cloudRepository} from './cloudRepository';
export const analysisRepository={save:analysis=>cloudRepository.upsert('analyses',analysis),list:projectId=>cloudRepository.list('analyses',{project_id:projectId}),saveEvidence:evidence=>cloudRepository.upsert('evidence_items',evidence)};

import {cloudRepository} from './cloudRepository';
import {getSuite} from '../config/suites';

const PM_SUITE_ID=getSuite('project-management').id;
const PM_TABLES=Object.freeze(['tasks','risks','issues','decisions','approvals','activities']);
const stampSuite=record=>({...record,suite:PM_SUITE_ID});

const pmTableRepository=table=>({
 list:(projectId,filters={})=>cloudRepository.list(table,{project_id:projectId,suite:PM_SUITE_ID,...filters}),
 listOrganization:organizationId=>cloudRepository.list(table,{organization_id:organizationId,suite:PM_SUITE_ID}),
 get:id=>cloudRepository.get(table,id),
 create:record=>cloudRepository.upsert(table,stampSuite(record)),
 update:record=>cloudRepository.upsert(table,stampSuite(record)),
 remove:id=>cloudRepository.remove(table,id),
});

export const PM_SUITE_IDENTIFIER=PM_SUITE_ID;
export const pmRepository=PM_TABLES.reduce((repository,table)=>({...repository,[table]:pmTableRepository(table)}),{});

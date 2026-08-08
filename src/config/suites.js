export const SUITE_STATES={ACTIVE:'active',TRIAL:'trial',LOCKED:'locked',COMING_SOON:'coming_soon'};
export const SUITES=[
 {id:'operational-excellence',name:'Operational Excellence',status:SUITE_STATES.ACTIVE,description:'Lean Six Sigma, DMAIC, quality workspaces, datasets, evidence, and statistical analysis.',entryPath:'/projects',methodologies:['lean-six-sigma','dmaic']},
 {id:'project-management',name:'Project Management',status:SUITE_STATES.ACTIVE,description:'Professional project initiation, planning, execution, monitoring, and closeout.',entryPath:'/templates',methodologies:['pmp','hybrid']},
 {id:'supply-chain',name:'Supply Chain',status:SUITE_STATES.COMING_SOON,description:'Reserved for connected planning, sourcing, logistics, and supplier performance.'},
 {id:'healthcare',name:'Healthcare',status:SUITE_STATES.COMING_SOON,description:'Reserved for healthcare quality, safety, and operational improvement.'},
 {id:'manufacturing',name:'Manufacturing',status:SUITE_STATES.COMING_SOON,description:'Reserved for production performance and manufacturing excellence.'},
 {id:'technology',name:'Technology',status:SUITE_STATES.COMING_SOON,description:'Reserved for technology delivery, reliability, and transformation.'},
 {id:'financial-services',name:'Financial Services',status:SUITE_STATES.COMING_SOON,description:'Reserved for financial operations, controls, and transformation.'},
 {id:'construction',name:'Construction',status:SUITE_STATES.LOCKED,description:'Reserved for construction delivery, controls, and field operations.'}
];
export const getSuite=id=>SUITES.find(suite=>suite.id===id);

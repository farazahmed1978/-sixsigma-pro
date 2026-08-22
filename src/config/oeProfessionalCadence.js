export const OE_PHASES=['Define','Measure','Analyze','Improve','Control'];

const doc=(id,label,options={})=>({id,label,kind:'document',...options});
const action=(id,label,route,options={})=>({id,label,kind:'action',route,...options});
const analysis=(id,label,route,toolIds,reason)=>({id,label,kind:'analysis',route,toolIds,reason});

export const OE_PROFESSIONAL_CADENCE={
 Define:{
  core:[doc('charter','Project Charter'),doc('sipoc','SIPOC'),doc('stakeholder-register','Stakeholder Register'),doc('business-case','Business Case'),doc('voc','Voice of the Customer')],
  conditional:[doc('ctq-tree','CTQ Tree')],additional:[]
 },
 Measure:{
  core:[
   doc('data-collection-plan','Data Collection Plan',{choice:'measurement-planning'}),
   doc('measurement-plan','Measurement Plan',{choice:'measurement-planning',sequence:false}),
   doc('operational-definitions','Operational Definitions'),
   action('project-dataset','Project Dataset','datasets'),
   doc('process-map','Process Map',{choice:'process-understanding'}),
   doc('swimlane-process-map','Swimlane Process Map',{choice:'process-understanding',sequence:false}),
   doc('value-stream-map','Value Stream Map',{choice:'process-understanding',sequence:false}),
   doc('baseline-metrics','Baseline Performance'),
  ],
  conditional:[
   doc('sampling-plan','Sampling Plan',{reason:'Use when the collection design needs a formal sampling method.'}),
   doc('msa-workspace','MSA Study Context',{reason:'Use when measurement-system variation could affect the decision.'}),
   doc('process-capability-study','Capability Study Context',{reason:'Use when defensible specification limits apply.'}),
  ],
  additional:[
   analysis('msa','Measurement System Analysis','/tool/msa',['msa','gage-rr','measurement-system-analysis'],'Validate the measurement system before trusting process variation.'),
   analysis('capability','Capability Analysis','/tool/capability',['capability','capability-analysis','process-capability'],'Quantify Cp, Cpk, Pp and Ppk when specifications apply.'),
   analysis('descriptive','Descriptive Statistics','/tool/descriptive',['descriptive'],'Establish a numerical baseline.'),
   analysis('histogram','Histogram','/tool/histogram',['histogram'],'Inspect baseline shape, spread and unusual observations.'),
  ]
 },
 Analyze:{
  core:[doc('hypothesis-plan','Investigation / Hypothesis Plan'),doc('root-cause-verification','Root Cause Verification Plan'),doc('statistical-analysis-summary','Validated Root Cause Summary')],
  conditional:[doc('fishbone-workspace','Fishbone Workspace',{choice:'root-cause'}),doc('five-whys','5 Whys',{choice:'root-cause'}),doc('xy-matrix','Cause & Effect / X-Y Matrix',{choice:'root-cause'}),doc('affinity-diagram','Affinity Diagram',{choice:'root-cause'})],
  additional:[
   analysis('hypothesis','Hypothesis Testing','/hypothesis',['hypothesis'],'Test a defined comparison using the appropriate inferential method.'),
   analysis('anova','ANOVA','/tool/anova',['anova'],'Compare multiple groups.'),
   analysis('regression','Regression','/tool/regression',['regression'],'Model a response against one predictor.'),
   analysis('multiregression','Multiple Regression','/tool/multiregression',['multiregression','multiple-regression'],'Model a response against several predictors.'),
   analysis('logistic','Logistic Regression','/tool/logistic',['logistic','logistic-regression'],'Model a categorical or binary outcome.'),
   analysis('correlation','Correlation','/tool/correlation',['correlation'],'Screen relationships before causal conclusions.'),
   analysis('distribution','Distribution Analysis','/tool/distribution-analysis',['distribution-analysis'],'Assess distribution fit and transformation needs.'),
   analysis('pareto','Pareto','/tool/pareto',['pareto'],'Prioritize dominant defect or cause categories.'),
   analysis('fishbone-tool','Fishbone Diagram','/tool/fishbone',['fishbone'],'Develop candidate causes in the executable diagram.'),
  ]
 },
 Improve:{
  core:[doc('solution-selection-matrix','Solution Selection',{choice:'solution-selection'}),doc('impact-effort-matrix','Impact–Effort Matrix',{choice:'solution-selection',sequence:false}),doc('pilot-plan','Pilot Plan',{choice:'delivery',sequence:false}),doc('implementation-plan','Implementation Plan',{choice:'delivery'}),doc('action-plan','Action Plan')],
  conditional:[doc('factorial-plan','DOE Experiment Plan',{reason:'Use when controlled experimentation is needed.'}),doc('future-state-process-map','Future-State Process Map'),doc('cost-benefit-analysis','Cost-Benefit Analysis'),doc('kaizen-event-summary','Kaizen Event Summary')],
  additional:[
   analysis('fmea','FMEA','/tool/fmea',['fmea'],'Assess solution and implementation risks before rollout.'),
   analysis('doe','Design of Experiments','/doe',['doe','design-of-experiments'],'Design and analyze a controlled experiment.'),
   analysis('validation','Post-change Analysis','/analysis',['capability','hypothesis','anova','regression','control-chart'],'Verify that the implemented change improved performance.'),
  ]
 },
 Control:{
  core:[doc('control-plan','Control Plan'),doc('reaction-plan','Reaction Plan'),doc('monitoring-plan','Monitoring Plan'),doc('audit-checklist','Audit Checklist'),doc('lessons-learned','Lessons Learned')],
  conditional:[],
  additional:[
   analysis('control-chart','Control Chart','/tool/control-chart',['control-chart'],'Monitor continuous process behavior over time.'),
   analysis('attribute-chart','Attribute Chart','/tool/attribute-chart',['attribute-chart'],'Monitor defect or defective rates.'),
   analysis('run-chart','Run Chart','/tool/run-chart',['run-chart'],'Monitor ordered performance when control limits are not yet required.'),
   analysis('capability-revalidation','Capability Revalidation','/tool/capability',['capability','capability-analysis','process-capability'],'Revalidate capability after improvement when specifications apply.'),
  ],
  postApproval:[doc('project-closure','Project Closure')]
 }
};

export const cadenceForPhase=phase=>OE_PROFESSIONAL_CADENCE[phase]||{core:[],conditional:[],additional:[]};
export const tollgateRoute=(projectId,phase)=>`/projects/${projectId}?tab=tollgates&phase=${encodeURIComponent(phase)}`;
export const phaseHomeRoute=(projectId,phase)=>`/projects/${projectId}?phase=${encodeURIComponent(phase)}`;
export const documentRoute=(projectId,id)=>id==='charter'?`/projects/${projectId}/charter`:`/projects/${projectId}/documents/${id}`;
export const analysisMatches=(item,toolIds=[])=>toolIds.some(id=>[item?.toolId,item?.toolType,item?.method,item?.id].filter(Boolean).map(String).some(value=>value===id||value.includes(id)));

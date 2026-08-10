const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const item=(id,name,path,type,options={})=>({id,name,path,type,aliases:options.aliases||[],favoriteEligible:options.favoriteEligible??type!=='document',recentEligible:options.recentEligible??type!=='document',availability:options.availability||'available'});
const doc=(id,name,type='document',options={})=>item(`doc-${id}`,name,`/documents/${id}`,type,options);
const tool=(id,name,path,type='analysis',options={})=>item(`tool-${id}`,name,path||`/tool/${id}`,type,options);
const cluster=(id,label,items)=>({id,label,items});
const pmDoc=(name,id=slug(name),type='document')=>doc(id,name,type);

const CONTROL_CHART=tool('control-chart','Control Chart',undefined,'analysis',{aliases:['spc','control','shewhart','imr','xbar']});
const ATTRIBUTE_CHART=tool('attribute-chart','Attribute Charts',undefined,'analysis',{aliases:['p chart','np chart','c chart','u chart','attribute']});
const RUN_CHART=tool('run-chart','Run Chart');
const FMEA=tool('fmea','FMEA',undefined,'workspace',{aliases:['failure mode effects analysis','risk priority number','rpn']});

const OE_GROUPS=[
 {id:'define',name:'Define',color:'var(--yellow)',clusters:[
  cluster('project-framing','Project Framing',[doc('charter','Project Charter','workspace'),doc('business-case','Business Case','workspace')]),
  cluster('customer-requirements','Customer & Requirements',[doc('voc','Voice of the Customer (VOC)','workspace',{aliases:['voice of customer']}),doc('ctq-tree','CTQ Tree','diagram',{aliases:['critical to quality']})]),
  cluster('process-boundaries','Process Boundaries',[doc('sipoc','SIPOC','diagram',{aliases:['supplier input process output customer']})]),
  cluster('stakeholder-alignment','Stakeholder Alignment',[doc('stakeholder-register','Stakeholder Register','workspace')]),
 ]},
 {id:'measure',name:'Measure',color:'var(--green)',clusters:[
  cluster('data-collection','Data Collection',[doc('data-collection-plan','Data Collection Plan','workspace'),doc('sampling-plan','Sampling Plan','workspace'),doc('measurement-plan','Measurement Plan','workspace'),tool('sample-size-calculator','Sample Size Calculator',undefined,'calculator'),tool('power-calculator','Power Calculator',undefined,'calculator')]),
  cluster('process-understanding','Process Understanding',[doc('process-map','Process Map','diagram'),doc('swimlane-process-map','Swimlane Process Map','diagram'),doc('value-stream-map','Value Stream Map','diagram'),doc('operational-definitions','Operational Definitions','workspace'),doc('baseline-metrics','Baseline Metrics','workspace')]),
  cluster('measurement-system','Measurement System',[doc('msa-workspace','MSA Workspace','workspace',{aliases:['measurement system analysis']}),tool('msa','Gage R&R',undefined,'analysis',{aliases:['gage','gauge','grr','measurement system']})]),
  cluster('process-performance','Process Performance',[doc('process-capability-study','Process Capability Study','workspace'),tool('capability','Capability Analysis',undefined,'analysis',{aliases:['cpk','ppk','process capability']}),CONTROL_CHART,ATTRIBUTE_CHART,RUN_CHART,tool('histogram','Histogram'),tool('descriptive','Descriptive Statistics',undefined,'analysis',{aliases:['summary statistics','mean','standard deviation']}),tool('sigma-calculator','Sigma Level / DPMO',undefined,'calculator')]),
 ]},
 {id:'analyze',name:'Analyze',color:'var(--orange)',clusters:[
  cluster('cause-discovery','Cause Discovery',[doc('fishbone-workspace','Fishbone Diagram Workspace','diagram'),tool('fishbone','Fishbone Diagram',undefined,'diagram'),doc('five-whys','5 Whys','workspace'),doc('affinity-diagram','Affinity Diagram','diagram'),doc('xy-matrix','Cause & Effect Matrix / X-Y Matrix','workspace')]),
  cluster('prioritization-risk','Prioritization & Risk',[tool('pareto','Pareto Chart'),FMEA]),
  cluster('hypothesis-comparison','Hypothesis & Comparison',[doc('hypothesis-plan','Hypothesis Test Plan','workspace'),tool('hypothesis','Hypothesis Testing','/hypothesis','analysis',{aliases:['test','p value','significance']}),tool('boxplot','Box Plot'),tool('anova','ANOVA',undefined,'analysis',{aliases:['analysis of variance']}),tool('effect-size','Effect Size Calculators',undefined,'calculator')]),
  cluster('relationships-prediction','Relationships & Prediction',[tool('scatter','Scatter Plot'),tool('multivari','Multi-Vari Chart'),tool('correlation','Correlation Matrix'),tool('regression','Regression',undefined,'analysis',{aliases:['linear model','prediction']}),tool('multiregression','Multiple Regression'),tool('logistic','Logistic Regression')]),
  cluster('verification-synthesis','Verification & Synthesis',[doc('root-cause-verification','Root Cause Verification Plan','workspace'),doc('statistical-analysis-summary','Statistical Analysis Summary','workspace')]),
 ]},
 {id:'improve',name:'Improve',color:'var(--purple)',clusters:[
  cluster('solution-design','Solution Design',[doc('solution-selection-matrix','Solution Selection Matrix / Pugh Matrix','workspace'),doc('impact-effort-matrix','Impact-Effort Matrix','workspace'),doc('future-state-process-map','Future-State Process Map','diagram'),tool('vsm','Value Stream Map Analysis')]),
  cluster('experimentation','Experimentation',[doc('factorial-plan','DOE Experiment Plan','workspace'),tool('doe','Design of Experiments','/doe','analysis',{aliases:['doe','factorial experiment']})]),
  cluster('risk-proofing','Risk Proofing',[FMEA]),
  cluster('pilot-delivery','Pilot & Delivery',[doc('pilot-plan','Pilot Plan','workspace'),doc('implementation-plan','Implementation Plan','workspace'),doc('action-plan','Action Plan','workspace'),doc('kaizen-event-summary','Kaizen Event Summary','workspace')]),
  cluster('benefits','Benefits',[doc('cost-benefit-analysis','Cost-Benefit Analysis','workspace')]),
 ]},
 {id:'control',name:'Control',color:'var(--cyan)',clusters:[
  cluster('process-control','Process Control',[doc('control-plan','Control Plan','workspace'),doc('reaction-plan','Reaction Plan','workspace'),CONTROL_CHART]),
  cluster('monitoring-audit','Monitoring & Audit',[doc('monitoring-plan','Monitoring Plan','workspace'),doc('audit-checklist','Audit Checklist','workspace'),ATTRIBUTE_CHART,RUN_CHART]),
  cluster('closeout-learning','Closeout & Learning',[doc('lessons-learned','Lessons Learned','workspace'),doc('project-closure','Project Closure','workspace')]),
 ]},
];

const PM_GROUPS=[
 {id:'initiation',name:'Initiation',clusters:[
  cluster('justification-benefits','Justification & Benefits',[pmDoc('Business Case','business-case','workspace'),pmDoc('Benefits Management Plan')]),
  cluster('authorization-assumptions','Authorization & Assumptions',[pmDoc('Project Charter','charter','workspace'),pmDoc('Assumption Log')]),
  cluster('stakeholder-identification','Stakeholder Identification',[pmDoc('Stakeholder Register','stakeholder-register','workspace')]),
 ]},
 {id:'planning',name:'Planning',clusters:[
  cluster('integration-governance','Integration & Governance',[pmDoc('Project Management Plan'),pmDoc('Configuration Management Plan'),pmDoc('Change Management Plan')]),
  cluster('scope-requirements','Scope & Requirements',[pmDoc('Scope Management Plan'),pmDoc('Scope Statement'),pmDoc('WBS','wbs','diagram'),pmDoc('WBS Dictionary'),pmDoc('Requirements Management Plan'),pmDoc('Requirements Traceability Matrix')]),
  cluster('schedule','Schedule',[pmDoc('Schedule Management Plan'),pmDoc('Schedule Baseline')]),
  cluster('cost','Cost',[pmDoc('Cost Management Plan'),pmDoc('Cost Baseline')]),
  cluster('resources','Resources',[pmDoc('Resource Management Plan'),pmDoc('Resource Calendar')]),
  cluster('stakeholders-communications','Stakeholders & Communications',[pmDoc('Communications Management Plan'),pmDoc('Stakeholder Engagement Plan')]),
  cluster('risk','Risk',[pmDoc('Risk Management Plan'),pmDoc('Risk Register'),pmDoc('Risk Report')]),
  cluster('procurement','Procurement',[pmDoc('Procurement Management Plan')]),
  cluster('quality','Quality',[pmDoc('Quality Management Plan')]),
 ]},
 {id:'execution',name:'Execution',clusters:[
  cluster('delivery-governance','Delivery Governance',[pmDoc('Issue Log'),pmDoc('Decision Log'),pmDoc('Action Item Log'),pmDoc('RAID Log')]),
  cluster('meetings-change','Meetings & Change',[pmDoc('Meeting Minutes','minutes','workspace'),pmDoc('Change Request')]),
  cluster('procurement-vendors','Procurement & Vendors',[pmDoc('Procurement Documents'),pmDoc('Vendor Evaluation')]),
  cluster('team-performance','Team Performance',[pmDoc('Team Performance Reviews'),pmDoc('Lessons Learned Register')]),
 ]},
 {id:'monitoring-controlling',name:'Monitoring & Controlling',clusters:[
  cluster('performance-reporting','Performance Reporting',[pmDoc('Status Report'),pmDoc('Executive Dashboard','executive-dashboard','workspace'),pmDoc('Variance Report'),pmDoc('EVM Dashboard','evm-dashboard','workspace'),pmDoc('Milestone Report'),pmDoc('KPI Dashboard','kpi-dashboard','workspace')]),
  cluster('change-quality','Change & Quality',[pmDoc('Change Log'),pmDoc('Quality Audit')]),
  cluster('risk-review','Risk Review',[pmDoc('Risk Review')]),
 ]},
 {id:'closing',name:'Closing',clusters:[
  cluster('formal-closure','Formal Closure',[pmDoc('Final Project Report'),pmDoc('Project Closure Report'),pmDoc('Acceptance Signoff'),pmDoc('Archive Checklist')]),
  cluster('transition-benefits','Transition & Benefits',[pmDoc('Transition Plan'),pmDoc('Benefits Realization Review')]),
  cluster('knowledge-transfer','Knowledge Transfer',[pmDoc('Lessons Learned Report')]),
 ]},
];

export const NAVIGATION=[
 {section:'Workspace',items:[item('suites','Aureqin Suites','/suites','page'),item('projects','Projects','/projects','page'),item('worksheet','Data Worksheet','/worksheet','workspace'),item('reports','Reports','/report','workspace')]},
 {section:'Operational Excellence',suiteId:'operational-excellence',groups:OE_GROUPS},
 {section:'Project Management',suiteId:'project-management',groups:PM_GROUPS},
 {section:'Future Suites',suiteIds:['supply-chain','healthcare','manufacturing','technology','financial-services','construction']},
 {section:'Resources',items:[item('user-guide','User Guide','/resources/user-guide','reference'),item('formula-reference','Formula Reference','/resources/formula-reference','reference'),item('statistical-tables','Statistical Tables','/resources/statistical-tables','reference'),item('dmaic-guide','DMAIC Guide','/resources/dmaic-guide','reference'),item('pmp-guide','PMP Guide','/resources/pmp-guide','reference'),item('video-tutorials','Video Tutorials','/resources/video-tutorials','reference'),item('release-notes','Release Notes','/resources/release-notes','reference'),item('resources','Guides & References','/resources','reference'),item('about','About','/about','page')]},
 {section:'Legal',items:[item('privacy','Privacy Policy','/privacy','page'),item('terms','Terms of Service','/terms','page')]},
];

export const PMP_STAGE_LABELS={initiation:'Initiation',planning:'Planning',execution:'Execution','monitoring-controlling':'Monitoring & Controlling',closing:'Closing'};

export const MEASURE_SEQUENCE_IDS=[
 'data-collection-plan',
 'measurement-plan',
 'operational-definitions',
 'process-map',
 'baseline-metrics',
];

export const MEASURE_CADENCE=[
 {id:'measurement-planning',label:'Measurement planning',category:'mandatory',destination:'data-collection-plan'},
 {id:'operational-definitions',label:'Operational definitions',category:'mandatory',destination:'operational-definitions'},
 {id:'dataset',label:'Project dataset',category:'mandatory',destination:'datasets'},
 {id:'process-understanding',label:'Current process understanding',category:'mandatory',destination:'process-map'},
 {id:'baseline-performance',label:'Baseline performance',category:'mandatory',destination:'baseline-metrics'},
 {id:'measurement-system',label:'Measurement-system validation or documented justification',category:'conditional',destination:'msa-workspace'},
 {id:'capability',label:'Capability study when specifications apply',category:'conditional',destination:'process-capability-study'},
 {id:'measure-review',label:'Measure review and Tollgate',category:'mandatory',destination:'tollgate'},
];

export const MEASURE_BASELINE_ANALYSIS_IDS=['baseline','baseline-analysis','histogram','descriptive','capability','capability-analysis'];
export const MEASURE_MSA_ANALYSIS_IDS=['msa','gage-rr','measurement-system-analysis'];
export const MEASURE_CAPABILITY_ANALYSIS_IDS=['capability','capability-analysis','process-capability'];

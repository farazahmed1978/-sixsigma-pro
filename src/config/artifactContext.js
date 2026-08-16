export const SHARED_FIELD_REGISTRY=Object.freeze({
  projectName:{targets:['projectName']},sponsor:{targets:['sponsor','projectSponsor']},owner:{targets:['owner','projectOwner','projectManager']},processOwner:{targets:['processOwner']},startDate:{targets:['startDate']},targetDate:{targets:['targetDate','endDate']},status:{targets:['status']},budget:{targets:['budget']},businessCaseSummary:{targets:['businessCase','businessCaseSummary','executiveSummary'],source:'Project Charter'},goalSummary:{targets:['goal','goalStatement'],source:'Project Charter'},scopeSummary:{targets:['scope','scopeSummary'],source:'Project Charter'},financialImpact:{targets:['financialImpact'],source:'Project Charter'},stakeholders:{targets:['stakeholders'],source:'Project Charter'},
});

export const ARTIFACT_KIND_RULES=Object.freeze({
  document:{cardinality:'singleton'},charter:{cardinality:'singleton'},analysis:{cardinality:'repeatable'},toolOutput:{cardinality:'repeatable'},dataset:{cardinality:'repeatable'},report:{cardinality:'singleton'},
});

export const sharedFieldForTarget=target=>Object.entries(SHARED_FIELD_REGISTRY).find(([,rule])=>rule.targets.includes(target))?.[0]||null;
export const artifactDefinition=({kind='document',template})=>({kind,canonicalType:template?.id||kind,title:template?.name||kind,phase:template?.phase||'',cardinality:ARTIFACT_KIND_RULES[template?.id]||ARTIFACT_KIND_RULES[kind]||{cardinality:'repeatable'}});
export const matchingSharedFields=(template,shared={})=>template.sections.flatMap(section=>section.fields).map(field=>({field,sharedKey:sharedFieldForTarget(field.id)})).filter(item=>item.sharedKey&&shared[item.sharedKey]!==undefined&&String(shared[item.sharedKey]??'').trim()).map(item=>({source:SHARED_FIELD_REGISTRY[item.sharedKey].source||'Project',sharedKey:item.sharedKey,targetField:item.field.id,label:item.field.label,value:shared[item.sharedKey]}));
export const existingProjectArtifact=({definition,project})=>definition.cardinality.cardinality==='singleton'?(definition.canonicalType==='charter'?project.charter:project.documents?.[`document-${definition.canonicalType}`])||null:null;
export const artifactContextDecision=({mode,projectId='',instanceId=''})=>({mode,projectId:mode==='project'?projectId:'',instanceId,chosenAt:new Date().toISOString()});

const STANDALONE_KEY='aureqin_standalone_artifacts';
export const loadStandaloneArtifacts=()=>{try{return JSON.parse(localStorage.getItem(STANDALONE_KEY)||'{}')}catch{return{}}};
export const saveStandaloneArtifact=record=>{const all=loadStandaloneArtifacts();all[record.id]=record;localStorage.setItem(STANDALONE_KEY,JSON.stringify(all));return record};
export const getStandaloneArtifact=id=>loadStandaloneArtifacts()[id]||null;

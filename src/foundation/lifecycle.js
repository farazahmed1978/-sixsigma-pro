import {NAVIGATION} from '../config/navigation';

const aliases={
 'operational-excellence':'operational-excellence','lean-six-sigma':'operational-excellence',dmaic:'operational-excellence',hybrid:'operational-excellence',
 'project-management':'project-management',pmp:'project-management',pm:'project-management',
};
const slug=value=>String(value||'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const fromNavigation=NAVIGATION.filter(section=>section.suiteId&&section.groups).map(section=>({
 id:section.suiteId,label:section.section,methodology:section.suiteId==='operational-excellence'?'DMAIC':section.section,
 stages:section.groups.map((group,index)=>({id:group.id,label:group.name,order:index,color:group.color||null,recommendedDocumentId:group.recommendedDocumentId||null,workflowClusters:(group.clusters||[]).map((cluster,clusterIndex)=>({id:cluster.id,label:cluster.label,order:clusterIndex}))})),
}));

export const createLifecycleRegistry=(definitions=fromNavigation)=>{
 const definitionsById=new Map(definitions.map(definition=>[definition.id,Object.freeze({...definition,stages:Object.freeze(definition.stages.map((stage,index)=>Object.freeze({...stage,order:stage.order??index})))} )]));
 return {
  definitions:[...definitionsById.values()],
  get(id){return definitionsById.get(aliases[slug(id)]||slug(id))||null;},
  register(definition){return createLifecycleRegistry([...definitionsById.values(),definition]);},
 };
};
export const lifecycleRegistry=createLifecycleRegistry();
export const OE_LIFECYCLE=lifecycleRegistry.get('operational-excellence');

export function resolveProjectSuiteId(project={}){
 const explicit=project.suiteId||project.suite_id||project.suite||project.content?.suiteId;
 return aliases[slug(explicit)]||aliases[slug(project.methodology)]||slug(explicit)||'operational-excellence';
}
export const lifecycleForProject=project=>lifecycleRegistry.get(resolveProjectSuiteId(project))||OE_LIFECYCLE;
export const lifecycleStageLabels=lifecycle=>lifecycle.stages.map(stage=>stage.label);
export function resolveLifecycleStage(value,lifecycle,{preserveUnknown=true}={}){
 const raw=typeof value==='object'?(value.stageId||value.phaseId||value.lifecyclePhase||value.lifecycle_phase||value.currentPhase||value.dmaicPhase||value.dmaic_phase||value.phase):value;
 if(!raw)return null;const key=slug(raw);const match=lifecycle.stages.find(stage=>stage.id===key||slug(stage.label)===key);return match|| (preserveUnknown?{id:key||'unresolved',label:String(raw),order:Number.MAX_SAFE_INTEGER,unresolved:true}:null);
}
export function stageForRecord(record,lifecycle){return resolveLifecycleStage(record,lifecycle);}
export function stageRank(value,lifecycle){return resolveLifecycleStage(value,lifecycle)?.order??Number.MAX_SAFE_INTEGER;}
export function sortByLifecycle(items,lifecycle){return[...items].sort((a,b)=>stageRank(a,lifecycle)-stageRank(b,lifecycle));}
export function initializeLifecycleStages(lifecycle,existing={}){return lifecycle.stages.reduce((result,stage)=>({...result,[stage.label]:{notes:'',itemIds:[],...(existing[stage.label]||existing[stage.id]||{})}}),{...existing});}

import {DEFINE_TEMPLATES} from '../config/defineTemplates';
import {MEASURE_TEMPLATES} from '../config/measureTemplates';
import {ANALYZE_TEMPLATES} from '../config/analyzeTemplates';
import {IMPROVE_TEMPLATES} from '../config/improveTemplates';
import {CONTROL_TEMPLATES} from '../config/controlTemplates';
import {PMP_TEMPLATES} from '../config/pmpTemplates';
import {lifecycleForProject,OE_LIFECYCLE} from '../foundation/lifecycle';
export const DEFINE_SEQUENCE_IDS=['charter','sipoc','stakeholder-register','business-case','voc'];
const SEQUENCE_LABELS={voc:'Voice of Customer'};
const withSequenceLabel=template=>({...template,sequenceLabel:SEQUENCE_LABELS[template.id]||template.sequenceLabel||template.name});
export const defineSequence=()=>DEFINE_SEQUENCE_IDS.map(id=>DEFINE_TEMPLATES.find(template=>template.id===id)).filter(Boolean).map(template=>({...template,sequenceLabel:SEQUENCE_LABELS[template.id]||template.name}));
// The Operational Excellence document sequence. Kept exactly as-is (curated Define cadence
// followed by the remaining DMAIC catalogs in declared order) so this generalization is
// behavior-preserving for OE, not a rewrite.
export const dmaicSequence=()=>[...defineSequence(),...MEASURE_TEMPLATES,...ANALYZE_TEMPLATES,...IMPROVE_TEMPLATES,...CONTROL_TEMPLATES].map(withSequenceLabel);

// Project Management's document sequence, grouped by pmpLifecycle stage label — the PMP
// catalog's equivalent of the DMAIC catalogs above. No curated subset exists for PM yet
// (unlike Define's hand-picked cadence), so each stage uses its full catalog in declared order.
const PM_STAGE_TEMPLATES=PMP_TEMPLATES.reduce((map,template)=>{const label=template.pmpLifecycle;if(!label)return map;(map[label]=map[label]||[]).push(template);return map},{});

// Suite-agnostic entry point: the document sequence for whichever suite the given project
// belongs to, driven by that suite's lifecycle stage list (lifecycleForProject(project).stages)
// rather than a hardcoded DMAIC-only array. Falls back to the OE sequence when no project is
// given, preserving every existing single-argument call site's behavior unchanged.
export function sequenceForProject(project){
  const lifecycle=project?lifecycleForProject(project):OE_LIFECYCLE;
  if(lifecycle.id==='operational-excellence')return dmaicSequence();
  if(lifecycle.id==='project-management')return lifecycle.stages.flatMap(stage=>(PM_STAGE_TEMPLATES[stage.label]||[]).map(withSequenceLabel));
  return [];
}
export function nextDmaicArtifact(templateId,project){const sequence=sequenceForProject(project),index=sequence.findIndex(item=>item.id===templateId);return index>=0?sequence[index+1]||null:null}
export function previousDmaicArtifact(templateId,project){
  const sequence=sequenceForProject(project);
  const lifecycle=project?lifecycleForProject(project):OE_LIFECYCLE;
  if(lifecycle.id==='operational-excellence'&&templateId==='business-case')return sequence.find(item=>item.id==='charter')||null;
  const index=sequence.findIndex(item=>item.id===templateId);
  return index>0?sequence[index-1]:null;
}
export const nextDefineArtifact=nextDmaicArtifact;
export const projectDocumentRoute=(projectId,templateId)=>`/projects/${projectId}/documents/${templateId}`;
export function defineAdvanceState({template,activeIndex,values,project}){const current=template.sections[activeIndex],atLast=activeIndex>=template.sections.length-1,required=template.sections.flatMap(section=>section.fields.filter(field=>field.required!==false).map(field=>({...field,sectionTitle:section.title}))),missingDetails=required.filter(field=>Array.isArray(values[field.id])?!values[field.id].length:!String(values[field.id]||'').replace(/<[^>]*>/g,'').trim()).map(field=>({field:field.label,section:field.sectionTitle})),next=atLast?nextDmaicArtifact(template.id,project):null,populated=required.length-missingDetails.length;return{missing:missingDetails.map(item=>item.field),missingDetails,completion:required.length?Math.round(populated/required.length*100):100,atLast,next,label:atLast?(next?next.sequenceLabel:'DMAIC sequence complete'):(template.sections[activeIndex+1]?.title||'Continue'),current}}

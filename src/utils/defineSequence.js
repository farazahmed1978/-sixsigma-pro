import {DEFINE_TEMPLATES} from '../config/defineTemplates';
import {MEASURE_TEMPLATES} from '../config/measureTemplates';
import {ANALYZE_TEMPLATES} from '../config/analyzeTemplates';
import {IMPROVE_TEMPLATES} from '../config/improveTemplates';
import {CONTROL_TEMPLATES} from '../config/controlTemplates';
export const DEFINE_SEQUENCE_IDS=['charter','sipoc','stakeholder-register','business-case','voc','ctq-tree'];
const SEQUENCE_LABELS={voc:'Voice of Customer'};
export const defineSequence=()=>DEFINE_SEQUENCE_IDS.map(id=>DEFINE_TEMPLATES.find(template=>template.id===id)).filter(Boolean).map(template=>({...template,sequenceLabel:SEQUENCE_LABELS[template.id]||template.name}));
export const dmaicSequence=()=>[...defineSequence(),...MEASURE_TEMPLATES,...ANALYZE_TEMPLATES,...IMPROVE_TEMPLATES,...CONTROL_TEMPLATES].map(template=>({...template,sequenceLabel:SEQUENCE_LABELS[template.id]||template.sequenceLabel||template.name}));
export function nextDmaicArtifact(templateId){const sequence=dmaicSequence(),index=sequence.findIndex(item=>item.id===templateId);return index>=0?sequence[index+1]||null:null}
export const nextDefineArtifact=nextDmaicArtifact;
export const projectDocumentRoute=(projectId,templateId)=>`/projects/${projectId}/documents/${templateId}`;
export function defineAdvanceState({template,activeIndex,values}){const current=template.sections[activeIndex],atLast=activeIndex>=template.sections.length-1,required=template.sections.flatMap(section=>section.fields.filter(field=>field.required!==false).map(field=>({...field,sectionTitle:section.title}))),missingDetails=required.filter(field=>Array.isArray(values[field.id])?!values[field.id].length:!String(values[field.id]||'').replace(/<[^>]*>/g,'').trim()).map(field=>({field:field.label,section:field.sectionTitle})),next=atLast?nextDmaicArtifact(template.id):null,populated=required.length-missingDetails.length;return{missing:missingDetails.map(item=>item.field),missingDetails,completion:required.length?Math.round(populated/required.length*100):100,atLast,next,label:atLast?(next?next.sequenceLabel:'DMAIC sequence complete'):(template.sections[activeIndex+1]?.title||'Continue'),current}}

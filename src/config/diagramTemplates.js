import CTQTreeDiagram from '../components/CTQTreeDiagram';
import WBSTreeDiagram from '../components/WBSTreeDiagram';

// Templates whose data is better read as a rendered diagram than a raw data-entry grid. Each
// entry's selector must match the root class the renderer outputs, since exportPdf/print target
// that element instead of the whole editing workspace. Add future diagram-shaped documents here
// rather than re-forking the isCTQ-only special case this replaced. Centralized here (rather than
// left local to DocumentWorkspace) so both the per-document print/export pipeline and the
// project-level Print All / Save to File pipeline resolve a document's diagram the same way,
// directly callable by either without one importing internals of the other.
export const DIAGRAM_TEMPLATES={
  'ctq-tree':{selector:'.ctq-diagram',label:'CTQ Tree',orientation:'l',pageWidth:277,pageHeight:190,render:(record,project)=><CTQTreeDiagram branches={record.values.ctqTree} projectName={project.name}/>},
  wbs:{selector:'.wbs-diagram',label:'WBS',orientation:'l',pageWidth:277,pageHeight:190,render:(record,project)=><WBSTreeDiagram rows={record.values.wbsRows} projectName={project.name}/>},
};

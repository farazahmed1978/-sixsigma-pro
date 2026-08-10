export const PRINT_MODES={ENTIRE:'entire',SELECTED:'selected'};

export const allPrintArtifactIds=reportModel=>reportModel.items.map(item=>item.id);

export const selectedPrintItems=(reportModel,mode,selectedIds=[])=>{
 const allowed=new Set(mode===PRINT_MODES.ENTIRE?allPrintArtifactIds(reportModel):selectedIds);
 return reportModel.items.filter(item=>allowed.has(item.id));
};

export const createPrintModel=(reportModel,mode,selectedIds=[])=>{
 const items=selectedPrintItems(reportModel,mode,selectedIds);
 return{items,sections:reportModel.sections.map(section=>({...section,items:section.items.filter(item=>items.some(selected=>selected.id===item.id))})),diagnostics:reportModel.diagnostics};
};

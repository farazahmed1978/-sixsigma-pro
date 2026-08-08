const KEY='axentra_analysis_handoff';
export const createAnalysisHandoff=payload=>{const handoff={schemaVersion:1,id:`handoff-${Date.now()}`,createdAt:new Date().toISOString(),status:'ready',datasetId:'',datasetVersion:1,selectedColumns:[],response:'',factors:[],groups:[],metadata:{},...payload};sessionStorage.setItem(KEY,JSON.stringify(handoff));return handoff};
export const getAnalysisHandoff=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{return null}};
export const clearAnalysisHandoff=()=>sessionStorage.removeItem(KEY);
export const consumeAnalysisHandoff=destination=>{const handoff=getAnalysisHandoff();if(!handoff||(destination&&handoff.destination!==destination))return null;sessionStorage.setItem(KEY,JSON.stringify({...handoff,status:'consumed',consumedAt:new Date().toISOString()}));return handoff};

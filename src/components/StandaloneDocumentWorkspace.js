import React,{useCallback,useEffect,useMemo,useRef,useState}from'react';
import DocumentWorkspace from './DocumentWorkspace';
import{documentIdFor}from'../utils/documentModel';
import{documentRepository}from'../repositories/documentRepository';

export const standaloneRecordFromRow=row=>({...row.content,id:row.id,projectId:'',organizationId:row.organization_id,createdBy:row.created_by,createdAt:row.created_at||row.content?.createdAt,updatedAt:row.updated_at||row.content?.updatedAt,artifactContext:{...row.content?.artifactContext,mode:'standalone',projectId:'',instanceId:row.id}});
export const standaloneRowFromRecord=(record,{organizationId,userId})=>({id:record.id,project_id:null,organization_id:organizationId,created_by:userId,status:record.status||'draft',methodology:record.methodology||'lean-six-sigma',lifecycle_phase:record.phase||null,dmaic_phase:record.phase||null,title:record.title,content:{...record,projectId:'',organizationId,createdBy:userId,artifactContext:{...record.artifactContext,mode:'standalone',projectId:'',instanceId:record.id}},updated_at:new Date().toISOString()});

export default function StandaloneDocumentWorkspace({template,instanceId}){
 const[record,setRecord]=useState(null),[loadError,setLoadError]=useState(''),[reloadKey,setReloadKey]=useState(0);const recordRef=useRef(null);
 useEffect(()=>{let active=true;setRecord(null);setLoadError('');documentRepository.getStandalone(instanceId).then(row=>{if(active){const next=standaloneRecordFromRow(row);recordRef.current=next;setRecord(next)}}).catch(error=>{if(active)setLoadError(error.message||'Standalone artifact could not be loaded.')});return()=>{active=false}},[instanceId,reloadKey]);
 const updateProject=useCallback(async(_id,updates)=>{const documents=updates.documents||{},next=documents[instanceId]||Object.values(documents).find(item=>item?.id===instanceId)||recordRef.current;if(!next)throw new Error('Standalone document save payload is missing.');const ownership={organizationId:recordRef.current?.organizationId,userId:recordRef.current?.createdBy},saved=standaloneRecordFromRow(await documentRepository.updateStandalone(standaloneRowFromRecord(next,ownership)));recordRef.current=saved;setRecord(saved);return saved},[instanceId]);
 const project=useMemo(()=>record?{id:`standalone:${instanceId}`,name:'Standalone artifact',documents:{[documentIdFor(template.id)]:record,[record.id]:record},sharedFields:{},activityLog:[],artifacts:[],evidenceLibrary:[]}:null,[instanceId,record,template.id]);
 if(loadError)return <div className="templates-not-found"><h1>Standalone artifact could not be loaded</h1><p>{loadError}</p><button className="btn-primary" onClick={()=>setReloadKey(value=>value+1)}>Retry</button></div>;
 if(!project)return <div className="document-launcher"><div className="document-launcher-card"><h1>Loading standalone artifact…</h1></div></div>;
 return <DocumentWorkspace key={instanceId} template={template} project={project} updateProject={updateProject} standalone/>;
}

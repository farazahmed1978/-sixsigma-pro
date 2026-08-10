import React,{useState} from 'react';
import {useProjectPlacement} from '../context/ProjectPlacementContext';

export default function ProjectPlacementAction({draft,prepare,className='btn-primary no-print',children}){
 const placement=useProjectPlacement(),[busy,setBusy]=useState(false),[artifactId,setArtifactId]=useState(draft?.artifactId||'');const existing=artifactId?placement.primaryPlacementFor(artifactId,draft?.projectId):null;
 const open=async()=>{setBusy(true);try{const prepared=prepare?await prepare():draft,result=await placement.requestPlacement({...prepared,artifactId:existing?.artifactId||prepared?.artifactId});if(result)setArtifactId(result.artifactId)}finally{setBusy(false)}};
 return <button type="button" className={className} disabled={busy} onClick={open}>{busy?'Preparing…':existing?'Manage Placement':children||'Add to Project'}</button>;
}

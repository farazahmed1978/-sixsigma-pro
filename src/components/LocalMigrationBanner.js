import React,{useState}from'react';import{useAuth}from'../context/AuthContext';import{projectRepository}from'../repositories/projectRepository';import'./LocalMigrationBanner.css';

const productionMessage='Cloud import could not be completed. Your local projects are safe. Please try again.';

export default function LocalMigrationBanner(){
 const{user,profile,refreshProfile}=useAuth();
 const projects=projectRepository.listLocal();
 const[key,setKey]=useState(()=>localStorage.getItem('axentra_local_import_complete')||'');
 const[status,setStatus]=useState('');
 const[message,setMessage]=useState('');
 if(!user||!projects.length||key)return null;
 const migrate=async()=>{
  setStatus('syncing');setMessage('');
  try{
   const currentProfile=profile||await refreshProfile(user);
   const organizationId=currentProfile?.default_organization_id;
   if(!organizationId)throw new Error('missing-default-organization');
   await projectRepository.importLocal({organizationId,userId:user.id,projects});
   localStorage.setItem('axentra_local_import_complete',new Date().toISOString());
   setKey('complete');setStatus('complete');
  }catch(error){
   if(process.env.NODE_ENV==='development')console.error('Aureqin local project import failed',{error,profileId:profile?.id,userId:user.id,projectCount:projects.length});
   setMessage(error?.message==='missing-default-organization'?'Your account workspace is not provisioned yet. Apply the latest Supabase migrations, then refresh and retry.':productionMessage);
   setStatus('failed');
  }
 };
 return <div className="migration-banner"><div><strong>Import local projects into your Aureqin account?</strong><span>Your local backup will remain unchanged. Retrying will not create duplicates.</span></div><button disabled={status==='syncing'} onClick={migrate}>{status==='syncing'?'Cloud sync in progress…':'Import projects'}</button>{status==='failed'&&<em>{message}</em>}</div>;
}

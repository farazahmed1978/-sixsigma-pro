import React,{act}from'react';
import{createRoot}from'react-dom/client';
import{AuthProvider,useAuth}from'./AuthContext';
import{supabase}from'../lib/supabase';

jest.mock('../lib/supabase',()=>{const mockSupabase={__profileRequests:0,__unsubscribeCalls:0,from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{mockSupabase.__profileRequests++;return{data:{id:'user-1',full_name:'Test User',default_organization_id:'org-1'},error:null}}})})}),auth:{getSession:async()=>({data:{session:{access_token:'token',user:{id:'user-1',email:'test@example.com'}}}}),onAuthStateChange:callback=>{mockSupabase.__listener=callback;return{data:{subscription:{unsubscribe:()=>{mockSupabase.__unsubscribeCalls++}}}}}}};return{isSupabaseConfigured:true,supabase:mockSupabase}});

function Probe(){const{profile}=useAuth();return <span>{profile?.full_name||'loading'}</span>}

test('loads one profile, ignores 30 seconds idle plus token refresh, and cleans up the auth listener',async()=>{
 jest.useFakeTimers();global.IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement('div'),root=createRoot(host);
 await act(async()=>{root.render(<AuthProvider><Probe/></AuthProvider>)});
 await act(async()=>{await Promise.resolve();jest.runAllTicks();await Promise.resolve()});
 expect(supabase.__profileRequests).toBe(1);
 await act(async()=>{jest.advanceTimersByTime(30000);supabase.__listener('TOKEN_REFRESHED',{access_token:'new-token',user:{id:'user-1',email:'test@example.com'}});await Promise.resolve()});
 expect(supabase.__profileRequests).toBe(1);
 await act(async()=>root.unmount());
 expect(supabase.__unsubscribeCalls).toBe(1);
 jest.useRealTimers();
});

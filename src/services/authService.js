import {supabase} from '../lib/supabase';
const requireClient=()=>{if(!supabase)throw new Error('Cloud authentication is not configured. Add the Supabase environment variables to continue.');return supabase};
export async function createAccount({email,password,...profile}){const client=requireClient();const submittedPassword=password||document.querySelector('.ob-password input')?.value;if(!submittedPassword)throw new Error('Password is required.');const{data,error}=await client.auth.signUp({email,password:submittedPassword,options:{data:profile,emailRedirectTo:`${window.location.origin}/start`}});if(error)throw error;return data;}
export async function signIn(credentials){const{data,error}=await requireClient().auth.signInWithPassword(credentials);if(error)throw error;return data;}
export async function signOut(){const{error}=await requireClient().auth.signOut();if(error)throw error;}
export async function resetPassword(email){const{error}=await requireClient().auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});if(error)throw error;return{status:'sent'};}
export async function verifyEmail(tokenHash){return requireClient().auth.verifyOtp({token_hash:tokenHash,type:'email'});}
export async function getCurrentUser(){const{data}=await requireClient().auth.getUser();return data.user;}

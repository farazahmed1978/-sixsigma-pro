import{supabase}from'../lib/supabase';
const unavailable={status:'not-configured',message:'Billing is not configured yet.'};
async function request(path,options={}){if(!supabase)return unavailable;const{data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)throw new Error('Sign in to manage billing.');const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...options.headers}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'The billing request could not be completed.');return body}
export async function createCheckoutSession({suiteKey,planCode='individual-one-suite-founding'}={}){return request('/api/billing/create-checkout-session',{method:'POST',body:JSON.stringify({suiteKey,planCode})})}
export async function createCustomerPortalSession(){return request('/api/billing/create-portal-session',{method:'POST',body:JSON.stringify({})})}
export async function startSuiteTrial({suiteKey}){return request('/api/billing/start-suite-trial',{method:'POST',body:JSON.stringify({suiteKey})})}
export async function startTrial({planId,suiteId}={}){return{status:'selection-recorded',planId,suiteId}}
export async function getSubscriptionStatus(){if(!supabase)return unavailable;return request('/api/billing/subscription-status')}
export const getBillingStatus=getSubscriptionStatus;
export const manageSubscription=createCustomerPortalSession;
export async function refreshSubscription(){return getSubscriptionStatus()}
export const redirectToBillingUrl=result=>{if(result?.url){window.location.assign(result.url);return result}throw new Error(result?.message||'No active billing account found.')};

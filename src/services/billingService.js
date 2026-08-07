import {supabase} from '../lib/supabase';
const unavailable={status:'not-configured',message:'Billing activation is not enabled.'};
export async function createCheckoutSession(){return unavailable;}
export async function createCustomerPortalSession(){return unavailable;}
export async function startTrial({planId}){if(!supabase)return unavailable;return{status:'selection-recorded',planId};}
export async function getSubscriptionStatus(){if(!supabase)return unavailable;const{data,error}=await supabase.from('subscriptions').select('*').maybeSingle();if(error)return{status:'unavailable'};return data||{status:'none'};}
export const getBillingStatus=getSubscriptionStatus;
export const manageSubscription=createCustomerPortalSession;
export async function refreshSubscription(){return getSubscriptionStatus();}

const Stripe=require('stripe');
const{createClient}=require('@supabase/supabase-js');

const required=name=>{const value=process.env[name];if(!value)throw new Error(`server-config-missing:${name}`);return value};
const admin=()=>createClient(required('REACT_APP_SUPABASE_URL'),required('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const stripe=()=>new Stripe(required('STRIPE_SECRET_KEY'));
const json=(res,status,body)=>res.status(status).json(body);
const safeError=(res,error)=>{console.error('Aureqin billing server error',{message:error?.message,code:error?.code,type:error?.type});const configuration=/server-config-missing/.test(error?.message||'');return json(res,configuration?503:400,{error:configuration?'Billing is not configured for this environment.':'The billing request could not be completed.'})};
const bearer=req=>(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
async function authContext(req){
 const token=bearer(req);if(!token)throw new Error('authentication-required');
 const db=admin();const{data:{user},error}=await db.auth.getUser(token);if(error||!user)throw new Error('authentication-required');
 const{data:profile,error:profileError}=await db.from('profiles').select('default_organization_id').eq('id',user.id).single();
 if(profileError||!profile?.default_organization_id)throw new Error('organization-required');
 const{data:membership,error:membershipError}=await db.from('organization_memberships').select('role,status').eq('organization_id',profile.default_organization_id).eq('user_id',user.id).eq('status','active').single();
 if(membershipError||!membership)throw new Error('organization-membership-required');
 return{db,user,organizationId:profile.default_organization_id,role:membership.role};
}
const epoch=value=>value?new Date(value*1000).toISOString():null;
const effectiveSubscriptionAccess=subscription=>{
 if(!subscription)return false;
 if(['active','trialing','past_due'].includes(subscription.status))return true;
 return subscription.status==='canceled'&&subscription.current_period_end&&new Date(subscription.current_period_end)>new Date();
};
module.exports={admin,stripe,json,safeError,authContext,epoch,effectiveSubscriptionAccess,required};

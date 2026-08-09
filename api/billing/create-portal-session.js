const{authContext,stripe,json,safeError}=require('../_lib/server');
module.exports=async(req,res)=>{if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});try{
 const{db,organizationId,role}=await authContext(req);if(!['owner','admin'].includes(role))return json(res,403,{error:'Organization billing requires an owner or administrator.'});const{data:subscription,error}=await db.from('subscriptions').select('stripe_customer_id,provider_customer_id').eq('organization_id',organizationId).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;
 if(!subscription)return json(res,404,{error:'No active billing account found.'});const customer=subscription.stripe_customer_id||subscription.provider_customer_id;if(!customer)return json(res,404,{error:'No active billing account found.'});
 const origin=req.headers.origin||`https://${req.headers.host}`;const session=await stripe().billingPortal.sessions.create({customer,return_url:req.body?.returnUrl||`${origin}/account/billing`});return json(res,200,{url:session.url});
}catch(error){return safeError(res,error)}};

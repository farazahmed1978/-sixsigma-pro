const{authContext,stripe,json,safeError}=require('../_lib/server');
module.exports=async(req,res)=>{if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});try{
 const{db,user,organizationId,role}=await authContext(req);if(!['owner','admin'].includes(role))return json(res,403,{error:'Organization billing requires an owner or administrator.'});const{suiteKey,planCode='individual-one-suite-founding',successUrl,cancelUrl}=req.body||{};
 const{data:suite}=await db.from('suites').select('id,status').eq('id',suiteKey).single();if(!suite||suite.status!=='active')return json(res,400,{error:'This suite is not available for purchase.'});
 const{data:plan,error:planError}=await db.from('subscription_plans').select('id,code,active').eq('code',planCode).eq('active',true).single();if(planError)throw planError;
 const{data:price,error:priceError}=await db.from('subscription_prices').select('id,stripe_price_id,provider_price_id,unit_amount,currency').eq('plan_id',plan.id).eq('active',true).eq('status','active').order('is_founding',{ascending:false}).limit(1).single();if(priceError)throw priceError;
 const stripePriceId=price.stripe_price_id||price.provider_price_id;if(!stripePriceId)return json(res,503,{error:'The Stripe price has not been configured yet.'});
 const{data:existing}=await db.from('subscriptions').select('stripe_customer_id,provider_customer_id').eq('organization_id',organizationId).not('status','eq','incomplete_expired').order('created_at',{ascending:false}).limit(1).maybeSingle();
 const client=stripe();let customerId=existing?.stripe_customer_id||existing?.provider_customer_id;
 if(!customerId){const customer=await client.customers.create({email:user.email,metadata:{organization_id:organizationId,user_id:user.id}});customerId=customer.id}
 const origin=req.headers.origin||`https://${req.headers.host}`;
 const session=await client.checkout.sessions.create({mode:'subscription',customer:customerId,line_items:[{price:stripePriceId,quantity:1}],success_url:successUrl||`${origin}/account/billing?checkout=success`,cancel_url:cancelUrl||`${origin}/suites/${suiteKey}?checkout=canceled`,allow_promotion_codes:true,client_reference_id:organizationId,metadata:{organization_id:organizationId,user_id:user.id,suite_key:suiteKey,plan_id:plan.id,price_id:price.id},subscription_data:{metadata:{organization_id:organizationId,suite_key:suiteKey,plan_id:plan.id,price_id:price.id}}});
 return json(res,200,{url:session.url,id:session.id});
}catch(error){return safeError(res,error)}};

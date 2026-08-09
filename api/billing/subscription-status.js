const{authContext,json,safeError,effectiveSubscriptionAccess}=require('../_lib/server');
module.exports=async(req,res)=>{if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});try{
 const{db,organizationId}=await authContext(req);const now=new Date().toISOString();
 const[{data:subscriptions,error:subscriptionError},{data:entitlements,error:entitlementError},{data:trials,error:trialError},{data:allowances,error:allowanceError}]=await Promise.all([
  db.from('subscriptions').select('*,subscription_plans(code,name,plan_type,audience),subscription_prices!subscriptions_price_id_fkey(unit_amount,currency,billing_interval,is_founding)').eq('organization_id',organizationId).order('created_at',{ascending:false}),
  db.from('suite_entitlements').select('suite_id,status,source,starts_at,ends_at,metadata').eq('organization_id',organizationId),
  db.from('suite_trials').select('suite_id,status,started_at,ends_at,source').eq('organization_id',organizationId).order('created_at',{ascending:false}),
  db.from('usage_allowances').select('allowance_type,period_start,period_end,allowance_amount,consumed_amount,soft_limit,warning_threshold,status').eq('organization_id',organizationId).lte('period_start',now).gte('period_end',now)
 ]);if(subscriptionError||entitlementError||trialError||allowanceError)throw subscriptionError||entitlementError||trialError||allowanceError;
 const effectiveEntitlements=(entitlements||[]).map(item=>({...item,effective_status:item.ends_at&&new Date(item.ends_at)<=new Date()&&['active','trial'].includes(item.status)?'expired':item.status,days_remaining:item.status==='trial'&&item.ends_at?Math.max(0,Math.ceil((new Date(item.ends_at)-new Date())/86400000)):null}));
 const current=(subscriptions||[]).find(effectiveSubscriptionAccess)||(subscriptions||[])[0]||null;
 return json(res,200,{organization_id:organizationId,current,subscriptions:subscriptions||[],entitlements:effectiveEntitlements,trials:trials||[],allowances:(allowances||[]).map(item=>({...item,usage_percentage:item.allowance_amount?Math.min(100,Math.round(item.consumed_amount/item.allowance_amount*100)):0}))});
}catch(error){return safeError(res,error)}};

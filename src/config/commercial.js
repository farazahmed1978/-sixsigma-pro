export const COMMERCIAL_CATALOG={
 products:[
  {id:'professional-suite',key:'aureqin-professional-suite',name:'Aureqin Professional Suite',type:'suite',active:true},
  {id:'aureqin-ai',key:'aureqin-ai',name:'Aureqin AI',type:'addon',active:false,availability:'future'}
 ],
 plans:[
  {id:'founding-individual-one-suite',key:'individual-one-suite-founding',productId:'professional-suite',name:'Aureqin Individual — Founding',audience:'individual',planType:'suite',includedSuiteCount:1,seatAllowance:1,storageAllowance:null,aiAllowance:0,trialDays:14,grandfatherable:true},
  {id:'standard-individual-one-suite',key:'individual-one-suite-standard',productId:'professional-suite',name:'Aureqin Individual',audience:'individual',planType:'suite',includedSuiteCount:1,seatAllowance:1,storageAllowance:null,aiAllowance:0,trialDays:14,grandfatherable:false},
  {id:'ai-value-future',key:'ai-value-future',productId:'aureqin-ai',name:'Aureqin AI Value',audience:'individual',planType:'addon',includedSuiteCount:0,aiAllowance:'configurable',active:false}
 ],
 prices:[
  {id:'founding-monthly-usd',planId:'founding-individual-one-suite',currency:'USD',unitAmount:999,interval:'month',kind:'founding',grandfatherBehavior:'while_continuously_subscribed'},
  {id:'standard-monthly-usd',planId:'standard-individual-one-suite',currency:'USD',unitAmount:1999,interval:'month',kind:'regular'},
  {id:'ai-future-monthly-usd',planId:'ai-value-future',currency:'USD',unitAmount:1999,interval:'month',kind:'future-starting-price'}
 ],
 usageThresholds:{normalBelow:80,warningBelow:100,limitReached:100},
 suiteTrial:{defaultDays:14,repeatAllowed:false,eligibleSuiteStatuses:['active']}
};

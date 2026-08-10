import {chiSquareCDF,invNorm,normCDF} from './statMath';

export const DISTRIBUTION_ENGINE_VERSION='1.0.0';
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const variance=values=>{const center=mean(values);return values.reduce((sum,value)=>sum+(value-center)**2,0)/(values.length-1)};
const finiteValues=values=>{if(!Array.isArray(values)||values.length<3||values.some(value=>!Number.isFinite(value)))throw new Error('Distribution analysis requires at least three finite observations after explicit missing-data handling.');return values};
const ordered=values=>[...values].sort((a,b)=>a-b);
const ksStatistic=(values,cdf)=>{const data=ordered(values),n=data.length;return Math.max(...data.flatMap((value,index)=>[Math.abs(cdf(value)-(index+1)/n),Math.abs(cdf(value)-index/n)]))};
const probabilityPlot=(values,quantile)=>ordered(values).map((value,index)=>{const probability=(index+.375)/(values.length+.25);return{observed:value,probability,theoretical:quantile(probability)}});
const digamma=value=>{let x=value,result=0;while(x<8){result-=1/x;x++}const inv=1/x,inv2=inv*inv;return result+Math.log(x)-.5*inv-inv2*(1/12-inv2*(1/120-inv2/252))};
const trigamma=value=>{let x=value,result=0;while(x<8){result+=1/(x*x);x++}const inv=1/x,inv2=inv*inv;return result+inv+.5*inv2+inv2*inv*(1/6-inv2/30+inv2*inv2/42)};
const logGamma=value=>{const coefficients=[.9999999999998099,676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.50734327868691,-.1385710952657201,9.984369578019572e-6,1.505632735149312e-7];if(value<.5)return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*value))-logGamma(1-value);let x=coefficients[0],z=value-1;for(let i=1;i<coefficients.length;i++)x+=coefficients[i]/(z+i);const t=z+7.5;return.5*Math.log(2*Math.PI)+(z+.5)*Math.log(t)-t+Math.log(x)};
const gammaCdf=(value,shape,scale)=>value<=0?0:chiSquareCDF(2*value/scale,2*shape);
const gammaQuantile=(p,shape,scale)=>{let low=0,high=shape*scale+10*Math.sqrt(shape)*scale;for(let i=0;i<100;i++){const mid=(low+high)/2;if(gammaCdf(mid,shape,scale)<p)low=mid;else high=mid}return(low+high)/2};
const fitResult=(name,parameters,logLikelihood,cdf,plot,parameterCount,caveats=[])=>({name,parameters,logLikelihood,aic:2*parameterCount-2*logLikelihood,cdf,probabilityPlot:plot,caveats});

function normalFit(values){
 const mu=mean(values),sigma=Math.sqrt(values.reduce((sum,value)=>sum+(value-mu)**2,0)/values.length);
 if(!(sigma>0))throw new Error('Distribution fitting is undefined for zero-variance data.');
 const logLikelihood=-values.length*Math.log(sigma*Math.sqrt(2*Math.PI))-values.reduce((sum,value)=>sum+(value-mu)**2,0)/(2*sigma*sigma),cdf=value=>normCDF((value-mu)/sigma);
 return fitResult('Normal',{mean:mu,standardDeviation:sigma},logLikelihood,cdf,probabilityPlot(values,p=>mu+sigma*invNorm(p)),2,['Goodness-of-fit evidence supplements rather than replaces process knowledge and probability-plot review.']);
}
function lognormalFit(values){
 if(values.some(value=>value<=0))return null;
 const logs=values.map(Math.log),mu=mean(logs),sigma=Math.sqrt(logs.reduce((sum,value)=>sum+(value-mu)**2,0)/values.length),logLikelihood=-values.reduce((sum,value)=>sum+Math.log(value),0)-values.length*Math.log(sigma*Math.sqrt(2*Math.PI))-logs.reduce((sum,value)=>sum+(value-mu)**2,0)/(2*sigma*sigma),cdf=value=>value<=0?0:normCDF((Math.log(value)-mu)/sigma);
 return fitResult('Lognormal',{logMean:mu,logStandardDeviation:sigma,median:Math.exp(mu)},logLikelihood,cdf,probabilityPlot(values,p=>Math.exp(mu+sigma*invNorm(p))),2,['Lognormal fitting requires strictly positive observations.']);
}
function exponentialFit(values){
 if(values.some(value=>value<0))return null;const scale=mean(values);if(!(scale>0))return null;
 const logLikelihood=-values.length*Math.log(scale)-values.reduce((sum,value)=>sum+value,0)/scale,cdf=value=>value<0?0:1-Math.exp(-value/scale);
 return fitResult('Exponential',{rate:1/scale,scale},logLikelihood,cdf,probabilityPlot(values,p=>-scale*Math.log(1-p)),1,['The one-parameter exponential model assumes a constant event rate and a zero location.']);
}
function weibullFit(values){
 if(values.some(value=>value<=0))return null;
 const logs=values.map(Math.log),logMean=mean(logs),cv=Math.sqrt(variance(values))/mean(values);let shape=Math.max(.2,Math.min(20,cv>0?cv**(-1.086):1));
 for(let iteration=0;iteration<100;iteration++){const currentShape=shape,powers=values.map(value=>value**currentShape),sumP=powers.reduce((a,b)=>a+b,0),sumPL=powers.reduce((sum,value,index)=>sum+value*logs[index],0),sumPL2=powers.reduce((sum,value,index)=>sum+value*logs[index]**2,0),f=1/currentShape+logMean-sumPL/sumP,derivative=-1/(currentShape*currentShape)-(sumPL2*sumP-sumPL*sumPL)/(sumP*sumP),next=currentShape-f/derivative;if(!Number.isFinite(next)||next<=0)break;if(Math.abs(next-currentShape)<1e-9){shape=next;break}shape=next}
 const scale=(values.reduce((sum,value)=>sum+value**shape,0)/values.length)**(1/shape),logLikelihood=values.length*Math.log(shape)-values.length*shape*Math.log(scale)+(shape-1)*logs.reduce((a,b)=>a+b,0)-values.reduce((sum,value)=>sum+(value/scale)**shape,0),cdf=value=>value<=0?0:1-Math.exp(-((value/scale)**shape));
 return fitResult('Weibull',{shape,scale},logLikelihood,cdf,probabilityPlot(values,p=>scale*(-Math.log(1-p))**(1/shape)),2,['Weibull fitting requires strictly positive observations and no censoring in this workflow.']);
}
function gammaFit(values){
 if(values.some(value=>value<=0))return null;
 const m=mean(values),logMean=mean(values.map(Math.log)),target=Math.log(m)-logMean;let shape=Math.max(.1,(3-target+Math.sqrt((target-3)**2+24*target))/(12*target));
 for(let iteration=0;iteration<100;iteration++){const f=Math.log(shape)-digamma(shape)-target,derivative=1/shape-trigamma(shape),next=shape-f/derivative;if(!Number.isFinite(next)||next<=0)break;if(Math.abs(next-shape)<1e-9){shape=next;break}shape=next}
 const scale=m/shape,logLikelihood=(shape-1)*values.map(Math.log).reduce((a,b)=>a+b,0)-values.reduce((a,b)=>a+b,0)/scale-values.length*(logGamma(shape)+shape*Math.log(scale)),cdf=value=>gammaCdf(value,shape,scale);
 return fitResult('Gamma',{shape,scale},logLikelihood,cdf,probabilityPlot(values,p=>gammaQuantile(p,shape,scale)),2,['Gamma fitting requires strictly positive observations.']);
}

export function fitDistributions(input){
 const values=finiteValues(input.values),requested=input.candidates||['normal','lognormal','weibull','exponential','gamma'],factories={normal:normalFit,lognormal:lognormalFit,weibull:weibullFit,exponential:exponentialFit,gamma:gammaFit};
 const fits=requested.map(name=>factories[name]?.(values)).filter(Boolean).map(fit=>{const ks=ksStatistic(values,fit.cdf),parameters=Object.keys(fit.parameters).length,bic=Math.log(values.length)*parameters-2*fit.logLikelihood;return{...fit,cdf:undefined,ksStatistic:ks,bic,comparison:{aic:fit.aic,bic,ksStatistic:ks}}}).sort((a,b)=>a.aic-b.aic);
 return{method:'candidate-distribution-fit',methodVersion:DISTRIBUTION_ENGINE_VERSION,n:values.length,fits,recommended:fits[0]?.name||null,selectionBasis:'Lowest AIC among eligible fitted candidates, reviewed alongside BIC, K-S distance, probability plot, process knowledge, and caveats.',warnings:['K-S distances are descriptive because parameters were estimated from the same data; unadjusted K-S p-values are intentionally not reported.','A lower comparison metric does not prove the selected distribution is true.']};
}

export function boxCoxTransform(input){
 const values=finiteValues(input.values);if(values.some(value=>value<=0))throw new Error('Box-Cox requires strictly positive observations. Source data was not changed.');let best=null;
 for(let lambda=-2;lambda<=2.0001;lambda+=.05){const transformed=values.map(value=>Math.abs(lambda)<1e-10?Math.log(value):(value**lambda-1)/lambda),mu=mean(transformed),sigma2=transformed.reduce((sum,value)=>sum+(value-mu)**2,0)/values.length;if(!(sigma2>0))continue;const logLikelihood=-values.length/2*Math.log(sigma2)+(lambda-1)*values.map(Math.log).reduce((a,b)=>a+b,0);if(!best||logLikelihood>best.logLikelihood)best={lambda:Number(lambda.toFixed(2)),logLikelihood,transformed}}
 return{method:'box-cox-grid-profile',methodVersion:DISTRIBUTION_ENGINE_VERSION,lambda:best.lambda,transformed:best.transformed,sourceValues:[...values],provenance:{operation:'box-cox',parameters:{lambda:best.lambda},sourcePreserved:true},warnings:['Lambda is selected by a finite profile-likelihood grid and is currently UNVALIDATED against an independent executable oracle.','Interpret transformed-scale models carefully; inverse interpretation is nonlinear.']};
}

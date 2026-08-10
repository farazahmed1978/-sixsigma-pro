import {ANALYTICS_CATALOG} from '../config/analyticsCatalog';
import {analyzeFactorial,generateFractionalFactorial,generateFullFactorial,optimizeFactorial,recordConfirmationRun} from './doeEngine';
import {boxCoxTransform,fitDistributions} from './distributionEngine';
import {categoricalAssociation,correlation,goodnessOfFit,independentMeans,kruskalWallis,mannWhitney,oneProportion,oneSampleMean,oneVariance,pairedMean,signTest,twoProportions,twoVariances} from './inferenceEngine';
import {buildDesignMatrix,fitLinearModel,fitLogisticModel} from './modelEngine';
import {tukeyHsd} from './statTests';

describe('Wave 3 inference engine',()=>{
 test('mean inference covers one-sample, paired, Welch, and pooled paths',()=>{
  expect(oneSampleMean({values:[50,48,44,56,61,52,53,55,67,51],mu0:50}).statistic).toBeCloseTo(1.782,3);
  expect(pairedMean({a:[10,12,9,11,13],b:[8,10,8,9,10]}).meanDifference).toBeCloseTo(2);
  expect(independentMeans({a:[1,2,3,4,5],b:[2,4,6,8]}).varianceModel).toContain('Welch');
  expect(independentMeans({a:[1,2,3,4],b:[2,3,4,5],pooled:true}).df).toBe(6);
 });
 test('mean inference rejects missing, zero variance, and paired mismatch',()=>{
  expect(()=>oneSampleMean({values:[1,NaN,3]})).toThrow(/missing|nonnumeric/i);
  expect(()=>oneSampleMean({values:[2,2,2]})).toThrow(/zero-variance/i);
  expect(()=>pairedMean({a:[1,2],b:[1]})).toThrow(/same number/i);
 });
 test('proportion workflow selects exact inference for sparse cases',()=>{
  const one=oneProportion({successes:1,trials:8,p0:.5}),two=twoProportions({x1:1,n1:10,x2:8,n2:10});
  expect(one.method).toBe('exact-binomial');expect(one.confidenceInterval[0]).toBeGreaterThanOrEqual(0);
  expect(two.method).toBe('fisher-exact');expect(two.pValue).toBeLessThan(.01);
 });
 test('variance workflows expose normality sensitivity',()=>{
  expect(oneVariance({values:[1,2,3,4,5]}).varianceConfidenceInterval[0]).toBeGreaterThan(0);
  expect(twoVariances({a:[1,2,3,4],b:[2,4,6,8]}).warnings[0]).toMatch(/not robust/i);
 });
 test('categorical analysis reports residual contributors and sparse warnings',()=>{
  const association=categoricalAssociation({table:[[1,9],[8,2]]});
  expect(association.method).toBe('fisher-exact-with-chi-square-context');expect(association.cramersV).toBeGreaterThan(.5);
  expect(goodnessOfFit({observed:[20,30,50],expected:[1,1,1]}).df).toBe(2);
 });
 test('nonparametric methods handle ties and post-hoc paths',()=>{
  expect(mannWhitney({a:[1,2,2,3],b:[5,6,7,8]}).ties).toBe(1);
  expect(signTest({a:[2,3,4,5],b:[1,2,3,4]}).pValue).toBeCloseTo(.125);
  expect(kruskalWallis({groups:[[1,2,3],[5,6,7],[9,10,11]],labels:['A','B','C']}).postHoc.pairs).toHaveLength(3);
  expect(correlation({x:[1,2,3,4,5],y:[2,4,6,8,10]}).coefficient).toBeCloseTo(1);
 });
});

describe('Wave 3 ANOVA and model depth',()=>{
 test('Tukey HSD uses studentized-range simultaneous intervals',()=>{
  const result=tukeyHsd([[1,2,3,4],[5,6,7,8],[9,10,11,12]],['A','B','C']);
  expect(result.method).toBe('tukey-hsd');expect(result.pairs).toHaveLength(3);expect(result.pairs[2].pAdjusted).toBeLessThan(.01);expect(result.pairs[2].confidenceInterval[1]).toBeLessThan(0);
 });
 test('design matrix supports categorical, interaction, and polynomial terms',()=>{
  const rows=[{y:2,x:1,g:'A'},{y:5,x:2,g:'B'},{y:4,x:3,g:'A'},{y:9,x:4,g:'B'},{y:8,x:5,g:'A'},{y:13,x:6,g:'B'}],design=buildDesignMatrix(rows,{response:'y',predictors:[{name:'x'},{name:'g',type:'categorical'}],interactions:[['x','g']],polynomialTerms:[{name:'x',degree:2}]});
  expect(design.coefficientNames).toEqual(['Intercept','x','g[B]','x^2','x:g[B]']);
 });
 test('linear model exposes intervals, influence, VIF, AIC and BIC',()=>{
  const rows=Array.from({length:12},(_,i)=>({y:3+2*i+(i%3-.5),x:i,z:i%3})),model=fitLinearModel({rows,specification:{response:'y',predictors:['x','z']}});
  expect(model.coefficients[1].confidenceInterval).toHaveLength(2);expect(model.leverage).toHaveLength(12);expect(model.vif).toHaveLength(2);expect(Number.isFinite(model.aic)).toBe(true);
 });
 test('linear model rejects singular matrices and flags influential observations',()=>{
  const singular=Array.from({length:8},(_,i)=>({y:i,x:i,z:i*2}));expect(()=>fitLinearModel({rows:singular,specification:{response:'y',predictors:['x','z']}})).toThrow(/singular/i);
  const rows=Array.from({length:15},(_,i)=>({y:i===14?100:i+Math.sin(i),x:i})),model=fitLinearModel({rows,specification:{response:'y',predictors:['x']}});expect(model.influential.length).toBeGreaterThan(0);
 });
 test('logistic model reports convergence, AUC, class adequacy, and separation',()=>{
  const rows=Array.from({length:30},(_,i)=>({y:i>14?1:0,x:i+(i%4)})),model=fitLogisticModel({rows,specification:{response:'y',predictors:['x']}});
  expect(model.auc).toBeGreaterThan(.9);expect(model.confusion.tp+model.confusion.tn+model.confusion.fp+model.confusion.fn).toBe(30);expect(model.separation||model.converged).toBe(true);
 });
});

describe('Wave 3 distribution and DOE architecture',()=>{
 test('distribution candidates expose parameters, plots, and transparent comparison metrics',()=>{
  const result=fitDistributions({values:[1.1,1.4,1.9,2.2,2.9,3.1,4.4,5.2,6.8,8.1]});
  expect(result.fits.map(fit=>fit.name)).toEqual(expect.arrayContaining(['Normal','Lognormal','Weibull','Exponential','Gamma']));
  result.fits.forEach(fit=>{expect(fit.probabilityPlot).toHaveLength(10);expect(Number.isFinite(fit.aic)).toBe(true);expect(Number.isFinite(fit.ksStatistic)).toBe(true)});
 });
 test('Box-Cox preserves source values and provenance',()=>{const values=[1,2,3,5,8],result=boxCoxTransform({values});expect(result.sourceValues).toEqual(values);expect(result.provenance.sourcePreserved).toBe(true);expect(result.transformed).not.toEqual(values)});
 test('full factorial generation is reproducible and analysis recovers effects',()=>{
  const input={factors:[{name:'A',low:10,high:20},{name:'B',low:1,high:3}],replicates:2,randomSeed:42},first=generateFullFactorial(input),second=generateFullFactorial(input);expect(first.runs.map(run=>run.standardOrder)).toEqual(second.runs.map(run=>run.standardOrder));
  const completed={...first,runs:first.runs.map(run=>({...run,responses:{Y:10+3*run.factorCodes.A-2*run.factorCodes.B+run.replicate*.1}}))},analysis=analyzeFactorial(completed,'Y');expect(analysis.effects.find(effect=>effect.term==='A').effect).toBeCloseTo(6);
 });
 test('fractional factorial reports generators, resolution, and aliases',()=>{const design=generateFractionalFactorial({factors:['A','B','C','D'].map(name=>({name,low:-1,high:1})),generators:{D:['A','B','C']},randomSeed:7});expect(design.runs).toHaveLength(8);expect(design.resolution).toBe(4);expect(design.aliases.find(item=>item.term==='A').aliases).toContain('B×C×D')});
 test('optimization closes with a structured confirmation run',()=>{
  const design=generateFullFactorial({factors:[{name:'A',low:0,high:1},{name:'B',low:0,high:1}],replicates:2}),completed={...design,runs:design.runs.map(run=>({...run,responses:{Y:5+2*run.factorCodes.A+run.factorCodes.B}}))},analysis=analyzeFactorial(completed,'Y'),optimization=optimizeFactorial(completed,analysis,{type:'maximize'}),confirmed=recordConfirmationRun(completed,optimization,{observed:8.2,responseName:'Y'});expect(optimization.recommended.factorSettings).toEqual({A:1,B:1});expect(confirmed.confirmationRuns[0].deviation).toBeCloseTo(.2);
 });
 test('catalog provides one canonical metadata contract per analytical method',()=>{expect(new Set(ANALYTICS_CATALOG.map(method=>method.id)).size).toBe(ANALYTICS_CATALOG.length);ANALYTICS_CATALOG.forEach(method=>expect(method).toEqual(expect.objectContaining({family:expect.any(String),route:expect.any(String),validationStatus:expect.any(String),reportSupport:true,provenanceSupport:true})))});
});

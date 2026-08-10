import { attributeAgreement, biasStudy, crossedGageRR, linearityStudy, nestedGageRR, stabilityStudy } from './msaEngine';

const crossed=[];for(const part of ['P1','P2','P3'])for(const operator of ['A','B'])for(const trial of [-.1,.1])crossed.push({part,operator,measurement:{P1:10,P2:20,P3:30}[part]+(operator==='B'?.2:0)+trial});
const nested=[];for(const operator of ['A','B'])for(const part of operator==='A'?['A1','A2']:['B1','B2'])for(const trial of [-.1,.1])nested.push({part,operator,measurement:({A1:10,A2:12,B1:20,B2:22}[part])+trial});

describe('measurement-system engines',()=>{
 test('returns ANOVA variance components, study variation, tolerance, and ndc for balanced crossed data',()=>{const r=crossedGageRR({rows:crossed,tolerance:30});expect(r.design).toMatchObject({parts:3,operators:2,trials:2,crossed:true});expect(r.anova.map(x=>x.source)).toContain('Part × Operator');expect(r.varianceComponents.repeatability).toBeCloseTo(.02);expect(r.percentStudyVariation.gageRR).toBeGreaterThan(0);expect(r.percentTolerance.gageRR).toBeGreaterThan(0)});
 test('distinguishes nested designs and rejects shared parts',()=>{const r=nestedGageRR({rows:nested});expect(r.design.crossed).toBe(false);expect(r.anova.map(x=>x.source)).toContain('Part (Operator)');expect(()=>nestedGageRR({rows:crossed})).toThrow('only one operator')});
 test('calculates within, between, standard agreement and kappa',()=>{const rows=[];for(const item of ['1','2','3'])for(const appraiser of ['A','B'])for(let trial=0;trial<2;trial++)rows.push({item,appraiser,rating:item==='3'?'bad':'good',reference:item==='3'?'bad':'good'});const r=attributeAgreement({rows});expect(r.withinAppraiser.every(x=>x.agreement===1)).toBe(true);expect(r.overallAgreement).toBe(1);expect(r.agreementToStandard.every(x=>x.agreement===1)).toBe(true)});
 test('implements bias, linearity, and stability workflows',()=>{const bias=biasStudy({measurements:[9.9,10,10.1,10.05,9.95],reference:10});expect(bias.bias).toBeCloseTo(0);const linearity=linearityStudy({references:[1,2,3,4,5],measurements:[1.1,2.2,3.3,4.4,5.5]});expect(linearity.regression.b1).toBeCloseTo(.1);expect(stabilityStudy({measurements:[10,10.1,9.9,10,10.1,9.9,10,10]}).chart.n).toBe(8)});
 test('rejects incomplete professional study designs',()=>expect(()=>crossedGageRR({rows:crossed.slice(1)})).toThrow());
});

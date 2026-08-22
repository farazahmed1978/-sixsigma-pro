import {OE_PROFESSIONAL_CADENCE,analysisMatches,cadenceForPhase,documentRoute,tollgateRoute} from './oeProfessionalCadence';

test('Measure exposes planning and process alternatives plus explicit canonical dataset work',()=>{
 const measure=cadenceForPhase('Measure');
 expect(measure.core.filter(item=>item.choice==='measurement-planning').map(item=>item.id)).toEqual(['data-collection-plan','measurement-plan']);
 expect(measure.core).toEqual(expect.arrayContaining([expect.objectContaining({id:'project-dataset',kind:'action'}),expect.objectContaining({id:'process-map'}),expect.objectContaining({id:'swimlane-process-map'}),expect.objectContaining({id:'value-stream-map'})]));
 expect(measure.conditional.map(item=>item.id)).toEqual(expect.arrayContaining(['sampling-plan','msa-workspace','process-capability-study']));
});

test('analysis connections use real executable routes and canonical matching',()=>{
 const routes=Object.values(OE_PROFESSIONAL_CADENCE).flatMap(phase=>phase.additional).filter(item=>item.kind==='analysis').map(item=>item.route);
 expect(routes).toEqual(expect.arrayContaining(['/tool/msa','/tool/capability','/hypothesis','/tool/anova','/tool/regression','/tool/fmea','/doe','/tool/control-chart']));
 expect(analysisMatches({toolId:'capability-analysis'},['capability','process-capability'])).toBe(true);
});

test('each governed phase has a project-qualified Tollgate and Control closure is post-approval',()=>{
 ['Define','Measure','Analyze','Improve','Control'].forEach(phase=>expect(tollgateRoute('project-1',phase)).toBe(`/projects/project-1?tab=tollgates&phase=${phase}`));
 expect(cadenceForPhase('Control').core.map(item=>item.id)).not.toContain('project-closure');
 expect(cadenceForPhase('Control').postApproval).toEqual([expect.objectContaining({id:'project-closure'})]);
 expect(documentRoute('project-1','project-closure')).toBe('/projects/project-1/documents/project-closure');
});

test('Improve preserves solution and delivery alternatives and makes validation executable',()=>{
 const improve=cadenceForPhase('Improve');
 expect(improve.core.filter(item=>item.choice==='solution-selection')).toHaveLength(2);
 expect(improve.core.filter(item=>item.choice==='delivery')).toHaveLength(2);
 expect(improve.additional).toEqual(expect.arrayContaining([expect.objectContaining({id:'fmea',route:'/tool/fmea'}),expect.objectContaining({id:'doe',route:'/doe'}),expect.objectContaining({id:'validation',route:'/analysis'})]));
});

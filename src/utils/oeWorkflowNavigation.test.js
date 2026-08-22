import {analysisWorkflowContext,createOEWorkflowContext,datasetWorkflowContext,hasOEWorkflowContext,resolveOEWorkflowContext,workflowLocation} from './oeWorkflowNavigation';

const project={id:'project-55',name:'Test55',currentPhase:'Measure'};

test('transports and recovers the OE workflow contract through a refresh-safe URL',()=>{
 const context=datasetWorkflowContext(project);
 const destination=workflowLocation('/worksheet?datasetId=data-1',context);
 expect(destination.search).toContain('project=project-55');
 expect(destination.search).toContain('workflowStep=project-dataset');
 expect(resolveOEWorkflowContext({search:destination.search},project)).toMatchObject({projectId:'project-55',phase:'Measure',origin:'measure-workflow',completionTarget:'/projects/project-55/documents/process-map'});
});

test('keeps standalone destinations independent without explicit workflow context',()=>{
 expect(hasOEWorkflowContext({search:'?datasetId=data-1'})).toBe(false);
 expect(resolveOEWorkflowContext({search:'?datasetId=data-1'},project)).toBeNull();
 expect(resolveOEWorkflowContext({search:''},project,{fallback:true})).toMatchObject({projectId:'project-55',phase:'Measure'});
});

test('carries a deterministic phase return through tool analysis context',()=>{
 const context=analysisWorkflowContext(project,'Analyze','hypothesis-testing');
 const destination=workflowLocation('/tool/hypothesis-testing',context);
 expect(resolveOEWorkflowContext(destination,project)).toMatchObject({phase:'Analyze',workflowStep:'hypothesis-testing',returnTo:'/projects/project-55?phase=Analyze',completionTarget:'/projects/project-55?phase=Analyze'});
});

test('does not infer phase crossing from a generic project context',()=>{
 const context=createOEWorkflowContext({project,phase:'Measure',workflowStep:'measurement-plan',completionTarget:'/projects/project-55?phase=Measure'});
 expect(context.completionTarget).not.toContain('Analyze');
});

import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {ProjectPlacementProvider,useProjectPlacement} from './ProjectPlacementContext';

const mockUpdateAnalysis=jest.fn(),mockRegisterAnalysisResult=jest.fn(),mockAddReportItem=jest.fn(async()=> 'report-1'),mockRemoveReportItem=jest.fn(),mockCreateDatasetRecord=jest.fn();
const mockProjectlessAnalysis={id:'analysis-1t',projectId:'',toolId:'hypothesis',title:'1-Sample t-Test',phase:'Analyze',inputConfiguration:{manualInputs:{manualD1:'10, 11, 12'}},result:{t:2.4,p:.03}};
jest.mock('./AnalysisContext',()=>({useAnalysis:()=>({analysisResults:[mockProjectlessAnalysis],registerAnalysisResult:mockRegisterAnalysisResult,updateAnalysis:mockUpdateAnalysis})}));
jest.mock('./ReportContext',()=>({useReport:()=>({items:[],addReportItem:mockAddReportItem,removeReportItem:mockRemoveReportItem})}));
jest.mock('./ProjectsContext',()=>({useProjects:()=>({projects:[{id:'project-1',name:'Test',organizationId:'org-1',suiteId:'operational-excellence'}],recordActivity:jest.fn()})}));
jest.mock('./AuthContext',()=>({useAuth:()=>({user:{id:'user-1'},profile:{default_organization_id:'org-1'},configured:false})}));
jest.mock('./WorksheetContext',()=>({useWorksheet:()=>({activeDataset:null,createDatasetRecord:mockCreateDatasetRecord})}));
global.IS_REACT_ACT_ENVIRONMENT=true;

function Probe(){const placement=useProjectPlacement();return <><button onClick={()=>placement.requestPlacement({artifactId:'analysis-1t',projectId:'project-1',toolId:'hypothesis',title:'1-Sample t-Test',analysis:mockProjectlessAnalysis,manualDataset:{columns:[{name:'Measurement',data:[10,11,12],type:'numeric'}]},reportItem:{title:'1-Sample t-Test',toolId:'hypothesis',phase:'Analyze',statsSummary:{t:2.4,p:.03}}})}>Save analysis</button><output>{JSON.stringify(placement.placements)}</output></>}

beforeEach(()=>{jest.clearAllMocks();localStorage.clear();mockCreateDatasetRecord.mockReturnValue({id:'dataset-1',versionId:'version-1',projectId:'project-1',name:'Cycle Time Input'})});

test('placing an existing projectless analysis connects its canonical identity to the selected project and report',async()=>{
 const host=document.createElement('div'),root=createRoot(host);
 act(()=>root.render(<ProjectPlacementProvider><Probe/></ProjectPlacementProvider>));
 act(()=>host.querySelector('button').dispatchEvent(new MouseEvent('click',{bubbles:true})));
 const dialog=host.querySelector('[role="dialog"]');expect(dialog).toBeTruthy();expect(dialog.textContent).toContain('Hypothesis & Comparison');
 await act(async()=>{[...dialog.querySelectorAll('button')].find(button=>button.textContent==='Add to Project').click();await Promise.resolve();await Promise.resolve()});
 expect(mockUpdateAnalysis).toHaveBeenCalledWith('analysis-1t',expect.objectContaining({projectId:'project-1',organizationId:'org-1'}));
 expect(mockRegisterAnalysisResult).not.toHaveBeenCalled();
 expect(mockCreateDatasetRecord).not.toHaveBeenCalled();
 expect(mockAddReportItem).toHaveBeenCalledWith(expect.objectContaining({analysisId:'analysis-1t',projectId:'project-1'}));
 const placements=JSON.parse(host.querySelector('output').textContent);expect(placements).toHaveLength(1);expect(placements[0]).toEqual(expect.objectContaining({artifactId:'analysis-1t',projectId:'project-1',phase:'Analyze',workflowCluster:'Hypothesis & Comparison',reportIncluded:true}));
 expect(host.textContent).toContain('Added to Project · Analyze → Hypothesis & Comparison · Included in project report');
 act(()=>root.unmount());
});

test('explicit reusable-dataset choice creates and links one canonical project dataset',async()=>{
 const host=document.createElement('div'),root=createRoot(host);act(()=>root.render(<ProjectPlacementProvider><Probe/></ProjectPlacementProvider>));act(()=>host.querySelector('button').click());const dialog=host.querySelector('[role="dialog"]'),checks=dialog.querySelectorAll('input[type="checkbox"]');act(()=>checks[1].click());const name=[...dialog.querySelectorAll('input')].find(input=>input.value.includes('Input Data')),setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;act(()=>{setter.call(name,'Cycle Time Input');name.dispatchEvent(new Event('input',{bubbles:true}))});await act(async()=>{[...dialog.querySelectorAll('button')].find(button=>button.textContent==='Add to Project').click();await Promise.resolve();await Promise.resolve()});expect(mockCreateDatasetRecord).toHaveBeenCalledWith(expect.objectContaining({name:'Cycle Time Input',projectId:'project-1',columns:[{name:'Measurement',data:[10,11,12],type:'numeric'}]}));expect(mockUpdateAnalysis).toHaveBeenCalledWith('analysis-1t',expect.objectContaining({datasetIds:['dataset-1'],datasetVersionIds:['version-1']}));const placements=JSON.parse(host.querySelector('output').textContent);expect(placements[0].metadata).toEqual(expect.objectContaining({datasetIds:['dataset-1'],datasetVersionIds:['version-1'],inputDatasetName:'Cycle Time Input'}));act(()=>root.unmount());
});

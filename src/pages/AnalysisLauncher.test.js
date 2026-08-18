import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import AnalysisLauncher from './AnalysisLauncher';

const pmProject={id:'pm-1',name:'PM Project',suiteId:'project-management',methodology:'pmp'};
const oeProject={id:'oe-1',name:'OE Project',suiteId:'operational-excellence'};

let mockProjects=[];
jest.mock('../context/ProjectsContext',()=>({useProjects:()=>({getProject:id=>mockProjects.find(project=>project.id===id)||null,projects:mockProjects})}));
jest.mock('../context/WorksheetContext',()=>({useWorksheet:()=>({activeDataset:null,datasets:[],switchDataset:jest.fn()})}));

const render=async projectId=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={[{pathname:'/analysis',state:{projectId}}]}><AnalysisLauncher/></MemoryRouter>));
  return {host,root};
};

beforeEach(()=>{mockProjects=[pmProject,oeProject]});

// Issue 1 regression guard: the OE statistical Analysis Catalog must never render for a PM
// project's context, even though the route itself is reachable — no OE tool names should appear,
// and the user must get a way back to the Project Hub instead of a wall of irrelevant tools.
test('a PM project context shows a suite-mismatch message instead of the OE tool catalog',async()=>{
  const {host,root}=await render('pm-1');
  expect(host.textContent).toContain("aren't available for Project Management projects yet");
  expect(host.textContent).not.toContain('1-Sample t-Test');
  expect(host.textContent).not.toContain('ANOVA');
  expect(host.querySelector('a[href="/projects/pm-1"]')).toBeTruthy();
  await act(async()=>root.unmount());host.remove();
});

test('an OE project context shows the full OE tool catalog (regression)',async()=>{
  const {host,root}=await render('oe-1');
  expect(host.textContent).toContain('1-Sample t-Test');
  expect(host.textContent).toContain('Analysis Catalog');
  expect(host.querySelector('a[href="/projects/oe-1"]')).toBeTruthy();
  await act(async()=>root.unmount());host.remove();
});

test('no project context (opened without a projectId) shows the full OE tool catalog and no back link',async()=>{
  const {host,root}=await render('');
  expect(host.textContent).toContain('1-Sample t-Test');
  expect(host.querySelector('a[href^="/projects/"]')).toBeNull();
  await act(async()=>root.unmount());host.remove();
});

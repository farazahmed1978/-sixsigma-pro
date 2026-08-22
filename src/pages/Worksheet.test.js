import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import Worksheet from './Worksheet';

const pmProject={id:'pm-1',name:'PM Project',suiteId:'project-management'};
const oeProject={id:'oe-1',name:'OE Project',suiteId:'operational-excellence'};
const pmDataset={id:'dataset-pm-1',name:'PM Dataset',projectId:'pm-1',columns:[],history:[]};
const oeDataset={id:'dataset-oe-1',name:'OE Dataset',projectId:'oe-1',columns:[],history:[]};

const mockWorksheetApi={
  columns:[],fileName:'',rowCount:0,loadData:jest.fn(),clearData:jest.fn(),addColumn:jest.fn(),startBlankSheet:jest.fn(),
  hasData:false,datasets:[pmDataset,oeDataset],activeDataset:null,activeDatasetId:'',switchDataset:jest.fn(),
  renameDataset:jest.fn(),updateDatasetMetadata:jest.fn(),duplicateDataset:jest.fn(),deleteDataset:jest.fn(),
  assignDatasetProject:jest.fn(),deriveCalculatedColumn:jest.fn(),deriveTransformedColumn:jest.fn(),deriveRecodedColumn:jest.fn(),
  deriveJoinedDataset:jest.fn(),deriveStackedDataset:jest.fn(),deriveUnpivotedDataset:jest.fn(),derivePivotedDataset:jest.fn(),
  viewRowIndices:[],viewSort:[],clearViewSort:jest.fn(),updateCell:jest.fn(),renameColumn:jest.fn(),deleteColumn:jest.fn(),
  addBlankColumn:jest.fn(),addBlankRow:jest.fn(),deleteRow:jest.fn(),changeColumnType:jest.fn(),sortColumn:jest.fn(),
};
jest.mock('../context/WorksheetContext',()=>({useWorksheet:()=>mockWorksheetApi}));
jest.mock('../context/ProjectsContext',()=>({useProjects:()=>({projects:[pmProject,oeProject]})}));
jest.mock('../context/InteractionContext',()=>({useInteractions:()=>({confirm:jest.fn(),requestForm:jest.fn(),toast:jest.fn()})}));

const render=async initialProjectId=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<MemoryRouter initialEntries={[{pathname:'/worksheet',state:initialProjectId?{projectId:initialProjectId}:null}]}><Worksheet/></MemoryRouter>));
  return {host,root};
};

// Issue 1 regression guard: this was reported as still routing to the top-level /projects list
// instead of the specific project's hub.
test('back link reads "Back to Project Hub" and routes to the specific project\'s hub when opened with project context',async()=>{
  const {host,root}=await render('pm-1');
  const backLink=host.querySelector('.workspace-shell-back');
  expect(backLink.getAttribute('href')).toBe('/projects/pm-1');
  expect(backLink.textContent).toContain('Back to Project Hub');
  await act(async()=>root.unmount());host.remove();
});

test('back link preserves the active project when opened without explicit workflow context',async()=>{
  const {host,root}=await render();
  const backLink=host.querySelector('.workspace-shell-back');
  expect(backLink.getAttribute('href')).toBe('/projects/pm-1');
  expect(backLink.textContent).toContain('Back to Project Hub');
  await act(async()=>root.unmount());host.remove();
});

// Issue 2 regression guard: opened from a PM project, the Active Dataset dropdown must show only
// that project's own datasets, never another project's (OE or otherwise).
test('Active Dataset dropdown is scoped to the project passed via navigation state, excluding other projects\' datasets',async()=>{
  const {host,root}=await render('pm-1');
  const datasetSelect=host.querySelector('label').parentElement.querySelectorAll('select')[1];
  const optionLabels=[...datasetSelect.querySelectorAll('option')].map(option=>option.textContent);
  expect(optionLabels).toContain('PM Dataset');
  expect(optionLabels).not.toContain('OE Dataset');
  await act(async()=>root.unmount());host.remove();
});

test('Active Dataset dropdown scopes to whichever project is active, proving the exclusion is project-based not suite-based coincidence',async()=>{
  const {host,root}=await render('oe-1');
  const datasetSelect=host.querySelector('label').parentElement.querySelectorAll('select')[1];
  const optionLabels=[...datasetSelect.querySelectorAll('option')].map(option=>option.textContent);
  expect(optionLabels).toContain('OE Dataset');
  expect(optionLabels).not.toContain('PM Dataset');
  await act(async()=>root.unmount());host.remove();
});

import React from 'react';
import {act, Simulate} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import NewProjectEntry from './NewProjectEntry';

const mockCreateProject = jest.fn(() => 'new-project-id');
jest.mock('../context/ProjectsContext', () => ({useProjects: () => ({createProject: mockCreateProject})}));
jest.mock('../context/AuthContext', () => ({useAuth: () => ({user: {id: 'user-1'}, profile: {default_organization_id: 'org-1', full_name: 'Jamie Rivera'}})}));
jest.mock('../repositories/documentRepository', () => ({documentRepository: {createStandalone: jest.fn()}}));

import {documentRepository} from '../repositories/documentRepository';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}|{JSON.stringify(location.state)}</div>;
}

const render = async (props = {}) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const onClose = jest.fn();
  const onAdvanced = jest.fn();
  await act(async () => root.render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<NewProjectEntry onClose={onClose} onAdvanced={onAdvanced} {...props} />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  ));
  return {host, root, onClose, onAdvanced};
};

const change = (control, value) => act(() => Simulate.change(control, {target: {value}}));

// CRA's Jest config runs with resetMocks:true, which wipes a mock's implementation (not just its
// call history) before every test — so jest.fn(() => 'new-project-id')'s initial implementation at
// module scope does not survive past the first test. Re-establish it here every time.
beforeEach(() => { mockCreateProject.mockImplementation(() => 'new-project-id'); });

test('the landing screen greets the user by first name and shows all three path cards', async () => {
  const {host, root} = await render();
  expect(host.textContent).toContain('Hi Jamie — what are we building today?');
  const cards = [...host.querySelectorAll('.npe-path-card')];
  expect(cards.map(card => card.querySelector('strong').textContent)).toEqual(['Full Project', 'Standalone Document', 'Analysis or Test']);
  expect(host.textContent).toContain('Start a structured project with a complete lifecycle, documentation, and tracking.');
  expect(host.textContent).toContain('Create a single document or report without a full project.');
  expect(host.textContent).toContain('Run a statistical analysis, hypothesis test, or data exploration.');
  expect(host.querySelector('.npe-badge').textContent).toBe('Guided Mode');
  await act(async () => root.unmount());
  host.remove();
});

test('Full Project: suite selection sets suiteId/methodology, and confirming creates the project then opens the Charter with guided state', async () => {
  const {host, root} = await render();
  await act(async () => [...host.querySelectorAll('.npe-path-card')].find(card => card.textContent.includes('Full Project')).click());

  const nameInput = [...host.querySelectorAll('input')].find(input => input.closest('.form-group')?.textContent.startsWith('Project Name'));
  change(nameInput, 'Reduce Cycle Time');
  const suiteSelect = host.querySelector('select');
  change(suiteSelect, 'project-management');

  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next')).click());
  expect(host.textContent).toContain('Reduce Cycle Time');
  expect(host.textContent).toContain('Project Management');

  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Create Project').click());
  expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Reduce Cycle Time', suiteId: 'project-management', methodology: 'pmp', creationPath: 'guided-project',
  }));
  const location = host.querySelector('[data-testid="location"]').textContent;
  expect(location).toContain('/projects/new-project-id/charter');
  expect(location).toContain('"guided":true');
  await act(async () => root.unmount());
  host.remove();
});

test('leaving the suite selector on Operational Excellence still creates an OE project', async () => {
  const {host, root} = await render();
  await act(async () => [...host.querySelectorAll('.npe-path-card')].find(card => card.textContent.includes('Full Project')).click());
  const nameInput = [...host.querySelectorAll('input')].find(input => input.closest('.form-group')?.textContent.startsWith('Project Name'));
  change(nameInput, 'OE Improvement');
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent.includes('Next')).click());
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Create Project').click());
  expect(mockCreateProject).toHaveBeenCalledWith(expect.objectContaining({suiteId: 'operational-excellence', methodology: 'lean-six-sigma'}));
  await act(async () => root.unmount());
  host.remove();
});

test('Standalone Document: the picker excludes Charter and creating one opens it directly with no project overhead', async () => {
  documentRepository.createStandalone.mockResolvedValue({id: 'doc-row-1'});
  const {host, root} = await render();
  await act(async () => [...host.querySelectorAll('.npe-path-card')].find(card => card.textContent.includes('Standalone Document')).click());
  expect(host.querySelectorAll('.npe-doc-card')).not.toHaveLength(0);
  expect([...host.querySelectorAll('.npe-doc-card')].some(card => card.textContent === 'Project Charter')).toBe(false);

  const sipocCard = [...host.querySelectorAll('.npe-doc-card')].find(card => card.textContent === 'SIPOC');
  await act(async () => { await sipocCard.click(); });
  expect(documentRepository.createStandalone).toHaveBeenCalledWith(expect.objectContaining({
    project_id: null, organization_id: 'org-1', created_by: 'user-1', title: 'SIPOC',
  }));
  const location = host.querySelector('[data-testid="location"]').textContent;
  expect(location).toContain('/documents/sipoc?standalone=doc-row-1');
  await act(async () => root.unmount());
  host.remove();
});

test('Analysis or Test navigates directly to the Analysis Catalog with creationPath state', async () => {
  const {host, root} = await render();
  await act(async () => [...host.querySelectorAll('.npe-path-card')].find(card => card.textContent.includes('Analysis or Test')).click());
  const location = host.querySelector('[data-testid="location"]').textContent;
  expect(location).toContain('/analysis');
  expect(location).toContain('"creationPath":"analysis"');
  await act(async () => root.unmount());
  host.remove();
});

test('Switch to advanced setup calls onAdvanced', async () => {
  const {host, root, onAdvanced} = await render();
  await act(async () => host.querySelector('.npe-advanced-link').click());
  expect(onAdvanced).toHaveBeenCalled();
  await act(async () => root.unmount());
  host.remove();
});

test('the close button calls onClose', async () => {
  const {host, root, onClose} = await render();
  await act(async () => host.querySelector('.npe-close').click());
  expect(onClose).toHaveBeenCalled();
  await act(async () => root.unmount());
  host.remove();
});

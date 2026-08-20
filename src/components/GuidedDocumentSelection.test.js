import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import GuidedDocumentSelection from './GuidedDocumentSelection';
import {PM_REQUIRED_DOCUMENTS, PM_OPTIONAL_DOCUMENTS} from '../config/guidedFlow';

const mockUpdateProject = jest.fn(() => Promise.resolve({}));
jest.mock('../context/ProjectsContext', () => ({useProjects: () => ({updateProject: (...args) => mockUpdateProject(...args)})}));

beforeEach(() => { mockUpdateProject.mockReset().mockImplementation(() => Promise.resolve({})); });

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}|{JSON.stringify(location.state)}</div>;
}

const project = {id: 'pm-1', name: 'PM Project'};

const render = async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={<GuidedDocumentSelection project={project} />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  ));
  return {host, root};
};

test('required documents are pre-checked and locked (checkbox disabled)', async () => {
  const {host, root} = await render();
  PM_REQUIRED_DOCUMENTS.forEach(doc => {
    const checkbox = host.querySelector(`input[aria-label="${doc.label} (required)"]`);
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
  });
  await act(async () => root.unmount());
  host.remove();
});

test('optional documents start unchecked and are freely selectable', async () => {
  const {host, root} = await render();
  const firstOptional = PM_OPTIONAL_DOCUMENTS[0];
  const checkbox = host.querySelector(`input[aria-label="${firstOptional.label}"]`);
  expect(checkbox.checked).toBe(false);
  expect(checkbox.disabled).toBe(false);
  await act(async () => { checkbox.click(); });
  expect(checkbox.checked).toBe(true);
  await act(async () => { checkbox.click(); });
  expect(checkbox.checked).toBe(false);
  await act(async () => root.unmount());
  host.remove();
});

test('the selection count starts at the required count and updates live as optional docs are toggled', async () => {
  const {host, root} = await render();
  const countLabel = () => host.querySelector('.gds-cta-count').textContent;
  expect(countLabel()).toBe(`${PM_REQUIRED_DOCUMENTS.length} documents selected`);
  const checkbox = host.querySelector(`input[aria-label="${PM_OPTIONAL_DOCUMENTS[0].label}"]`);
  await act(async () => { checkbox.click(); });
  expect(countLabel()).toBe(`${PM_REQUIRED_DOCUMENTS.length + 1} documents selected`);
  await act(async () => { checkbox.click(); });
  expect(countLabel()).toBe(`${PM_REQUIRED_DOCUMENTS.length} documents selected`);
  await act(async () => root.unmount());
  host.remove();
});

test('confirming saves the exact selected id set (required + chosen optional) via updateProject and routes to the plain hub', async () => {
  const {host, root} = await render();
  const chosenOptional = PM_OPTIONAL_DOCUMENTS[2];
  await act(async () => { host.querySelector(`input[aria-label="${chosenOptional.label}"]`).click(); });
  await act(async () => { host.querySelector('.gds-cta-footer button').click(); });
  expect(mockUpdateProject).toHaveBeenCalledWith('pm-1', {selectedDocuments: expect.arrayContaining([...PM_REQUIRED_DOCUMENTS.map(d => d.id), chosenOptional.id])});
  const [, payload] = mockUpdateProject.mock.calls[0];
  expect(payload.selectedDocuments).toHaveLength(PM_REQUIRED_DOCUMENTS.length + 1);
  await act(async () => { await Promise.resolve(); });
  const location = host.querySelector('[data-testid="location"]').textContent;
  expect(location).toBe('/projects/pm-1|null');
  await act(async () => root.unmount());
  host.remove();
});

import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import GuidedProgressTracker from './GuidedProgressTracker';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}|{JSON.stringify(location.state)}</div>;
}

const render = async (project, state) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const entry = state ? {pathname: '/start', state} : '/start';
  await act(async () => root.render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/start" element={<GuidedProgressTracker project={project} />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  ));
  return {host, root};
};

const oeProject = completed => ({id: 'proj-1', name: 'Reduce Cycle Time', suiteId: 'operational-excellence', guidedFlowState: {completedMandatoryDocs: completed}});

test('renders nothing when location.state.guided is absent', async () => {
  const {host, root} = await render(oeProject([]));
  expect(host.querySelector('.guided-progress-tracker')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('renders nothing when location.state.guided is false', async () => {
  const {host, root} = await render(oeProject([]), {guided: false});
  expect(host.querySelector('.guided-progress-tracker')).toBeNull();
  await act(async () => root.unmount());
  host.remove();
});

test('at step 0 (nothing completed), shows the project name and "Step 1 of 3 — Project Charter"', async () => {
  const {host, root} = await render(oeProject([]), {guided: true});
  const tracker = host.querySelector('.guided-progress-tracker');
  expect(tracker).toBeTruthy();
  expect(tracker.textContent).toContain('Reduce Cycle Time');
  expect(tracker.textContent).toContain('Step 1 of 3 — Project Charter');
  const nodes = [...tracker.querySelectorAll('.gpt-node')];
  expect(nodes.map(node => node.className)).toEqual(['gpt-node current', 'gpt-node pending', 'gpt-node pending']);
  expect(tracker.querySelectorAll('.gpt-check')).toHaveLength(0);
  expect(tracker.querySelector('.gpt-node.current .gpt-node-number').textContent).toBe('1');
  const labels = [...tracker.querySelectorAll('.gpt-node-label')].map(label => label.textContent);
  expect(labels).toEqual(['Project Charter', 'SIPOC', 'Voice of Customer']);
  expect(tracker.querySelector('.gpt-node-label.current').textContent).toBe('Project Charter');
  await act(async () => root.unmount());
  host.remove();
});

test('at step 1 (charter completed), shows "Step 2 of 3 — SIPOC" with the first node filled (checkmark) and the connecting line marked done', async () => {
  const {host, root} = await render(oeProject(['charter']), {guided: true});
  const tracker = host.querySelector('.guided-progress-tracker');
  expect(tracker.textContent).toContain('Step 2 of 3 — SIPOC');
  const nodes = [...tracker.querySelectorAll('.gpt-node')];
  expect(nodes.map(node => node.className)).toEqual(['gpt-node done', 'gpt-node current', 'gpt-node pending']);
  expect(nodes[0].querySelector('.gpt-check')).toBeTruthy();
  const lines = [...tracker.querySelectorAll('.gpt-line')];
  expect(lines).toHaveLength(2);
  expect(lines[0].className).toContain('done');
  expect(lines[1].className).not.toContain('done');
  await act(async () => root.unmount());
  host.remove();
});

test('at step 2 (charter + sipoc completed), shows "Step 3 of 3 — Voice of Customer" with two nodes filled and both lines done', async () => {
  const {host, root} = await render(oeProject(['charter', 'sipoc']), {guided: true});
  const tracker = host.querySelector('.guided-progress-tracker');
  expect(tracker.textContent).toContain('Step 3 of 3 — Voice of Customer');
  const nodes = [...tracker.querySelectorAll('.gpt-node')];
  expect(nodes.map(node => node.className)).toEqual(['gpt-node done', 'gpt-node done', 'gpt-node current']);
  const lines = [...tracker.querySelectorAll('.gpt-line')];
  expect(lines.every(line => line.className.includes('done'))).toBe(true);
  await act(async () => root.unmount());
  host.remove();
});

test('when all mandatory docs are complete, shows the neutral complete label with all nodes filled', async () => {
  const {host, root} = await render(oeProject(['charter', 'sipoc', 'voc']), {guided: true});
  const tracker = host.querySelector('.guided-progress-tracker');
  expect(tracker.textContent).toContain('All mandatory documents complete');
  const nodes = [...tracker.querySelectorAll('.gpt-node')];
  expect(nodes.map(node => node.className)).toEqual(['gpt-node done', 'gpt-node done', 'gpt-node done']);
  await act(async () => root.unmount());
  host.remove();
});

test('"Exit to full view" navigates to the plain project hub route, with no guided state', async () => {
  const {host, root} = await render(oeProject(['charter']), {guided: true});
  const exitLink = host.querySelector('.gpt-exit');
  expect(exitLink.textContent).toBe('Exit to full view →');
  await act(async () => { exitLink.click(); });
  const location = host.querySelector('[data-testid="location"]').textContent;
  expect(location).toBe('/projects/proj-1|null');
  await act(async () => root.unmount());
  host.remove();
});

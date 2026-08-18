import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import ProjectHealthDashboard from './ProjectHealthDashboard';

const doc = (id, values) => ({[`document-${id}`]: {id: `document-${id}`, templateId: id, updatedAt: '2026-01-01T00:00:00.000Z', values}});
const project = (documents = {}, extra = {}) => ({id: 'p1', name: 'Test Project', documents, ...extra});

const render = async project => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const onOpenTab = jest.fn();
  await act(async () => root.render(<MemoryRouter><ProjectHealthDashboard project={project} onOpenTab={onOpenTab} /></MemoryRouter>));
  return {host, root, onOpenTab};
};

test('renders all five primary health cards plus the secondary indicators row', async () => {
  const {host, root} = await render(project());
  const cards = [...host.querySelectorAll('.ph-health-card')];
  expect(cards).toHaveLength(5);
  expect(host.querySelector('.ph-health-secondary')).toBeTruthy();
  expect(host.querySelector('.ph-health-ring')).toBeTruthy();
  await act(async () => root.unmount());
  host.remove();
});

test('a card with no source document shows a "No data yet" state with a link to open it', async () => {
  const {host, root} = await render(project());
  const riskCard = [...host.querySelectorAll('.ph-health-card')].find(card => card.textContent.includes('Risk Exposure'));
  expect(riskCard.textContent).toContain('No data yet');
  expect(riskCard.querySelector('a,button').textContent).toContain('Risk Register');
  await act(async () => root.unmount());
  host.remove();
});

test('a Red risk card shows the Red status label and a sparkline when there is more than one exposure value', async () => {
  const proj = project(doc('risk-register', {riskRows: [
    {status: 'Open', risk: 'A', exposure: 20, owner: 'X'},
    {status: 'Open', risk: 'B', exposure: 8, owner: 'Y'},
  ]}));
  const {host, root} = await render(proj);
  const riskCard = [...host.querySelectorAll('.ph-health-card')].find(card => card.textContent.includes('Risk Exposure'));
  expect(riskCard.className).toContain('status-red');
  expect(riskCard.textContent).toContain('At risk');
  expect(riskCard.querySelector('.ph-health-sparkline')).toBeTruthy();
  await act(async () => root.unmount());
  host.remove();
});

test('clicking the Approvals link (a Project Hub tab, not a document route) calls onOpenTab instead of navigating', async () => {
  const {host, root, onOpenTab} = await render(project());
  const approvalsCard = [...host.querySelectorAll('.ph-health-card')].find(card => card.textContent.includes('Approvals and Decisions'));
  const approvalsLink = [...approvalsCard.querySelectorAll('button,a')].find(node => node.textContent.includes('Approvals'));
  expect(approvalsLink.tagName).toBe('BUTTON');
  await act(async () => { approvalsLink.click(); });
  expect(onOpenTab).toHaveBeenCalledWith('approvals');
  await act(async () => root.unmount());
  host.remove();
});

test('the Decision Log link is a real route, not a tab switch', async () => {
  const {host, root} = await render(project());
  const approvalsCard = [...host.querySelectorAll('.ph-health-card')].find(card => card.textContent.includes('Approvals and Decisions'));
  const decisionLink = [...approvalsCard.querySelectorAll('a')].find(node => node.textContent.includes('Decision Log'));
  expect(decisionLink.getAttribute('href')).toBe('/projects/p1/documents/decision-log');
  await act(async () => root.unmount());
  host.remove();
});

test('the overall ring shows "No data yet" when nothing has been entered anywhere', async () => {
  const {host, root} = await render(project());
  expect(host.querySelector('.ph-health-ring').textContent).toContain('No data yet');
  await act(async () => root.unmount());
  host.remove();
});

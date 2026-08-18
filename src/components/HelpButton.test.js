import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import HelpButton from './HelpButton';

const render=element=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  act(()=>root.render(element));
  return {host,root};
};

// Issue 2 regression guard: the trigger must read as an obviously clickable, labeled button (not
// a tiny unlabeled "?" dot) — it should carry visible "Help" text, not just a bare glyph.
test('the trigger button is labeled "Help", not a bare unlabeled glyph',()=>{
  const {host,root}=render(<HelpButton surfaceId="evidence-library" suiteId="operational-excellence"/>);
  const button=host.querySelector('.help-trigger-btn');
  expect(button.textContent).toContain('Help');
  act(()=>root.unmount());host.remove();
});

test('clicking the trigger opens the help panel with the resolved content, and clicking again closes it',()=>{
  const {host,root}=render(<HelpButton surfaceId="evidence-library" suiteId="project-management"/>);
  const button=host.querySelector('.help-trigger-btn');
  expect(host.querySelector('.help-panel')).toBeNull();
  act(()=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  expect(host.querySelector('.help-panel')).toBeTruthy();
  expect(host.querySelector('.help-panel h4').textContent).toBe('Evidence Library');
  expect(host.querySelector('.help-panel').textContent).toContain('approval records');
  act(()=>button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  expect(host.querySelector('.help-panel')).toBeNull();
  act(()=>root.unmount());host.remove();
});

test('renders nothing (not even the trigger) when no help content is registered for the surface',()=>{
  const {host,root}=render(<HelpButton surfaceId="not-a-real-surface" suiteId="operational-excellence"/>);
  expect(host.querySelector('.help-trigger')).toBeNull();
  act(()=>root.unmount());host.remove();
});

test('a pre-resolved content object (Document Library per-card help) renders through the same panel',()=>{
  const {host,root}=render(<HelpButton content={{title:'WBS',summary:'Decompose scope.',whenToUse:'During Planning.'}}/>);
  act(()=>host.querySelector('.help-trigger-btn').dispatchEvent(new MouseEvent('click',{bubbles:true})));
  expect(host.querySelector('.help-panel h4').textContent).toBe('WBS');
  act(()=>root.unmount());host.remove();
});

test('clicking the trigger does not bubble a click to an ancestor (safe to nest inside a clickable card)',()=>{
  const ancestorClick=jest.fn();
  const {host,root}=render(<div onClick={ancestorClick}><HelpButton surfaceId="evidence-library" suiteId="operational-excellence"/></div>);
  act(()=>host.querySelector('.help-trigger-btn').dispatchEvent(new MouseEvent('click',{bubbles:true})));
  expect(ancestorClick).not.toHaveBeenCalled();
  act(()=>root.unmount());host.remove();
});

import React from 'react';
import {act} from 'react-dom/test-utils';
import {createRoot} from 'react-dom/client';
import TagSelect from './TagSelect';

const setInputValue = (input, value) => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles: true}));
};

const render = async props => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const onChange = jest.fn();
  await act(async () => root.render(<TagSelect value={[]} onChange={onChange} suggestions={['contract', 'vendor']} {...props} />));
  return {host, root, onChange};
};

test('selected tags render as removable chips', async () => {
  const {host, root} = await render({value: ['contract']});
  const chips = [...host.querySelectorAll('.tag-select-chips li')];
  expect(chips).toHaveLength(1);
  expect(chips[0].textContent).toContain('contract');
  await act(async () => root.unmount());
  host.remove();
});

test('the predefined dropdown only offers suggestions not already selected', async () => {
  const {host, root} = await render({value: ['contract']});
  const select = host.querySelector('select[aria-label="Add predefined tag"]');
  const options = [...select.querySelectorAll('option')].map(option => option.value).filter(Boolean);
  expect(options).toEqual(['vendor']);
  await act(async () => root.unmount());
  host.remove();
});

test('choosing a predefined option adds it to the selection', async () => {
  const {host, root, onChange} = await render({value: []});
  const select = host.querySelector('select[aria-label="Add predefined tag"]');
  await act(async () => {
    select.value = 'contract';
    select.dispatchEvent(new Event('change', {bubbles: true}));
  });
  expect(onChange).toHaveBeenCalledWith(['contract']);
  await act(async () => root.unmount());
  host.remove();
});

test('typing a custom tag and pressing Enter adds it as a chip', async () => {
  const {host, root, onChange} = await render({value: []});
  const input = host.querySelector('input[aria-label="Add custom tag"]');
  await act(async () => { setInputValue(input, 'urgent'); });
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); });
  expect(onChange).toHaveBeenCalledWith(['urgent']);
  await act(async () => root.unmount());
  host.remove();
});

test('typing a custom tag and pressing comma adds it as a chip', async () => {
  const {host, root, onChange} = await render({value: []});
  const input = host.querySelector('input[aria-label="Add custom tag"]');
  await act(async () => { setInputValue(input, 'urgent'); });
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', {key: ',', bubbles: true})); });
  expect(onChange).toHaveBeenCalledWith(['urgent']);
  await act(async () => root.unmount());
  host.remove();
});

test('removing a chip drops it from the selection', async () => {
  const {host, root, onChange} = await render({value: ['contract', 'vendor']});
  const removeButton = host.querySelector('button[aria-label="Remove tag contract"]');
  await act(async () => { removeButton.click(); });
  expect(onChange).toHaveBeenCalledWith(['vendor']);
  await act(async () => root.unmount());
  host.remove();
});

test('a blank or duplicate custom tag is ignored', async () => {
  const {host, root, onChange} = await render({value: ['contract']});
  const input = host.querySelector('input[aria-label="Add custom tag"]');
  await act(async () => { setInputValue(input, '   '); });
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); });
  await act(async () => { setInputValue(input, 'contract'); });
  await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); });
  expect(onChange).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  host.remove();
});

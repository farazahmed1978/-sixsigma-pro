import {charterSaveStateLabel,mergeCharterSharedFields,projectCharterLinkTarget} from './ProjectCharter';
import {readFileSync} from 'fs';

test('Project Charter Continue to SIPOC opens the project-scoped SIPOC workspace directly',()=>{
  expect(projectCharterLinkTarget('project-123','/templates')).toBe('/projects/project-123/documents/sipoc');
});

test('Project Charter has no duplicate in-body Continue to SIPOC CTA',()=>{
  const source=readFileSync(require.resolve('./ProjectCharter'),'utf8');
  expect(source).not.toContain('Continue to SIPOC');
  expect(source).toContain('sequenceNextLabel="SIPOC"');
  expect(source).toContain('onSequenceNext={requestSipoc}');
});

test('Project Charter exposes honest autosave states and distinct navigation semantics',()=>{
  expect(charterSaveStateLabel('saving')).toBe('Saving…');
  expect(charterSaveStateLabel('saved')).toBe('Saved');
  expect(charterSaveStateLabel('unsaved')).toBe('Unsaved changes');
  const source=readFileSync(require.resolve('./ProjectCharter'),'utf8');
  expect(source).toContain('backLabel="Project"');
  expect(source).toContain('previousLabel="Previous"');
  expect(source).toContain('onPrevious={() => navigate(-1)}');
  expect(source).toContain('onClick={advanceSection}>Next');
});

test('Project Charter consumes canonical shared-field updates instead of retaining stale values',()=>{
  expect(mergeCharterSharedFields({businessCase:'Old case',problemStatement:'Keep this'},{businessCaseSummary:'Updated case'})).toEqual({businessCase:'Updated case',problemStatement:'Keep this'});
});

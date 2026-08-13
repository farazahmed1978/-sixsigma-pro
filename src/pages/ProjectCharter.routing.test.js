import {projectCharterLinkTarget} from './ProjectCharter';
import {readFileSync} from 'fs';

test('Project Charter Continue to SIPOC opens the project-scoped SIPOC workspace directly',()=>{
  expect(projectCharterLinkTarget('project-123','/templates')).toBe('/projects/project-123/documents/sipoc');
});

test('Project Charter has no duplicate in-body Continue to SIPOC CTA',()=>{
  const source=readFileSync(require.resolve('./ProjectCharter'),'utf8');
  expect(source).not.toContain('Continue to SIPOC');
  expect(source).toContain('nextLabel="SIPOC"');
  expect(source).toContain('onNext={requestSipoc}');
});

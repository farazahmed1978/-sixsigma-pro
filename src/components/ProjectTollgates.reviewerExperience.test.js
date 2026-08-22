import fs from 'fs';
import path from 'path';

const source=fs.readFileSync(path.join(__dirname,'ProjectTollgates.js'),'utf8');

test('review workspace opens the exact requested attempt and canonical Define evidence',()=>{
  expect(source).toContain('requestedAttempt');
  expect(source).toContain('requestedReview || attempts[0]');
  ['/charter','/documents/sipoc','/documents/voc','/documents/ctq-tree'].forEach(route=>expect(source).toContain(route));
  expect(source).toContain('Define Binder / evidence');
  expect(source).toContain('Submission note');
});

test('approved Define attempt exposes the existing professional Measure entry',()=>{
  expect(source).toContain("Define:{label:'Measure'");
  expect(source).toContain("path:'data-collection-plan'");
  expect(source).toContain('Continue to {APPROVED_HANDOFF[phase].label}');
});

test('existing supported decisions and self-approval enforcement remain present',()=>{
  ['Approve','Conditionally Approve','Return for Revision','Reject'].forEach(label=>expect(source).toContain(label));
  expect(source).toContain('canReviewTollgate');
});

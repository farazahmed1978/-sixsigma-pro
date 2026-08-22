import fs from 'fs';
import path from 'path';

const source=fs.readFileSync(path.join(__dirname,'ProjectDetail.js'),'utf8');

test('Project Team marks the minimum account identity and exposes reviewer eligibility',()=>{
  expect(source).toContain('Account email *');
  expect(source).toContain('tollgateReviewerEligibility(member,user)');
  expect(source).toContain('Not eligible for Tollgate review');
});

test('Professional OE does not surface the unsupported guided resume banner',()=>{
  expect(source).toContain('suiteId === "project-management"');
});

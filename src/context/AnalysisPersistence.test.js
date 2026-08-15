import {shouldPersistAnalysis} from './AnalysisContext';

test('preserves legacy incomplete analyses without rewriting them as canonical records',()=>{
  expect(shouldPersistAnalysis({id:'legacy',provenanceStatus:'legacy-incomplete'})).toBe(false);
  expect(shouldPersistAnalysis({id:'canonical',provenanceStatus:'complete'})).toBe(true);
  expect(shouldPersistAnalysis({id:'new-analysis'})).toBe(true);
});

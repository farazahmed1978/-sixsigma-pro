import fs from 'fs';
import path from 'path';

const sql=fs.readFileSync(path.join(process.cwd(),'supabase/migrations/202608210001_cross_account_tollgate_reviews.sql'),'utf8');

test('cross-account review policy is restricted to canonical assigned OE tollgates',()=>{
  expect(sql).toContain("a.suite = 'operational-excellence'");
  expect(sql).toContain("a.content->>'item_type' = 'oe-dmaic-tollgate'");
  expect(sql).toContain("a.content->>'assignedReviewerId' = auth.uid()::text");
  expect(sql).toContain("lower(a.content->>'assignedReviewerEmail')");
  expect(sql).toContain("coalesce(content->>'submittedBy','') <> auth.uid()::text");
});

test('approval canonically advances only an approved Define tollgate to Measure',()=>{
  expect(sql).toContain("new.status = 'Approved'");
  expect(sql).toContain("new.content->>'phase' = 'Define'");
  expect(sql).toContain("set current_phase = 'Measure'");
  expect(sql).not.toContain('current_phase = \'Analyze\'');
});

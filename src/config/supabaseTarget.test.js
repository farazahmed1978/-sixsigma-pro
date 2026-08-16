const fs = require('fs');
const os = require('os');
const path = require('path');
const {envFilesFor,loadEffectiveEnv,projectRefFromUrl,validateSupabaseTarget}=require('../../scripts/validate-supabase-target');

const staging={REACT_APP_ENVIRONMENT:'staging',REACT_APP_SUPABASE_PROJECT_REF:'ghxcditmnognoeiqlisn',REACT_APP_SUPABASE_URL:'https://ghxcditmnognoeiqlisn.supabase.co',REACT_APP_SUPABASE_ANON_KEY:'public-browser-key'};

test('models CRA precedence but accepts only the intentional development target',()=>{
  expect(envFilesFor('development')).toEqual(['.env.development.local','.env.local','.env.development','.env']);
  expect(projectRefFromUrl(staging.REACT_APP_SUPABASE_URL)).toBe(staging.REACT_APP_SUPABASE_PROJECT_REF);
  expect(validateSupabaseTarget('development',staging)).toEqual(expect.objectContaining({environment:'staging'}));
});

test('rejects a URL and project-ref split across Supabase projects',()=>{
  expect(()=>validateSupabaseTarget('development',{...staging,REACT_APP_SUPABASE_URL:'https://mzfmwwxxocereizxmwqy.supabase.co'})).toThrow(/Contradictory development Supabase target/);
});

test('rejects shared local Supabase overrides and missing credentials',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'aureqin-env-'));
  fs.writeFileSync(path.join(root,'.env.local'),'REACT_APP_SUPABASE_URL=https://mzfmwwxxocereizxmwqy.supabase.co\n');
  expect(()=>validateSupabaseTarget('development',staging,root)).toThrow(/Ambiguous Supabase configuration/);
  fs.rmSync(root,{recursive:true,force:true});
  expect(()=>validateSupabaseTarget('development',{...staging,REACT_APP_SUPABASE_ANON_KEY:''})).toThrow(/Missing required development/);
});

test('effective loading cannot let a lower-precedence file replace development-local values',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'aureqin-env-'));
  fs.writeFileSync(path.join(root,'.env.development.local'),'REACT_APP_SUPABASE_PROJECT_REF=staging\n');
  fs.writeFileSync(path.join(root,'.env.development'),'REACT_APP_SUPABASE_PROJECT_REF=production\n');
  expect(loadEffectiveEnv('development',root,{}).REACT_APP_SUPABASE_PROJECT_REF).toBe('staging');
  fs.rmSync(root,{recursive:true,force:true});
});

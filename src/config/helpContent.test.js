import {HELP_CONTENT, HELP_SURFACE_IDS, helpFor} from './helpContent';

test('helpFor resolves suite-specific content when a surface has it',()=>{
  const pmHelp=helpFor('evidence-library','project-management');
  const oeHelp=helpFor('evidence-library','operational-excellence');
  expect(pmHelp.title).toBe('Evidence Library');
  expect(pmHelp.summary).toContain('approval records');
  expect(oeHelp.summary).toContain('histograms');
  expect(pmHelp.summary).not.toBe(oeHelp.summary);
});

test('helpFor falls back to a shared entry when a surface has no suite-specific content',()=>{
  const pmHelp=helpFor('project-home','project-management');
  const oeHelp=helpFor('project-home','operational-excellence');
  expect(pmHelp).toBe(oeHelp);
  expect(pmHelp.title).toBe('Project Home');
});

test('helpFor returns null for an unregistered surface or a suite with neither a specific nor shared entry, never throws',()=>{
  expect(helpFor('not-a-real-surface','operational-excellence')).toBeNull();
  expect(helpFor('risks','operational-excellence')).toBeNull();
});

test('every registered surface resolves for at least one real suite (no orphaned surfaceId)',()=>{
  HELP_SURFACE_IDS.forEach(surfaceId=>{
    const resolvesForEitherSuite=Boolean(helpFor(surfaceId,'operational-excellence'))||Boolean(helpFor(surfaceId,'project-management'));
    expect(resolvesForEitherSuite).toBe(true);
  });
});

test('every help entry carries at minimum a title and a summary, the two fields HelpButton always renders',()=>{
  const incomplete=[];
  Object.entries(HELP_CONTENT).forEach(([surfaceId,bySuite])=>{
    Object.entries(bySuite).forEach(([suiteKey,entry])=>{
      if(!entry.title||!entry.summary)incomplete.push(`${surfaceId}.${suiteKey}`);
    });
  });
  expect(incomplete).toEqual([]);
});

// Suite isolation: PM-only surfaces (governance tabs Risks/Actions/Issues/Decisions/Approvals)
// must not silently resolve OE content, and OE-only surfaces (Analyses/Placements) must not
// silently resolve PM content — each should be null for the suite it doesn't apply to, not a wrong
// or misleading entry.
test.each(['risks','actions','issues','decisions','approvals'])('%s help has no operational-excellence entry (PM-only surface)',surfaceId=>{
  expect(helpFor(surfaceId,'operational-excellence')).toBeNull();
  expect(helpFor(surfaceId,'project-management')).toBeTruthy();
});
test.each(['analyses','placements'])('%s help has no project-management entry (OE-only surface)',surfaceId=>{
  expect(helpFor(surfaceId,'project-management')).toBeNull();
  expect(helpFor(surfaceId,'operational-excellence')).toBeTruthy();
});

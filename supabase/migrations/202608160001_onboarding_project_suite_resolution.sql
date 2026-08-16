-- Fixes the onboarding-created first project always resolving to Operational Excellence
-- regardless of what the onboarding wizard's "Project type" / "Preferred methodology"
-- selectors captured. Three independent bugs in the original trigger
-- (202608130004_onboarding_project_provisioning.sql):
--
-- 1. The selected suite was written to content.projectType, a key resolveProjectSuiteId()
--    (src/foundation/lifecycle.js) never reads. It only reads project.suiteId /
--    project.suite_id / project.suite / project.content.suiteId. Fixed by writing the
--    resolved suite id to content.suiteId instead (kept consistent with every other project
--    creation path in the app, including src/context/ProjectsContext.js's createProject()).
-- 2. The onboarding wizard's methodology dropdown stores its literal display label
--    ('DMAIC' | 'PMP lifecycle' | 'Hybrid'); the trigger lowercased it directly into the
--    methodology column. lower('PMP lifecycle') = 'pmp lifecycle', which does not match any
--    key in lifecycle.js's alias map (only 'pmp'/'pm' are registered), so it silently fell
--    through to the operational-excellence default. 'DMAIC'->'dmaic' and 'Hybrid'->'hybrid'
--    happened to work only by lowercase coincidence. Fixed by mapping the raw label to a
--    canonical methodology value here, the same way every other creation path already sends
--    canonical values rather than raw UI labels.
-- 3. current_phase was hardcoded to 'Define' regardless of methodology. Fixed to resolve to
--    each suite's first lifecycle stage label ('Define' for OE, 'Initiation' for PM), mirroring
--    NAVIGATION/lifecycleRegistry's current stage order (this trigger cannot call the JS
--    registry directly, so the two canonical first-stage labels are mirrored explicitly).
create or replace function public.aureqin_create_onboarding_project()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  workspace_organization_id uuid;
  resolved_suite_id text;
  resolved_methodology text;
  resolved_current_phase text;
begin
  if new.raw_user_meta_data->>'workspaceChoice' is distinct from 'create' then
    return new;
  end if;

  workspace_organization_id := public.aureqin_ensure_user_workspace(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );

  resolved_suite_id := case new.raw_user_meta_data->>'projectType'
    when 'Project Management' then 'project-management'
    else 'operational-excellence'
  end;
  resolved_methodology := case new.raw_user_meta_data->>'methodology'
    when 'PMP lifecycle' then 'pmp'
    when 'DMAIC' then 'dmaic'
    else 'hybrid'
  end;
  resolved_current_phase := case resolved_suite_id
    when 'project-management' then 'Initiation'
    else 'Define'
  end;

  insert into public.projects(
    organization_id, created_by, name, status, methodology, current_phase,
    content, local_migration_key
  ) values (
    workspace_organization_id,
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'projectName'), ''), 'First Project'),
    'active',
    resolved_methodology,
    resolved_current_phase,
    jsonb_build_object(
      'suiteId', resolved_suite_id,
      'projectType', new.raw_user_meta_data->>'projectType',
      'createdFrom', 'onboarding'
    ),
    'onboarding:' || new.id::text
  )
  on conflict (organization_id, local_migration_key) do nothing;

  return new;
end;
$$;

revoke all on function public.aureqin_create_onboarding_project() from public, anon, authenticated;

-- Provision the explicitly requested first project in the same transaction as
-- the canonical auth-user workspace. This avoids a client/auth-state race.
create or replace function public.aureqin_create_onboarding_project()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  workspace_organization_id uuid;
begin
  if new.raw_user_meta_data->>'workspaceChoice' is distinct from 'create' then
    return new;
  end if;

  workspace_organization_id := public.aureqin_ensure_user_workspace(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );

  insert into public.projects(
    organization_id, created_by, name, status, methodology, current_phase,
    content, local_migration_key
  ) values (
    workspace_organization_id,
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'projectName'), ''), 'First Project'),
    'active',
    lower(coalesce(nullif(new.raw_user_meta_data->>'methodology', ''), 'hybrid')),
    'Define',
    jsonb_build_object(
      'projectType', new.raw_user_meta_data->>'projectType',
      'createdFrom', 'onboarding'
    ),
    'onboarding:' || new.id::text
  )
  on conflict (organization_id, local_migration_key) do nothing;

  return new;
end;
$$;

drop trigger if exists zz_aureqin_auth_user_project on auth.users;
create trigger zz_aureqin_auth_user_project
after insert on auth.users
for each row execute function public.aureqin_create_onboarding_project();

revoke all on function public.aureqin_create_onboarding_project() from public, anon, authenticated;

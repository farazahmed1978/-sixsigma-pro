-- Provision the ownership metadata required by project import and suite access.
-- Additive, idempotent, and intended to run after 202608070001 and 202608070002.

create or replace function public.aureqin_seed_active_suite_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.suite_entitlements(organization_id,suite_id,status,source,starts_at)
  select new.id,s.id,'active','platform-default',now()
  from public.suites s
  where s.id in ('operational-excellence','project-management')
  on conflict(organization_id,suite_id) do nothing;
  return new;
end;
$$;

drop trigger if exists aureqin_seed_active_suites on public.organizations;
create trigger aureqin_seed_active_suites
after insert on public.organizations
for each row execute function public.aureqin_seed_active_suite_entitlements();

insert into public.suite_entitlements(organization_id,suite_id,status,source,starts_at)
select o.id,s.id,'active','platform-default',now()
from public.organizations o
cross join public.suites s
where s.id in ('operational-excellence','project-management')
on conflict(organization_id,suite_id) do nothing;

create or replace function public.aureqin_ensure_user_workspace(
  target_user_id uuid,
  target_email text default null,
  target_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  organization_id uuid;
  display_name text;
begin
  select default_organization_id into organization_id
  from public.profiles
  where id=target_user_id;

  if organization_id is not null then
    return organization_id;
  end if;

  display_name:=coalesce(nullif(trim(target_full_name),''),nullif(split_part(coalesce(target_email,''),'@',1),''),'Aureqin');

  insert into public.organizations(name,created_by)
  values(display_name||'''s Workspace',target_user_id)
  returning id into organization_id;

  insert into public.profiles(id,full_name,default_organization_id)
  values(target_user_id,display_name,organization_id)
  on conflict(id) do update
  set full_name=coalesce(public.profiles.full_name,excluded.full_name),
      default_organization_id=coalesce(public.profiles.default_organization_id,excluded.default_organization_id),
      updated_at=now();

  return organization_id;
end;
$$;

create or replace function public.aureqin_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.aureqin_ensure_user_workspace(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name')
  );
  return new;
end;
$$;

drop trigger if exists aureqin_auth_user_workspace on auth.users;
create trigger aureqin_auth_user_workspace
after insert on auth.users
for each row execute function public.aureqin_handle_new_auth_user();

do $$
declare
  account record;
begin
  for account in
    select id,email,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name') as full_name
    from auth.users
  loop
    perform public.aureqin_ensure_user_workspace(account.id,account.email,account.full_name);
  end loop;
end;
$$;

revoke all on function public.aureqin_ensure_user_workspace(uuid,text,text) from public,anon,authenticated;
revoke all on function public.aureqin_handle_new_auth_user() from public,anon,authenticated;
revoke all on function public.aureqin_seed_active_suite_entitlements() from public,anon,authenticated;

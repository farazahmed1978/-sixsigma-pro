-- Axentra project architecture hardening. Additive and safe to apply after any prior migration.
create extension if not exists pgcrypto;

create table if not exists public.organizations(id uuid primary key default gen_random_uuid(),name text not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.organization_memberships(organization_id uuid not null references public.organizations(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,role text not null default 'viewer' check(role in('viewer','member','admin','owner')),status text not null default 'active',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(organization_id,user_id));
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text,default_organization_id uuid references public.organizations(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.projects(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,created_by uuid not null references auth.users(id),name text not null,status text not null default 'active',methodology text not null default 'hybrid',current_phase text,target_date date,content jsonb not null default '{}'::jsonb,local_migration_key text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(organization_id,local_migration_key));

do $$ declare table_name text; begin
 foreach table_name in array array['documents','datasets','analyses','evidence','artifacts','reports','tasks','risks','issues','decisions','approvals','activities'] loop
  execute format('create table if not exists public.%I(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,organization_id uuid not null references public.organizations(id) on delete cascade,created_by uuid not null references auth.users(id),status text not null default ''active'',methodology text,lifecycle_phase text,dmaic_phase text,title text,content jsonb not null default ''{}''::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now())',table_name);
 end loop;
end $$;
alter table public.datasets add column if not exists description text;
alter table public.datasets add column if not exists source text;
alter table public.datasets add column if not exists version integer not null default 1;
alter table public.datasets add column if not exists row_count integer not null default 0;
alter table public.datasets add column if not exists column_count integer not null default 0;
create table if not exists public.dataset_versions(id uuid primary key default gen_random_uuid(),dataset_id uuid not null references public.datasets(id) on delete cascade,project_id uuid not null references public.projects(id) on delete cascade,organization_id uuid not null references public.organizations(id) on delete cascade,created_by uuid not null references auth.users(id),version integer not null,status text not null default 'active',content jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(dataset_id,version));

create or replace function public.axentra_add_organization_owner() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.organization_memberships(organization_id,user_id,role,status) values(new.id,new.created_by,'owner','active') on conflict(organization_id,user_id) do update set role='owner',status='active';return new;end$$;
drop trigger if exists axentra_organization_owner on public.organizations;create trigger axentra_organization_owner after insert on public.organizations for each row execute function public.axentra_add_organization_owner();

create or replace function public.axentra_org_role(org_id uuid) returns text language sql stable security definer set search_path=public as $$select role from public.organization_memberships where organization_id=org_id and user_id=auth.uid() and status='active' limit 1$$;
revoke all on function public.axentra_org_role(uuid) from public;grant execute on function public.axentra_org_role(uuid) to authenticated;

alter table public.organizations enable row level security;alter table public.organization_memberships enable row level security;alter table public.profiles enable row level security;alter table public.projects enable row level security;alter table public.dataset_versions enable row level security;
do $$ declare table_name text; begin foreach table_name in array array['documents','datasets','analyses','evidence','artifacts','reports','tasks','risks','issues','decisions','approvals','activities'] loop execute format('alter table public.%I enable row level security',table_name);end loop;end $$;

drop policy if exists organizations_read on public.organizations;create policy organizations_read on public.organizations for select to authenticated using(public.axentra_org_role(id) is not null);
drop policy if exists organizations_insert on public.organizations;create policy organizations_insert on public.organizations for insert to authenticated with check(created_by=auth.uid());
drop policy if exists organizations_update on public.organizations;create policy organizations_update on public.organizations for update to authenticated using(public.axentra_org_role(id) in('admin','owner')) with check(public.axentra_org_role(id) in('admin','owner'));
drop policy if exists memberships_read on public.organization_memberships;create policy memberships_read on public.organization_memberships for select to authenticated using(user_id=auth.uid() or public.axentra_org_role(organization_id) in('admin','owner'));
drop policy if exists memberships_manage on public.organization_memberships;create policy memberships_manage on public.organization_memberships for all to authenticated using(public.axentra_org_role(organization_id) in('admin','owner')) with check(public.axentra_org_role(organization_id) in('admin','owner'));
drop policy if exists profiles_self on public.profiles;create policy profiles_self on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists projects_read on public.projects;create policy projects_read on public.projects for select to authenticated using(public.axentra_org_role(organization_id) is not null);
drop policy if exists projects_write on public.projects;create policy projects_write on public.projects for insert to authenticated with check(created_by=auth.uid() and public.axentra_org_role(organization_id) in('member','admin','owner'));
drop policy if exists projects_update on public.projects;create policy projects_update on public.projects for update to authenticated using(public.axentra_org_role(organization_id) in('member','admin','owner')) with check(public.axentra_org_role(organization_id) in('member','admin','owner'));
drop policy if exists projects_delete on public.projects;create policy projects_delete on public.projects for delete to authenticated using(public.axentra_org_role(organization_id) in('admin','owner'));

do $$ declare table_name text; begin
 foreach table_name in array array['documents','datasets','dataset_versions','analyses','evidence','artifacts','reports','tasks','risks','issues','decisions','approvals','activities'] loop
  execute format('drop policy if exists %I_read on public.%I',table_name,table_name);execute format('create policy %I_read on public.%I for select to authenticated using(public.axentra_org_role(organization_id) is not null)',table_name,table_name);
  execute format('drop policy if exists %I_insert on public.%I',table_name,table_name);execute format('create policy %I_insert on public.%I for insert to authenticated with check(created_by=auth.uid() and public.axentra_org_role(organization_id) in (''member'',''admin'',''owner''))',table_name,table_name);
  execute format('drop policy if exists %I_update on public.%I',table_name,table_name);execute format('create policy %I_update on public.%I for update to authenticated using(public.axentra_org_role(organization_id) in (''member'',''admin'',''owner'')) with check(public.axentra_org_role(organization_id) in (''member'',''admin'',''owner''))',table_name,table_name);
  execute format('drop policy if exists %I_delete on public.%I',table_name,table_name);execute format('create policy %I_delete on public.%I for delete to authenticated using(public.axentra_org_role(organization_id) in (''admin'',''owner''))',table_name,table_name);
 end loop;
end $$;

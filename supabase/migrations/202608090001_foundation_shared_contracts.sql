-- Aureqin Foundation-0 shared contracts and provenance.
-- Additive; run after 202608080002_suite_interest_waitlist.sql.
-- This migration intentionally does not modify billing, auth, entitlement, or statistical logic.
create extension if not exists pgcrypto;

-- The project architecture migration is a required predecessor.
do $$
declare table_name text;
begin
  foreach table_name in array array['tasks','risks','issues','decisions','approvals','datasets','dataset_versions','analyses','evidence','artifacts','reports','activities'] loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise exception 'Required foundation table public.% does not exist. Run 202608070001_project_architecture_hardening.sql first.', table_name;
    end if;
  end loop;
end $$;

-- Reconcile common fields on existing necessarily project-scoped domain tables.
do $$
declare table_name text;
begin
  foreach table_name in array array['tasks','risks','issues','decisions','approvals','datasets','analyses','evidence','artifacts','reports','activities'] loop
    execute format('alter table public.%I add column if not exists owner_id uuid references auth.users(id)', table_name);
    execute format('alter table public.%I add column if not exists priority text', table_name);
    execute format('alter table public.%I add column if not exists source_type text', table_name);
    execute format('alter table public.%I add column if not exists source_id text', table_name);
    execute format('alter table public.%I add column if not exists suite text not null default ''platform''', table_name);
    execute format('alter table public.%I add column if not exists version integer not null default 1', table_name);
    execute format('alter table public.%I add column if not exists metadata jsonb not null default ''{}''::jsonb', table_name);
  end loop;
end $$;

alter table public.dataset_versions add column if not exists parent_version_id uuid references public.dataset_versions(id);
alter table public.dataset_versions add column if not exists fingerprint text;
alter table public.dataset_versions add column if not exists change_summary text;
alter table public.dataset_versions add column if not exists schema_metadata jsonb not null default '[]'::jsonb;

alter table public.analyses add column if not exists method text;
alter table public.analyses add column if not exists method_version text not null default '1';
-- Transitional cache only. analysis_dataset_versions below is authoritative.
alter table public.analyses add column if not exists dataset_version_ids uuid[] not null default '{}';
alter table public.analyses add column if not exists parameters jsonb not null default '{}'::jsonb;
alter table public.analyses add column if not exists variable_mapping jsonb not null default '{}'::jsonb;
alter table public.analyses add column if not exists result_schema_version text not null default '1';
alter table public.analyses add column if not exists validation_status text not null default 'UNVALIDATED';
alter table public.analyses add column if not exists executed_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'analyses_validation_status_check' and conrelid = 'public.analyses'::regclass) then
    alter table public.analyses add constraint analyses_validation_status_check
      check (validation_status in ('VALIDATED','PARTIALLY VALIDATED','UNVALIDATED')) not valid;
  end if;
end $$;

-- Findings are necessarily project-scoped because they originate from a project analysis or project source.
create table if not exists public.findings(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  owner_id uuid references auth.users(id),
  analysis_id uuid references public.analyses(id) on delete set null,
  finding_type text not null default 'statistical_finding', title text, statement text,
  severity text not null default 'info', status text not null default 'active', result_path text,
  source_type text, source_id text, suite text not null default 'platform', methodology text, lifecycle_phase text,
  version integer not null default 1, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Polymorphic links are project-scoped in Foundation-0. Their endpoint IDs cannot have ordinary FKs.
create table if not exists public.object_links(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  from_type text, from_id text, to_type text, to_id text,
  relationship text not null default 'references', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Organization-scoped primitives may optionally be associated with a project.
do $$
declare table_name text;
begin
  foreach table_name in array array['resources','costs','benefits','kpis','comments'] loop
    execute format('create table if not exists public.%I(
      id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
      project_id uuid references public.projects(id) on delete cascade, created_by uuid not null references auth.users(id),
      owner_id uuid references auth.users(id), title text, description text, status text not null default ''active'', priority text,
      source_type text, source_id text, suite text not null default ''platform'', methodology text, lifecycle_phase text,
      version integer not null default 1, content jsonb not null default ''{}''::jsonb, metadata jsonb not null default ''{}''::jsonb,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now())', table_name);
  end loop;
end $$;

-- CREATE TABLE IF NOT EXISTS does not repair partial tables. Add every column used later first.
do $$
declare table_name text;
begin
  foreach table_name in array array['resources','costs','benefits','kpis','comments'] loop
    execute format('alter table public.%I add column if not exists id uuid default gen_random_uuid()', table_name);
    execute format('alter table public.%I add column if not exists organization_id uuid references public.organizations(id) on delete cascade', table_name);
    execute format('alter table public.%I add column if not exists project_id uuid references public.projects(id) on delete cascade', table_name);
    execute format('alter table public.%I add column if not exists created_by uuid references auth.users(id)', table_name);
    execute format('alter table public.%I add column if not exists owner_id uuid references auth.users(id)', table_name);
    execute format('alter table public.%I add column if not exists title text', table_name);
    execute format('alter table public.%I add column if not exists description text', table_name);
    execute format('alter table public.%I add column if not exists status text not null default ''active''', table_name);
    execute format('alter table public.%I add column if not exists priority text', table_name);
    execute format('alter table public.%I add column if not exists source_type text', table_name);
    execute format('alter table public.%I add column if not exists source_id text', table_name);
    execute format('alter table public.%I add column if not exists suite text not null default ''platform''', table_name);
    execute format('alter table public.%I add column if not exists methodology text', table_name);
    execute format('alter table public.%I add column if not exists lifecycle_phase text', table_name);
    execute format('alter table public.%I add column if not exists version integer not null default 1', table_name);
    execute format('alter table public.%I add column if not exists content jsonb not null default ''{}''::jsonb', table_name);
    execute format('alter table public.%I add column if not exists metadata jsonb not null default ''{}''::jsonb', table_name);
    execute format('alter table public.%I add column if not exists created_at timestamptz not null default now()', table_name);
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', table_name);
  end loop;
end $$;

-- Reconcile findings before its indexes, constraints, and policies.
alter table public.findings add column if not exists id uuid default gen_random_uuid();
alter table public.findings add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.findings add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.findings add column if not exists created_by uuid references auth.users(id);
alter table public.findings add column if not exists owner_id uuid references auth.users(id);
alter table public.findings add column if not exists analysis_id uuid references public.analyses(id) on delete set null;
alter table public.findings add column if not exists finding_type text not null default 'statistical_finding';
alter table public.findings add column if not exists title text;
alter table public.findings add column if not exists statement text;
alter table public.findings add column if not exists severity text not null default 'info';
alter table public.findings add column if not exists status text not null default 'active';
alter table public.findings add column if not exists result_path text;
alter table public.findings add column if not exists source_type text;
alter table public.findings add column if not exists source_id text;
alter table public.findings add column if not exists suite text not null default 'platform';
alter table public.findings add column if not exists methodology text;
alter table public.findings add column if not exists lifecycle_phase text;
alter table public.findings add column if not exists version integer not null default 1;
alter table public.findings add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.findings add column if not exists created_at timestamptz not null default now();
alter table public.findings add column if not exists updated_at timestamptz not null default now();

-- Reconcile object_links before its indexes, constraints, and policies.
alter table public.object_links add column if not exists id uuid default gen_random_uuid();
alter table public.object_links add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.object_links add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.object_links add column if not exists created_by uuid references auth.users(id);
alter table public.object_links add column if not exists from_type text;
alter table public.object_links add column if not exists from_id text;
alter table public.object_links add column if not exists to_type text;
alter table public.object_links add column if not exists to_id text;
alter table public.object_links add column if not exists relationship text not null default 'references';
alter table public.object_links add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.object_links add column if not exists created_at timestamptz not null default now();

-- Authoritative many-to-many analysis provenance. An analysis can consume one or many immutable dataset versions.
create table if not exists public.analysis_dataset_versions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  dataset_version_id uuid not null references public.dataset_versions(id) on delete restrict,
  dataset_role text not null default 'primary',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

alter table public.analysis_dataset_versions add column if not exists id uuid default gen_random_uuid();
alter table public.analysis_dataset_versions add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.analysis_dataset_versions add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.analysis_dataset_versions add column if not exists analysis_id uuid references public.analyses(id) on delete cascade;
alter table public.analysis_dataset_versions add column if not exists dataset_version_id uuid references public.dataset_versions(id) on delete restrict;
alter table public.analysis_dataset_versions add column if not exists dataset_role text not null default 'primary';
alter table public.analysis_dataset_versions add column if not exists created_by uuid references auth.users(id);
alter table public.analysis_dataset_versions add column if not exists created_at timestamptz not null default now();
alter table public.analysis_dataset_versions add column if not exists metadata jsonb not null default '{}';

alter table public.resources add column if not exists resource_type text not null default 'person';
alter table public.resources add column if not exists capacity numeric;
alter table public.resources add column if not exists calendar_id text;
alter table public.resources add column if not exists capabilities jsonb not null default '[]'::jsonb;
alter table public.resources add column if not exists site_id text;
alter table public.resources add column if not exists availability jsonb not null default '{}'::jsonb;
alter table public.comments add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists subject_type text;
alter table public.comments add column if not exists subject_id text;
alter table public.activities add column if not exists event_type text;
alter table public.activities add column if not exists subject_type text;
alter table public.activities add column if not exists subject_id text;
alter table public.activities add column if not exists occurred_at timestamptz;

-- New rows must be organization-scoped. NOT VALID preserves any unreconciled legacy rows while enforcing future writes.
do $$
declare table_name text; constraint_name text;
begin
  foreach table_name in array array['resources','costs','benefits','kpis','comments','findings','object_links','analysis_dataset_versions'] loop
    constraint_name := table_name || '_organization_required';
    if not exists (select 1 from pg_constraint where conname = constraint_name and conrelid = format('public.%I', table_name)::regclass) then
      execute format('alter table public.%I add constraint %I check (organization_id is not null) not valid', table_name, constraint_name);
    end if;
  end loop;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'resources_resource_type_check' and conrelid = 'public.resources'::regclass) then
    alter table public.resources add constraint resources_resource_type_check
      check(resource_type in ('person','team','machine','work_center','facility')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'object_links_complete_check' and conrelid = 'public.object_links'::regclass) then
    alter table public.object_links add constraint object_links_complete_check
      check(project_id is not null and created_by is not null and from_type is not null and from_id is not null and to_type is not null and to_id is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'findings_complete_check' and conrelid = 'public.findings'::regclass) then
    alter table public.findings add constraint findings_complete_check
      check(project_id is not null and created_by is not null and statement is not null) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analysis_dataset_versions_complete_check' and conrelid = 'public.analysis_dataset_versions'::regclass) then
    alter table public.analysis_dataset_versions add constraint analysis_dataset_versions_complete_check
      check(analysis_id is not null and dataset_version_id is not null and created_by is not null) not valid;
  end if;
end $$;

-- Optional project references must still point to a project inside the row's organization.
create or replace function public.aureqin_validate_optional_project_scope()
returns trigger language plpgsql security invoker set search_path = public as $$
declare project_org uuid;
begin
  if new.project_id is null then return new; end if;
  select organization_id into project_org from public.projects where id = new.project_id;
  if project_org is null or project_org is distinct from new.organization_id then
    raise exception 'Referenced project must belong to the row organization';
  end if;
  return new;
end $$;
revoke all on function public.aureqin_validate_optional_project_scope() from public;
grant execute on function public.aureqin_validate_optional_project_scope() to authenticated;
do $$ declare table_name text; begin
  foreach table_name in array array['resources','costs','benefits','kpis','comments'] loop
    execute format('drop trigger if exists %I_project_scope on public.%I', table_name, table_name);
    execute format('create trigger %I_project_scope before insert or update of organization_id, project_id on public.%I for each row execute function public.aureqin_validate_optional_project_scope()', table_name, table_name);
  end loop;
end $$;

-- Organization consistency for analysis provenance is checked in the database and must also be checked by services.
create or replace function public.aureqin_validate_analysis_dataset_version_scope()
returns trigger language plpgsql security invoker set search_path = public as $$
declare analysis_org uuid; analysis_project uuid; version_org uuid; version_project uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':', new.analysis_id::text, new.dataset_version_id::text, new.dataset_role), 0));
  select organization_id, project_id into analysis_org, analysis_project from public.analyses where id = new.analysis_id;
  select organization_id, project_id into version_org, version_project from public.dataset_versions where id = new.dataset_version_id;
  if analysis_org is null or version_org is null then raise exception 'Analysis and dataset version must exist'; end if;
  if new.organization_id is distinct from analysis_org or new.organization_id is distinct from version_org then
    raise exception 'Analysis and dataset version must belong to the bridge organization';
  end if;
  if analysis_project is distinct from version_project then raise exception 'Analysis and dataset version must belong to the same project'; end if;
  if new.project_id is not null and new.project_id is distinct from analysis_project then raise exception 'Bridge project does not match provenance objects'; end if;
  if exists (
    select 1 from public.analysis_dataset_versions link
    where link.analysis_id = new.analysis_id and link.dataset_version_id = new.dataset_version_id
      and link.dataset_role = new.dataset_role and link.id is distinct from new.id
  ) then raise exception 'Duplicate analysis/dataset-version relationship'; end if;
  new.project_id := analysis_project;
  return new;
end $$;
revoke all on function public.aureqin_validate_analysis_dataset_version_scope() from public;
grant execute on function public.aureqin_validate_analysis_dataset_version_scope() to authenticated;
drop trigger if exists analysis_dataset_versions_scope on public.analysis_dataset_versions;
create trigger analysis_dataset_versions_scope before insert or update on public.analysis_dataset_versions
for each row execute function public.aureqin_validate_analysis_dataset_version_scope();

-- A polymorphic link cannot have ordinary endpoint FKs. This trigger prevents new duplicates and
-- cross-project rows; the service layer must additionally verify endpoint existence and scope.
create or replace function public.aureqin_validate_object_link_scope()
returns trigger language plpgsql security invoker set search_path = public as $$
declare project_org uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':', new.organization_id::text, new.project_id::text, new.from_type, new.from_id, new.to_type, new.to_id, new.relationship), 0));
  select organization_id into project_org from public.projects where id = new.project_id;
  if project_org is null or project_org is distinct from new.organization_id then raise exception 'Object link project must belong to its organization'; end if;
  if exists (
    select 1 from public.object_links link
    where link.organization_id = new.organization_id and link.project_id = new.project_id
      and link.from_type = new.from_type and link.from_id = new.from_id
      and link.to_type = new.to_type and link.to_id = new.to_id
      and link.relationship = new.relationship and link.id is distinct from new.id
  ) then raise exception 'Duplicate object link'; end if;
  return new;
end $$;
revoke all on function public.aureqin_validate_object_link_scope() from public;
grant execute on function public.aureqin_validate_object_link_scope() to authenticated;
drop trigger if exists object_links_scope on public.object_links;
create trigger object_links_scope before insert or update on public.object_links
for each row execute function public.aureqin_validate_object_link_scope();

-- Add database uniqueness when a partial predecessor has no legacy duplicates. The triggers above
-- continue to enforce new writes even if legacy duplicates require manual reconciliation first.
do $$ begin
  if not exists (
    select 1 from public.analysis_dataset_versions
    group by analysis_id, dataset_version_id, dataset_role having count(*) > 1
  ) then
    create unique index if not exists analysis_dataset_versions_unique_idx
      on public.analysis_dataset_versions(analysis_id, dataset_version_id, dataset_role);
  end if;
  if not exists (
    select 1 from public.object_links
    group by organization_id, project_id, from_type, from_id, to_type, to_id, relationship having count(*) > 1
  ) then
    create unique index if not exists object_links_unique_idx
      on public.object_links(organization_id, project_id, from_type, from_id, to_type, to_id, relationship);
  end if;
end $$;
create index if not exists findings_analysis_idx on public.findings(analysis_id);
create index if not exists findings_project_idx on public.findings(project_id, status);
create index if not exists object_links_from_idx on public.object_links(organization_id, project_id, from_type, from_id);
create index if not exists object_links_to_idx on public.object_links(organization_id, project_id, to_type, to_id);
create index if not exists analysis_dataset_versions_analysis_idx on public.analysis_dataset_versions(analysis_id);
create index if not exists analysis_dataset_versions_dataset_idx on public.analysis_dataset_versions(dataset_version_id);
-- Transitional cache index; do not use this array as authoritative provenance.
create index if not exists analyses_dataset_versions_cache_idx on public.analyses using gin(dataset_version_ids);

do $$ declare table_name text; begin
  foreach table_name in array array['findings','object_links','analysis_dataset_versions','resources','costs','benefits','kpis','comments'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I_read on public.%I',table_name,table_name);
    execute format('create policy %I_read on public.%I for select to authenticated using(public.axentra_org_role(organization_id) is not null)',table_name,table_name);
    execute format('drop policy if exists %I_insert on public.%I',table_name,table_name);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check(created_by=auth.uid() and public.axentra_org_role(organization_id) in (''member'',''admin'',''owner''))',table_name,table_name);
    execute format('drop policy if exists %I_update on public.%I',table_name,table_name);
    execute format('create policy %I_update on public.%I for update to authenticated using(public.axentra_org_role(organization_id) in (''member'',''admin'',''owner'')) with check(public.axentra_org_role(organization_id) in (''member'',''admin'',''owner''))',table_name,table_name);
    execute format('drop policy if exists %I_delete on public.%I',table_name,table_name);
    execute format('create policy %I_delete on public.%I for delete to authenticated using(public.axentra_org_role(organization_id) in (''admin'',''owner''))',table_name,table_name);
  end loop;
end $$;

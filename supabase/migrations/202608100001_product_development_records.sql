-- Apply after 202608090001_foundation_shared_contracts.sql. Do not execute from the client.
create table if not exists public.product_requirements(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade, requirement_key text not null,
 title text not null, description text not null default '', source text not null default '', category text not null default 'Product',
 priority text not null default 'Medium', owner text not null default '', status text not null default 'Draft', readiness_state text not null default 'Not Assessable',
 revision integer not null default 1, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 unique(organization_id,project_id,requirement_key), check(revision>0)
);
create table if not exists public.product_ctqs(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade, ctq_key text not null, requirement_ids uuid[] not null default '{}',
 name text not null, description text not null default '', characteristic_type text not null default 'Continuous', unit text not null default '',
 target numeric, lsl numeric, usl numeric, tolerance_direction text not null default 'Bilateral', measurement_method text not null default '', owner text not null default '', status text not null default 'Draft', rationale text not null default '',
 revision integer not null default 1, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 unique(organization_id,project_id,ctq_key), check(revision>0), check(tolerance_direction in ('Bilateral','Lower','Upper'))
);
create table if not exists public.product_verifications(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade, verification_key text not null,
 requirement_ids uuid[] not null default '{}', ctq_ids uuid[] not null default '{}', test_name text not null, purpose text not null default '', verification_method text not null default '', test_type text not null default '',
 sample_size integer, sample_definition text not null default '', conditions text not null default '', equipment text not null default '', measurement_system text not null default '', acceptance_criterion text not null default '', owner text not null default '',
 planned_start date, planned_end date, actual_start date, actual_end date, status text not null default 'Draft', result text not null default 'Inconclusive', rationale text not null default '', comments text not null default '', evidence_required boolean not null default true,
 linked_analysis_ids uuid[] not null default '{}', linked_reliability_analysis_ids uuid[] not null default '{}', linked_finding_ids uuid[] not null default '{}', sort_order integer not null default 0,
 revision integer not null default 1, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 unique(organization_id,project_id,verification_key), check(revision>0), check(sample_size is null or sample_size>0),
 check(status in ('Draft','Planned','Ready','In Progress','Awaiting Evidence','Passed','Failed','Inconclusive','Waived')),
 check(result in ('Pass','Fail','Inconclusive','Not Applicable'))
);
create table if not exists public.product_record_revisions(
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade, record_type text not null, record_id uuid not null,
 revision integer not null, changes jsonb not null, rationale text not null default '', created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 check(record_type in ('requirement','ctq','verification')), check(revision>1)
);
create index if not exists product_requirements_project_idx on public.product_requirements(organization_id,project_id,status);
create index if not exists product_ctqs_project_idx on public.product_ctqs(organization_id,project_id,status);
create index if not exists product_verifications_project_idx on public.product_verifications(organization_id,project_id,status,sort_order);
create index if not exists product_revisions_record_idx on public.product_record_revisions(record_type,record_id,revision desc);

create or replace function public.aureqin_product_record_scope() returns trigger language plpgsql security invoker set search_path=public as $$
declare project_org uuid; begin
 select organization_id into project_org from public.projects where id=new.project_id;
 if project_org is null or project_org is distinct from new.organization_id then raise exception 'Product-development record project/organization mismatch'; end if;
 new.updated_at=now(); return new;
end $$;
revoke all on function public.aureqin_product_record_scope() from public;
grant execute on function public.aureqin_product_record_scope() to authenticated;
do $$ declare table_name text; begin
 foreach table_name in array array['product_requirements','product_ctqs','product_verifications'] loop
  execute format('drop trigger if exists product_record_scope on public.%I',table_name);
  execute format('create trigger product_record_scope before insert or update on public.%I for each row execute function public.aureqin_product_record_scope()',table_name);
 end loop;
end $$;

do $$ declare table_name text; begin
 foreach table_name in array array['product_requirements','product_ctqs','product_verifications','product_record_revisions'] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('create policy %I_read on public.%I for select to authenticated using(public.axentra_org_role(organization_id) is not null)',table_name,table_name);
  execute format('create policy %I_insert on public.%I for insert to authenticated with check(created_by=auth.uid() and public.axentra_org_role(organization_id) in (''member'',''admin'',''owner''))',table_name,table_name);
  execute format('create policy %I_update on public.%I for update to authenticated using(public.axentra_org_role(organization_id) in (''member'',''admin'',''owner'')) with check(public.axentra_org_role(organization_id) in (''member'',''admin'',''owner''))',table_name,table_name);
  execute format('create policy %I_delete on public.%I for delete to authenticated using(public.axentra_org_role(organization_id) in (''admin'',''owner''))',table_name,table_name);
 end loop;
end $$;

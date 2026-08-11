-- Apply after 202608100001_product_development_records.sql. Do not execute from the client.
create table if not exists public.lean_records(
 id uuid primary key, organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade, record_type text not null, title text not null,
 status text not null default 'Draft', revision integer not null default 1, prior_revision_id uuid, is_current boolean not null default true,
 owner_id uuid references auth.users(id), created_by uuid not null references auth.users(id), updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), effective_at timestamptz,
 change_summary text not null default 'Initial version', payload jsonb not null default '{}', metadata jsonb not null default '{}',
 check(revision>0), check(record_type in ('value-stream-map','standard-work','yamazumi','kanban-loop','heijunka','smed','a3','kaizen','kaizen-event','gemba-observation','process-audit','daily-management','abnormality','x-matrix','catchball','sustainment'))
);
create table if not exists public.lean_record_revisions(
 id uuid primary key, organization_id uuid not null references public.organizations(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade, record_id uuid not null references public.lean_records(id) on delete cascade,
 revision integer not null, prior_revision integer not null, snapshot jsonb not null, changes jsonb not null, change_summary text not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(record_id,revision), check(revision=prior_revision+1)
);
create index if not exists lean_records_scope_idx on public.lean_records(organization_id,project_id,record_type,is_current,updated_at desc);
create index if not exists lean_revisions_record_idx on public.lean_record_revisions(organization_id,project_id,record_id,revision desc);
create or replace function public.aureqin_lean_record_scope() returns trigger language plpgsql security invoker set search_path=public as $$
declare project_org uuid; begin select organization_id into project_org from public.projects where id=new.project_id;
 if project_org is null or project_org is distinct from new.organization_id then raise exception 'Lean record project/organization mismatch'; end if;
 if tg_table_name='lean_records' then new.updated_at=now(); end if; return new; end $$;
revoke all on function public.aureqin_lean_record_scope() from public; grant execute on function public.aureqin_lean_record_scope() to authenticated;
create trigger lean_record_scope before insert or update on public.lean_records for each row execute function public.aureqin_lean_record_scope();
create trigger lean_revision_scope before insert or update on public.lean_record_revisions for each row execute function public.aureqin_lean_record_scope();
alter table public.lean_records enable row level security; alter table public.lean_record_revisions enable row level security;
create policy lean_records_read on public.lean_records for select to authenticated using(public.axentra_org_role(organization_id) is not null);
create policy lean_records_insert on public.lean_records for insert to authenticated with check(created_by=auth.uid() and updated_by=auth.uid() and public.axentra_org_role(organization_id) in ('member','admin','owner'));
create policy lean_records_update on public.lean_records for update to authenticated using(public.axentra_org_role(organization_id) in ('member','admin','owner')) with check(updated_by=auth.uid() and public.axentra_org_role(organization_id) in ('member','admin','owner'));
create policy lean_records_delete on public.lean_records for delete to authenticated using(public.axentra_org_role(organization_id) in ('admin','owner'));
create policy lean_revisions_read on public.lean_record_revisions for select to authenticated using(public.axentra_org_role(organization_id) is not null);
create policy lean_revisions_insert on public.lean_record_revisions for insert to authenticated with check(created_by=auth.uid() and public.axentra_org_role(organization_id) in ('member','admin','owner'));
create policy lean_revisions_update on public.lean_record_revisions for update to authenticated using(false);
create policy lean_revisions_delete on public.lean_record_revisions for delete to authenticated using(false);

-- Phase 4: project file and asset repository. Additive and safe to apply after any prior
-- migration. Mirrors the project-owned PM tables (tasks/risks/issues/decisions/approvals) added in
-- 202608070001_project_architecture_hardening.sql and given org/project-scoped RLS in
-- 202608130006_pm_canonical_api_grants.sql — same organization_id/project_id/created_by/suite/
-- version bookkeeping columns, same policy shape — plus the asset-specific structured columns
-- src/repositories/assetRepository.js reads and writes directly (not a generic content jsonb blob,
-- since the asset record has a fixed, known shape callers query by).
create table if not exists public.assets(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  suite text not null default 'platform',
  name text not null,
  description text not null default '',
  type text not null default 'other' check(type in('document','image','spreadsheet','presentation','data','url','video','other')),
  mime_type text not null default '',
  size bigint not null default 0 check(size>=0),
  url text not null,
  storage_path text,
  tags text[] not null default '{}',
  stage text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  links jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assets_project_id_idx on public.assets(project_id);
create index if not exists assets_stage_idx on public.assets(stage);

alter table public.assets enable row level security;

grant select, insert, update, delete on table public.assets to authenticated;

drop policy if exists assets_read on public.assets;
create policy assets_read on public.assets for select to authenticated using(
  public.axentra_org_role(organization_id) is not null
  and public.aureqin_project_belongs_to_organization(project_id, organization_id)
);
drop policy if exists assets_insert on public.assets;
create policy assets_insert on public.assets for insert to authenticated with check(
  created_by=auth.uid()
  and public.axentra_org_role(organization_id) in('member','admin','owner')
  and public.aureqin_project_belongs_to_organization(project_id, organization_id)
);
drop policy if exists assets_update on public.assets;
create policy assets_update on public.assets for update to authenticated using(
  public.axentra_org_role(organization_id) in('member','admin','owner')
  and public.aureqin_project_belongs_to_organization(project_id, organization_id)
) with check(
  public.axentra_org_role(organization_id) in('member','admin','owner')
  and public.aureqin_project_belongs_to_organization(project_id, organization_id)
);
drop policy if exists assets_delete on public.assets;
create policy assets_delete on public.assets for delete to authenticated using(
  public.axentra_org_role(organization_id) in('admin','owner')
  and public.aureqin_project_belongs_to_organization(project_id, organization_id)
);

-- Storage: file bytes for uploaded assets live in a private 'project-assets' bucket, never in
-- localStorage or a jsonb column. Objects are keyed '{project_id}/{asset_id}/{filename}'.
--
-- QA note (2026-08-19): the org-role-scoped versions of these three policies previously here
-- (joining back to public.projects via split_part(name,'/',1)::uuid and checking
-- axentra_org_role(...)) were broken live — the write policy's WITH CHECK evaluated to a NULL
-- qual, and the read/delete policies were casting a project *name* to uuid instead of the path's
-- project id segment, surfacing as "invalid input syntax for type uuid: <project name>" on every
-- storage write. Fixed live in the Supabase dashboard by dropping and recreating all three as
-- simple bucket-scoped rules; this migration is updated to match. These intentionally do NOT
-- re-check organization/project membership — any authenticated user can read/write/delete any
-- object in this bucket. Re-adding org-scoped access control (correctly this time) is tracked as
-- follow-up work, not done here.
insert into storage.buckets (id, name, public)
  values ('project-assets','project-assets', false)
  on conflict (id) do nothing;

drop policy if exists project_assets_read on storage.objects;
create policy project_assets_read on storage.objects for select to authenticated using(
  bucket_id='project-assets'
);
drop policy if exists project_assets_write on storage.objects;
create policy project_assets_write on storage.objects for insert to authenticated with check(
  bucket_id='project-assets'
);
drop policy if exists project_assets_delete on storage.objects;
create policy project_assets_delete on storage.objects for delete to authenticated using(
  bucket_id='project-assets'
);

notify pgrst, 'reload schema';

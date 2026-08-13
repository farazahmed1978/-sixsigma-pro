-- Reconcile public.datasets when it predates the project architecture migration.
-- CREATE TABLE IF NOT EXISTS does not add missing columns to a partial legacy table.
create extension if not exists pgcrypto;

alter table public.datasets add column if not exists id uuid default gen_random_uuid();
alter table public.datasets add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.datasets add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.datasets add column if not exists title text;
alter table public.datasets add column if not exists description text;
alter table public.datasets add column if not exists source text;
alter table public.datasets add column if not exists created_by uuid references auth.users(id);
alter table public.datasets add column if not exists status text not null default 'active';
alter table public.datasets add column if not exists methodology text;
alter table public.datasets add column if not exists lifecycle_phase text;
alter table public.datasets add column if not exists dmaic_phase text;
alter table public.datasets add column if not exists version integer not null default 1;
alter table public.datasets add column if not exists row_count integer not null default 0;
alter table public.datasets add column if not exists column_count integer not null default 0;
alter table public.datasets add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.datasets add column if not exists created_at timestamptz not null default now();
alter table public.datasets add column if not exists updated_at timestamptz not null default now();

-- Enforce ownership for new rows without failing on any unreconciled legacy rows.
do $$ begin
 if not exists (
  select 1 from pg_constraint
  where conname='datasets_ownership_required' and conrelid='public.datasets'::regclass
 ) then
  alter table public.datasets add constraint datasets_ownership_required
   check (organization_id is not null and project_id is not null and created_by is not null) not valid;
 end if;
end $$;

create index if not exists datasets_organization_project_idx
 on public.datasets(organization_id,project_id,status);

notify pgrst,'reload schema';

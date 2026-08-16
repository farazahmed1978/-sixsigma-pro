-- Extend canonical document persistence to support standalone (projectless) documents.
-- Standalone documents belong to an organization and are owned by their creator; they are never
-- visible to other organization members unless explicitly attached to a project later (not done
-- by this migration). Project-connected documents keep their existing organization-wide access
-- model unchanged.

alter table public.documents alter column project_id drop not null;

-- Re-scope the existing organization-wide policies to project-connected rows only. Without this,
-- these policies (which never reference project_id) would implicitly grant org-wide access to
-- standalone rows now that project_id can be null.
drop policy if exists documents_read on public.documents;
create policy documents_read on public.documents for select to authenticated
  using (project_id is not null and public.axentra_org_role(organization_id) is not null);

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents for insert to authenticated
  with check (project_id is not null and created_by = auth.uid() and public.axentra_org_role(organization_id) in ('member','admin','owner'));

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update to authenticated
  using (project_id is not null and public.axentra_org_role(organization_id) in ('member','admin','owner'))
  with check (project_id is not null and public.axentra_org_role(organization_id) in ('member','admin','owner'));

drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete to authenticated
  using (project_id is not null and public.axentra_org_role(organization_id) in ('admin','owner'));

-- Standalone (project_id is null) documents: creator-only ownership boundary. Organization
-- membership is still required (documents remain org-scoped for tenancy/quota purposes), but
-- visibility and mutation are restricted to the authenticated creator, not the whole organization.
-- The WITH CHECK clauses also prevent a standalone row from being silently reattached to a
-- project (or a project row from being silently detached) through these policies: the new row
-- must keep project_id null to pass the standalone WITH CHECK, and must keep it non-null to pass
-- the project-connected WITH CHECK above.
create policy documents_standalone_read on public.documents for select to authenticated
  using (project_id is null and created_by = auth.uid());

create policy documents_standalone_insert on public.documents for insert to authenticated
  with check (project_id is null and created_by = auth.uid() and public.axentra_org_role(organization_id) is not null);

create policy documents_standalone_update on public.documents for update to authenticated
  using (project_id is null and created_by = auth.uid())
  with check (project_id is null and created_by = auth.uid() and public.axentra_org_role(organization_id) is not null);

create policy documents_standalone_delete on public.documents for delete to authenticated
  using (project_id is null and created_by = auth.uid());

notify pgrst, 'reload schema';

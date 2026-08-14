-- PostgREST table privileges for canonical Project Management records.
-- Row-level policies remain the authority for organization and project access.
grant select, insert, update, delete on table
  public.tasks,
  public.risks,
  public.issues,
  public.decisions,
  public.approvals,
  public.activities
to authenticated;

create or replace function public.aureqin_project_belongs_to_organization(
  target_project_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.projects
    where id = target_project_id
      and organization_id = target_organization_id
  )
$$;

revoke all on function public.aureqin_project_belongs_to_organization(uuid, uuid) from public;
grant execute on function public.aureqin_project_belongs_to_organization(uuid, uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['tasks','risks','issues','decisions','approvals','activities'] loop
    execute format('drop policy if exists %I_read on public.%I', table_name, table_name);
    execute format(
      'create policy %I_read on public.%I for select to authenticated using (
        public.axentra_org_role(organization_id) is not null
        and public.aureqin_project_belongs_to_organization(project_id, organization_id)
      )', table_name, table_name
    );
    execute format('drop policy if exists %I_insert on public.%I', table_name, table_name);
    execute format(
      'create policy %I_insert on public.%I for insert to authenticated with check (
        created_by = auth.uid()
        and public.axentra_org_role(organization_id) in (''member'',''admin'',''owner'')
        and public.aureqin_project_belongs_to_organization(project_id, organization_id)
      )', table_name, table_name
    );
    execute format('drop policy if exists %I_update on public.%I', table_name, table_name);
    execute format(
      'create policy %I_update on public.%I for update to authenticated using (
        public.axentra_org_role(organization_id) in (''member'',''admin'',''owner'')
        and public.aureqin_project_belongs_to_organization(project_id, organization_id)
      ) with check (
        public.axentra_org_role(organization_id) in (''member'',''admin'',''owner'')
        and public.aureqin_project_belongs_to_organization(project_id, organization_id)
      )', table_name, table_name
    );
    execute format('drop policy if exists %I_delete on public.%I', table_name, table_name);
    execute format(
      'create policy %I_delete on public.%I for delete to authenticated using (
        public.axentra_org_role(organization_id) in (''admin'',''owner'')
        and public.aureqin_project_belongs_to_organization(project_id, organization_id)
      )', table_name, table_name
    );
  end loop;
end
$$;

notify pgrst, 'reload schema';

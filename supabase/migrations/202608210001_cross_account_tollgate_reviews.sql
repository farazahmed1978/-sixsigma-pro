-- Cross-account Operational Excellence Tollgate review access.
-- Assigned reviewers receive read access only to the assigned project's review evidence and
-- update access only to the canonical assigned Tollgate approval. They do not become members.

create or replace function public.aureqin_is_assigned_tollgate_reviewer(
  target_project_id uuid,
  target_approval_id uuid default null
) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.approvals a
    where a.project_id = target_project_id
      and (target_approval_id is null or a.id = target_approval_id)
      and a.suite = 'operational-excellence'
      and a.content->>'item_type' = 'oe-dmaic-tollgate'
      and (
        a.content->>'assignedReviewerId' = auth.uid()::text
        or lower(a.content->>'assignedReviewerEmail') = lower(coalesce(auth.jwt()->>'email', ''))
      )
  )
$$;

revoke all on function public.aureqin_is_assigned_tollgate_reviewer(uuid, uuid) from public;
grant execute on function public.aureqin_is_assigned_tollgate_reviewer(uuid, uuid) to authenticated;

drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using(
  public.axentra_org_role(organization_id) is not null
  or public.aureqin_is_assigned_tollgate_reviewer(id, null)
);

drop policy if exists approvals_read on public.approvals;
create policy approvals_read on public.approvals for select to authenticated using(
  (public.axentra_org_role(organization_id) is not null
    and public.aureqin_project_belongs_to_organization(project_id, organization_id))
  or public.aureqin_is_assigned_tollgate_reviewer(project_id, id)
);

drop policy if exists approvals_update on public.approvals;
create policy approvals_update on public.approvals for update to authenticated using(
  (public.axentra_org_role(organization_id) in ('member','admin','owner')
    and public.aureqin_project_belongs_to_organization(project_id, organization_id))
  or (
    public.aureqin_is_assigned_tollgate_reviewer(project_id, id)
    and coalesce(content->>'submittedBy','') <> auth.uid()::text
  )
) with check(
  (public.axentra_org_role(organization_id) in ('member','admin','owner')
    and public.aureqin_project_belongs_to_organization(project_id, organization_id))
  or (
    public.aureqin_is_assigned_tollgate_reviewer(project_id, id)
    and coalesce(content->>'submittedBy','') <> auth.uid()::text
  )
);

do $$
declare table_name text;
begin
  foreach table_name in array array['documents','evidence','artifacts','assets'] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop policy if exists %I_assigned_tollgate_read on public.%I', table_name, table_name);
      execute format(
        'create policy %I_assigned_tollgate_read on public.%I for select to authenticated using (
          project_id is not null and public.aureqin_is_assigned_tollgate_reviewer(project_id, null)
        )', table_name, table_name
      );
    end if;
  end loop;
end $$;

create or replace function public.aureqin_advance_define_after_tollgate_approval()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'Approved'
     and old.status is distinct from new.status
     and new.suite = 'operational-excellence'
     and new.content->>'item_type' = 'oe-dmaic-tollgate'
     and new.content->>'phase' = 'Define' then
    update public.projects
       set current_phase = 'Measure',
           content = jsonb_set(coalesce(content, '{}'::jsonb), '{currentPhase}', '"Measure"'::jsonb, true),
           updated_at = now()
     where id = new.project_id and organization_id = new.organization_id;
  end if;
  return new;
end
$$;

drop trigger if exists aureqin_advance_define_after_tollgate_approval on public.approvals;
create trigger aureqin_advance_define_after_tollgate_approval
after update of status on public.approvals
for each row execute function public.aureqin_advance_define_after_tollgate_approval();

notify pgrst, 'reload schema';

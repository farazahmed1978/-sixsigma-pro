-- PostgREST requires table privileges in addition to row-level policies.
-- Keep browser access limited to canonical user/workspace records; RLS remains
-- the authority for which rows each authenticated user may access.
grant select, insert, update, delete on table
  public.profiles,
  public.organizations,
  public.organization_memberships,
  public.projects,
  public.documents,
  public.datasets,
  public.dataset_versions,
  public.evidence,
  public.user_preferences
to authenticated;

notify pgrst, 'reload schema';

-- PostgREST requires table privileges in addition to row-level policies. analyses, artifacts,
-- and reports already have RLS enabled and matching policies (202608070001), but were left out
-- of the canonical authenticated grant list (202608130003), causing authenticated inserts to
-- fail with 42501 permission denied before RLS is ever evaluated. RLS remains the authority
-- for which rows each authenticated user may access.
grant select, insert, update, delete on table
  public.analyses,
  public.artifacts,
  public.reports
to authenticated;

notify pgrst, 'reload schema';

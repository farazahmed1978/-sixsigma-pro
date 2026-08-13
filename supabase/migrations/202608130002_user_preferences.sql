-- Canonical per-user application preferences.
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (created_by = user_id)
);

alter table public.user_preferences enable row level security;

create policy user_preferences_self
on public.user_preferences
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and created_by = auth.uid());

create or replace function public.aureqin_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_preferences_touch_updated_at
before update on public.user_preferences
for each row execute function public.aureqin_touch_updated_at();

notify pgrst, 'reload schema';

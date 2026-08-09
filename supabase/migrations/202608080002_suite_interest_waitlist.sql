-- Server-managed suite-interest waitlist. Run after billing foundation.
create extension if not exists pgcrypto;
create table if not exists public.suite_interest (id uuid primary key default gen_random_uuid(),user_id uuid,email text not null,suite_key text not null,source text not null default 'suite-overview',status text not null default 'interested',created_at timestamptz not null default now(),updated_at timestamptz not null default now());

alter table public.suite_interest add column if not exists id uuid not null default gen_random_uuid();
alter table public.suite_interest add column if not exists user_id uuid;
alter table public.suite_interest add column if not exists email text;
alter table public.suite_interest add column if not exists suite_key text;
alter table public.suite_interest add column if not exists source text not null default 'suite-overview';
alter table public.suite_interest add column if not exists status text not null default 'interested';
alter table public.suite_interest add column if not exists created_at timestamptz not null default now();
alter table public.suite_interest add column if not exists updated_at timestamptz not null default now();

do $$ begin
 if not exists(select 1 from pg_constraint where conname='suite_interest_user_id_fkey' and conrelid='public.suite_interest'::regclass) then alter table public.suite_interest add constraint suite_interest_user_id_fkey foreign key(user_id) references auth.users(id) on delete set null not valid; end if;
 if not exists(select 1 from pg_constraint where conname='suite_interest_suite_key_fkey' and conrelid='public.suite_interest'::regclass) then alter table public.suite_interest add constraint suite_interest_suite_key_fkey foreign key(suite_key) references public.suites(id) on delete cascade not valid; end if;
 if not exists(select 1 from pg_constraint where conname='suite_interest_email_lower_check' and conrelid='public.suite_interest'::regclass) then alter table public.suite_interest add constraint suite_interest_email_lower_check check(email=lower(email)) not valid; end if;
 if not exists(select 1 from pg_constraint where conname='suite_interest_status_check' and conrelid='public.suite_interest'::regclass) then alter table public.suite_interest add constraint suite_interest_status_check check(status in('interested','contacted','converted','unsubscribed')) not valid; end if;
end $$;

create unique index if not exists suite_interest_email_suite_uidx on public.suite_interest(email,suite_key);
create index if not exists suite_interest_suite_status_idx on public.suite_interest(suite_key,status,created_at desc);
alter table public.suite_interest enable row level security;
revoke all on public.suite_interest from anon,authenticated;
comment on table public.suite_interest is 'Server-managed suite interest registrations; no browser-client policies are granted.';

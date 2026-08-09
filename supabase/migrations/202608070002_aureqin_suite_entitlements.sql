-- Aureqin suite, commercial catalog, entitlement, and AI-metering foundation.
-- Safe after 202608070001_project_architecture_hardening.sql. This migration
-- reconciles partially-created legacy tables before using their columns.

create extension if not exists pgcrypto;

-- 1. Create every relation in dependency order. Foreign keys are added later so
-- pre-existing partial tables can first be reconciled.
create table if not exists public.suites (id text primary key,name text not null,status text not null check(status in('active','trial','locked','coming_soon')),metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.subscription_products (id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,product_type text not null check(product_type in('suite','bundle','addon','enterprise')),status text not null default 'active',provider_product_id text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.subscription_plans (id uuid primary key default gen_random_uuid(),product_id uuid,code text not null unique,name text not null,audience text not null check(audience in('individual','team','enterprise')),seat_allowance integer,storage_bytes bigint,ai_token_allowance bigint,trial_days integer not null default 0,grandfatherable boolean not null default false,status text not null default 'active',metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.subscription_prices (id uuid primary key default gen_random_uuid(),plan_id uuid,currency text not null default 'usd',unit_amount integer not null check(unit_amount>=0),billing_interval text check(billing_interval in('month','year','one_time','contract')),price_kind text not null check(price_kind in('founding','regular','contract','grandfathered')),provider_price_id text,status text not null default 'active',starts_at timestamptz,ends_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.subscriptions (id uuid primary key default gen_random_uuid(),organization_id uuid not null,plan_id uuid,price_id uuid,status text not null default 'trialing' check(status in('trialing','active','past_due','paused','canceled','expired')),provider text,provider_customer_id text,provider_subscription_id text,seat_quantity integer not null default 1,current_period_start timestamptz,current_period_end timestamptz,trial_ends_at timestamptz,cancel_at timestamptz,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.suite_entitlements (id uuid primary key default gen_random_uuid(),organization_id uuid not null,suite_id text not null,subscription_id uuid,status text not null default 'locked' check(status in('active','trial','locked','coming_soon')),source text not null default 'manual',starts_at timestamptz,ends_at timestamptz,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(organization_id,suite_id));
create table if not exists public.ai_usage_events (id uuid primary key default gen_random_uuid(),organization_id uuid not null,user_id uuid not null,project_id uuid,suite_id text,operation_type text not null,model text not null,input_tokens bigint not null default 0 check(input_tokens>=0),output_tokens bigint not null default 0 check(output_tokens>=0),estimated_cost numeric(14,6) not null default 0 check(estimated_cost>=0),allowance_consumed bigint not null default 0 check(allowance_consumed>=0),occurred_at timestamptz not null default now(),metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create table if not exists public.ai_allowance_periods (id uuid primary key default gen_random_uuid(),organization_id uuid not null,subscription_id uuid,period_start timestamptz not null,period_end timestamptz not null,token_allowance bigint not null default 0,consumed_tokens bigint not null default 0,overage_tokens bigint not null default 0,status text not null default 'active',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(organization_id,period_start,period_end),check(period_end>period_start));

-- 2. Reconcile all columns before any statement references them.
alter table public.suites add column if not exists id text;
alter table public.suites add column if not exists name text;
alter table public.suites add column if not exists status text;
alter table public.suites add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.suites add column if not exists created_at timestamptz not null default now();
alter table public.suites add column if not exists updated_at timestamptz not null default now();

alter table public.subscription_products add column if not exists code text;
alter table public.subscription_products add column if not exists id uuid not null default gen_random_uuid();
alter table public.subscription_products add column if not exists name text;
alter table public.subscription_products add column if not exists product_type text;
alter table public.subscription_products add column if not exists status text not null default 'active';
alter table public.subscription_products add column if not exists provider_product_id text;
alter table public.subscription_products add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.subscription_products add column if not exists created_at timestamptz not null default now();
alter table public.subscription_products add column if not exists updated_at timestamptz not null default now();

alter table public.subscription_plans add column if not exists product_id uuid;
alter table public.subscription_plans add column if not exists id uuid not null default gen_random_uuid();
alter table public.subscription_plans add column if not exists code text;
alter table public.subscription_plans add column if not exists name text;
alter table public.subscription_plans add column if not exists audience text;
alter table public.subscription_plans add column if not exists seat_allowance integer;
alter table public.subscription_plans add column if not exists storage_bytes bigint;
alter table public.subscription_plans add column if not exists ai_token_allowance bigint;
alter table public.subscription_plans add column if not exists trial_days integer not null default 0;
alter table public.subscription_plans add column if not exists grandfatherable boolean not null default false;
alter table public.subscription_plans add column if not exists status text not null default 'active';
alter table public.subscription_plans add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.subscription_plans add column if not exists created_at timestamptz not null default now();
alter table public.subscription_plans add column if not exists updated_at timestamptz not null default now();

alter table public.subscription_prices add column if not exists plan_id uuid;
alter table public.subscription_prices add column if not exists id uuid not null default gen_random_uuid();
alter table public.subscription_prices add column if not exists currency text not null default 'usd';
alter table public.subscription_prices add column if not exists unit_amount integer;
alter table public.subscription_prices add column if not exists billing_interval text;
alter table public.subscription_prices add column if not exists price_kind text;
alter table public.subscription_prices add column if not exists provider_price_id text;
alter table public.subscription_prices add column if not exists status text not null default 'active';
alter table public.subscription_prices add column if not exists starts_at timestamptz;
alter table public.subscription_prices add column if not exists ends_at timestamptz;
alter table public.subscription_prices add column if not exists created_at timestamptz not null default now();
alter table public.subscription_prices add column if not exists updated_at timestamptz not null default now();

alter table public.subscriptions add column if not exists organization_id uuid;
alter table public.subscriptions add column if not exists id uuid not null default gen_random_uuid();
alter table public.subscriptions add column if not exists plan_id uuid;
alter table public.subscriptions add column if not exists price_id uuid;
alter table public.subscriptions add column if not exists status text not null default 'trialing';
alter table public.subscriptions add column if not exists provider text;
alter table public.subscriptions add column if not exists provider_customer_id text;
alter table public.subscriptions add column if not exists provider_subscription_id text;
alter table public.subscriptions add column if not exists seat_quantity integer not null default 1;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.subscriptions add column if not exists cancel_at timestamptz;
alter table public.subscriptions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

alter table public.suite_entitlements add column if not exists organization_id uuid;
alter table public.suite_entitlements add column if not exists id uuid not null default gen_random_uuid();
alter table public.suite_entitlements add column if not exists suite_id text;
alter table public.suite_entitlements add column if not exists subscription_id uuid;
alter table public.suite_entitlements add column if not exists status text not null default 'locked';
alter table public.suite_entitlements add column if not exists source text not null default 'manual';
alter table public.suite_entitlements add column if not exists starts_at timestamptz;
alter table public.suite_entitlements add column if not exists ends_at timestamptz;
alter table public.suite_entitlements add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.suite_entitlements add column if not exists created_at timestamptz not null default now();
alter table public.suite_entitlements add column if not exists updated_at timestamptz not null default now();

alter table public.ai_usage_events add column if not exists organization_id uuid;
alter table public.ai_usage_events add column if not exists id uuid not null default gen_random_uuid();
alter table public.ai_usage_events add column if not exists user_id uuid;
alter table public.ai_usage_events add column if not exists project_id uuid;
alter table public.ai_usage_events add column if not exists suite_id text;
alter table public.ai_usage_events add column if not exists operation_type text;
alter table public.ai_usage_events add column if not exists model text;
alter table public.ai_usage_events add column if not exists input_tokens bigint not null default 0;
alter table public.ai_usage_events add column if not exists output_tokens bigint not null default 0;
alter table public.ai_usage_events add column if not exists estimated_cost numeric(14,6) not null default 0;
alter table public.ai_usage_events add column if not exists allowance_consumed bigint not null default 0;
alter table public.ai_usage_events add column if not exists occurred_at timestamptz not null default now();
alter table public.ai_usage_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.ai_usage_events add column if not exists created_at timestamptz not null default now();

alter table public.ai_allowance_periods add column if not exists organization_id uuid;
alter table public.ai_allowance_periods add column if not exists id uuid not null default gen_random_uuid();
alter table public.ai_allowance_periods add column if not exists subscription_id uuid;
alter table public.ai_allowance_periods add column if not exists period_start timestamptz;
alter table public.ai_allowance_periods add column if not exists period_end timestamptz;
alter table public.ai_allowance_periods add column if not exists token_allowance bigint not null default 0;
alter table public.ai_allowance_periods add column if not exists consumed_tokens bigint not null default 0;
alter table public.ai_allowance_periods add column if not exists overage_tokens bigint not null default 0;
alter table public.ai_allowance_periods add column if not exists status text not null default 'active';
alter table public.ai_allowance_periods add column if not exists created_at timestamptz not null default now();
alter table public.ai_allowance_periods add column if not exists updated_at timestamptz not null default now();

-- Generated total is added only after its inputs exist.
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ai_usage_events' and column_name='total_tokens') then
  alter table public.ai_usage_events add column total_tokens bigint generated always as(input_tokens+output_tokens) stored;
 end if;
end $$;

-- 3. Add keys and validation after all referenced relations/columns exist.
create unique index if not exists suites_id_uidx on public.suites(id);
create unique index if not exists subscription_products_id_uidx on public.subscription_products(id);
create unique index if not exists subscription_plans_id_uidx on public.subscription_plans(id);
create unique index if not exists subscription_prices_id_uidx on public.subscription_prices(id);
create unique index if not exists subscriptions_id_uidx on public.subscriptions(id);
create unique index if not exists suite_entitlements_id_uidx on public.suite_entitlements(id);
create unique index if not exists subscription_products_code_uidx on public.subscription_products(code);
create unique index if not exists subscription_plans_code_uidx on public.subscription_plans(code);
create unique index if not exists suite_entitlements_org_suite_uidx on public.suite_entitlements(organization_id,suite_id);
create unique index if not exists ai_allowance_periods_org_period_uidx on public.ai_allowance_periods(organization_id,period_start,period_end);

do $$ begin
 if not exists(select 1 from pg_constraint where conname='subscription_plans_product_id_fkey' and conrelid='public.subscription_plans'::regclass) then alter table public.subscription_plans add constraint subscription_plans_product_id_fkey foreign key(product_id) references public.subscription_products(id) not valid; end if;
 if not exists(select 1 from pg_constraint where conname='subscription_prices_plan_id_fkey' and conrelid='public.subscription_prices'::regclass) then alter table public.subscription_prices add constraint subscription_prices_plan_id_fkey foreign key(plan_id) references public.subscription_plans(id) not valid; end if;
 if not exists(select 1 from pg_constraint where conname='subscriptions_organization_id_fkey' and conrelid='public.subscriptions'::regclass) then alter table public.subscriptions add constraint subscriptions_organization_id_fkey foreign key(organization_id) references public.organizations(id) on delete cascade not valid; end if;
 if not exists(select 1 from pg_constraint where conname='subscriptions_plan_id_fkey' and conrelid='public.subscriptions'::regclass) then alter table public.subscriptions add constraint subscriptions_plan_id_fkey foreign key(plan_id) references public.subscription_plans(id) not valid; end if;
 if not exists(select 1 from pg_constraint where conname='subscriptions_price_id_fkey' and conrelid='public.subscriptions'::regclass) then alter table public.subscriptions add constraint subscriptions_price_id_fkey foreign key(price_id) references public.subscription_prices(id) not valid; end if;
 if not exists(select 1 from pg_constraint where conname='suite_entitlements_organization_id_fkey' and conrelid='public.suite_entitlements'::regclass) then alter table public.suite_entitlements add constraint suite_entitlements_organization_id_fkey foreign key(organization_id) references public.organizations(id) on delete cascade not valid; end if;
 if not exists(select 1 from pg_constraint where conname='suite_entitlements_suite_id_fkey' and conrelid='public.suite_entitlements'::regclass) then alter table public.suite_entitlements add constraint suite_entitlements_suite_id_fkey foreign key(suite_id) references public.suites(id) not valid; end if;
 if not exists(select 1 from pg_constraint where conname='suite_entitlements_subscription_id_fkey' and conrelid='public.suite_entitlements'::regclass) then alter table public.suite_entitlements add constraint suite_entitlements_subscription_id_fkey foreign key(subscription_id) references public.subscriptions(id) on delete set null not valid; end if;
 if not exists(select 1 from pg_constraint where conname='ai_usage_events_organization_id_fkey' and conrelid='public.ai_usage_events'::regclass) then alter table public.ai_usage_events add constraint ai_usage_events_organization_id_fkey foreign key(organization_id) references public.organizations(id) on delete cascade not valid; end if;
 if not exists(select 1 from pg_constraint where conname='ai_usage_events_user_id_fkey' and conrelid='public.ai_usage_events'::regclass) then alter table public.ai_usage_events add constraint ai_usage_events_user_id_fkey foreign key(user_id) references auth.users(id) not valid; end if;
 if not exists(select 1 from pg_constraint where conname='ai_usage_events_project_id_fkey' and conrelid='public.ai_usage_events'::regclass) then alter table public.ai_usage_events add constraint ai_usage_events_project_id_fkey foreign key(project_id) references public.projects(id) on delete set null not valid; end if;
 if not exists(select 1 from pg_constraint where conname='ai_usage_events_suite_id_fkey' and conrelid='public.ai_usage_events'::regclass) then alter table public.ai_usage_events add constraint ai_usage_events_suite_id_fkey foreign key(suite_id) references public.suites(id) not valid; end if;
 if not exists(select 1 from pg_constraint where conname='ai_allowance_periods_organization_id_fkey' and conrelid='public.ai_allowance_periods'::regclass) then alter table public.ai_allowance_periods add constraint ai_allowance_periods_organization_id_fkey foreign key(organization_id) references public.organizations(id) on delete cascade not valid; end if;
 if not exists(select 1 from pg_constraint where conname='ai_allowance_periods_subscription_id_fkey' and conrelid='public.ai_allowance_periods'::regclass) then alter table public.ai_allowance_periods add constraint ai_allowance_periods_subscription_id_fkey foreign key(subscription_id) references public.subscriptions(id) on delete set null not valid; end if;
end $$;

-- 4. Seed only after catalog relations and columns are ready.
insert into public.suites(id,name,status) values
 ('operational-excellence','Operational Excellence','active'),('project-management','Project Management','active'),
 ('supply-chain','Supply Chain','coming_soon'),('healthcare','Healthcare','coming_soon'),
 ('manufacturing','Manufacturing','coming_soon'),('technology','Technology','coming_soon'),
 ('financial-services','Financial Services','coming_soon'),('construction','Construction','locked')
on conflict(id) do update set name=excluded.name;

create index if not exists subscriptions_organization_idx on public.subscriptions(organization_id,status);
create index if not exists suite_entitlements_lookup_idx on public.suite_entitlements(organization_id,suite_id,status);
create index if not exists ai_usage_org_time_idx on public.ai_usage_events(organization_id,occurred_at desc);
create index if not exists ai_usage_user_time_idx on public.ai_usage_events(user_id,occurred_at desc);
create index if not exists ai_usage_project_time_idx on public.ai_usage_events(project_id,occurred_at desc);
create index if not exists ai_usage_suite_time_idx on public.ai_usage_events(suite_id,occurred_at desc);

-- 5. RLS is enabled before policies. Catalog is authenticated-read; organization
-- data remains membership-scoped. No client mutation policies are granted.
alter table public.suites enable row level security;
alter table public.subscription_products enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscription_prices enable row level security;
alter table public.subscriptions enable row level security;
alter table public.suite_entitlements enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_allowance_periods enable row level security;

drop policy if exists suites_authenticated_read on public.suites;
create policy suites_authenticated_read on public.suites for select to authenticated using(true);
drop policy if exists products_authenticated_read on public.subscription_products;
create policy products_authenticated_read on public.subscription_products for select to authenticated using(status='active');
drop policy if exists plans_authenticated_read on public.subscription_plans;
create policy plans_authenticated_read on public.subscription_plans for select to authenticated using(status='active');
drop policy if exists prices_authenticated_read on public.subscription_prices;
create policy prices_authenticated_read on public.subscription_prices for select to authenticated using(status='active');
drop policy if exists subscriptions_org_read on public.subscriptions;
create policy subscriptions_org_read on public.subscriptions for select to authenticated using(public.axentra_org_role(organization_id) is not null);
drop policy if exists entitlements_org_read on public.suite_entitlements;
create policy entitlements_org_read on public.suite_entitlements for select to authenticated using(public.axentra_org_role(organization_id) is not null);
drop policy if exists ai_usage_org_read on public.ai_usage_events;
create policy ai_usage_org_read on public.ai_usage_events for select to authenticated using(public.axentra_org_role(organization_id) is not null);
drop policy if exists ai_allowance_org_read on public.ai_allowance_periods;
create policy ai_allowance_org_read on public.ai_allowance_periods for select to authenticated using(public.axentra_org_role(organization_id) is not null);

revoke all on public.subscriptions,public.suite_entitlements,public.ai_usage_events,public.ai_allowance_periods from anon;
-- Trusted service-role processes remain the only writers for commercial and metering data.

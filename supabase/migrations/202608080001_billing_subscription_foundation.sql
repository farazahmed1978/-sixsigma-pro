-- Aureqin billing, subscription, suite-trial, and usage foundation.
-- Additive and idempotent. Stripe is the payment processor; Aureqin remains the authorization source of truth.

alter table public.subscription_products add column if not exists active boolean not null default true;
alter table public.subscription_plans add column if not exists plan_type text not null default 'suite';
alter table public.subscription_plans add column if not exists active boolean not null default true;
alter table public.subscription_plans add column if not exists included_suite_count integer;
alter table public.subscription_plans add column if not exists soft_ai_limit boolean not null default false;
alter table public.subscription_plans add column if not exists entitlement_rules jsonb not null default '{}'::jsonb;
alter table public.subscription_prices add column if not exists stripe_price_id text;
alter table public.subscription_prices add column if not exists is_founding boolean not null default false;
alter table public.subscription_prices add column if not exists active boolean not null default true;
alter table public.subscription_prices add column if not exists valid_from timestamptz;
alter table public.subscription_prices add column if not exists valid_until timestamptz;
alter table public.subscription_prices add column if not exists grandfather_behavior text not null default 'none' check(grandfather_behavior in('none','while_continuously_subscribed','manual'));
update public.subscription_prices set stripe_price_id=provider_price_id where stripe_price_id is null and provider_price_id is not null;

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check check(status in('trialing','active','past_due','paused','canceled','unpaid','incomplete','incomplete_expired','expired')) not valid;
alter table public.subscriptions add column if not exists stripe_customer_id text;
alter table public.subscriptions add column if not exists stripe_subscription_id text;
alter table public.subscriptions add column if not exists trial_start timestamptz;
alter table public.subscriptions add column if not exists trial_end timestamptz;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists ended_at timestamptz;
alter table public.subscriptions add column if not exists grandfathered_price_id uuid references public.subscription_prices(id);
alter table public.subscriptions add column if not exists custom_storage_bytes bigint;
alter table public.subscriptions add column if not exists custom_ai_token_allowance bigint;
update public.subscriptions set stripe_customer_id=provider_customer_id where stripe_customer_id is null and provider_customer_id is not null;
update public.subscriptions set stripe_subscription_id=provider_subscription_id where stripe_subscription_id is null and provider_subscription_id is not null;
create unique index if not exists subscriptions_stripe_subscription_unique on public.subscriptions(stripe_subscription_id);
create index if not exists subscriptions_stripe_customer_idx on public.subscriptions(stripe_customer_id) where stripe_customer_id is not null;

create table if not exists public.subscription_items(
 id uuid primary key default gen_random_uuid(),subscription_id uuid not null references public.subscriptions(id) on delete cascade,
 price_id uuid references public.subscription_prices(id),stripe_subscription_item_id text,suite_id text references public.suites(id),
 quantity integer not null default 1 check(quantity>0),status text not null default 'active' check(status in('active','deleted','pending')),
 metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(subscription_id,stripe_subscription_item_id)
);

alter table public.suite_entitlements drop constraint if exists suite_entitlements_status_check;
alter table public.suite_entitlements add constraint suite_entitlements_status_check check(status in('active','trial','locked','coming_soon','expired')) not valid;
alter table public.suite_entitlements add column if not exists subscription_item_id uuid references public.subscription_items(id) on delete set null;
alter table public.suite_entitlements add column if not exists granted_by uuid references auth.users(id) on delete set null;

create table if not exists public.entitlement_history(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 suite_id text not null references public.suites(id),entitlement_id uuid references public.suite_entitlements(id) on delete set null,
 subscription_id uuid references public.subscriptions(id) on delete set null,previous_state text,next_state text not null,
 reason text not null,actor_type text not null default 'system',actor_user_id uuid references auth.users(id) on delete set null,
 stripe_event_id text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);

create table if not exists public.suite_trials(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id),suite_id text not null references public.suites(id),subscription_id uuid references public.subscriptions(id) on delete set null,
 status text not null default 'active' check(status in('active','converted','expired','canceled')),
 source text not null default 'paid_cross_suite',started_at timestamptz not null default now(),ends_at timestamptz not null,
 converted_at timestamptz,allow_repeat boolean not null default false,metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at>started_at)
);
create unique index if not exists suite_trials_single_nonrepeat on public.suite_trials(organization_id,suite_id) where allow_repeat=false;
create index if not exists suite_trials_expiry_idx on public.suite_trials(status,ends_at);

create table if not exists public.usage_allowances(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 subscription_id uuid references public.subscriptions(id) on delete set null,plan_id uuid references public.subscription_plans(id),
 allowance_type text not null check(allowance_type in('ai_tokens','ai_requests','storage_bytes','seats')),
 period_start timestamptz not null,period_end timestamptz not null,allowance_amount bigint not null default 0,
 consumed_amount bigint not null default 0,soft_limit boolean not null default false,warning_threshold numeric(5,2) not null default 80,
 status text not null default 'active' check(status in('active','exhausted','expired','overridden')),
 metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,allowance_type,period_start,period_end),check(period_end>period_start),check(consumed_amount>=0),check(allowance_amount>=0)
);

alter table public.ai_usage_events add column if not exists provider text;
alter table public.ai_usage_events add column if not exists request_id text;
alter table public.ai_usage_events add column if not exists usage_allowance_id uuid references public.usage_allowances(id) on delete set null;
create unique index if not exists ai_usage_request_unique on public.ai_usage_events(organization_id,request_id) where request_id is not null;

create table if not exists public.billing_events(
 id uuid primary key default gen_random_uuid(),stripe_event_id text not null unique,event_type text not null,
 organization_id uuid references public.organizations(id) on delete set null,status text not null default 'processing' check(status in('processing','processed','failed','ignored')),
 attempt_count integer not null default 1,last_error text,payload jsonb not null default '{}'::jsonb,
 processed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create index if not exists entitlement_history_org_time_idx on public.entitlement_history(organization_id,created_at desc);
create index if not exists usage_allowances_org_period_idx on public.usage_allowances(organization_id,period_start,period_end);
create index if not exists billing_events_status_idx on public.billing_events(status,created_at);

insert into public.subscription_products(code,name,product_type,status,active,metadata)
values('aureqin-professional-suite','Aureqin Professional Suite','suite','active',true,'{"selectable_suites":["operational-excellence","project-management"]}'::jsonb),
      ('aureqin-ai','Aureqin AI','addon','active',true,'{"availability":"future"}'::jsonb)
on conflict(code) do update set name=excluded.name,active=excluded.active,metadata=public.subscription_products.metadata||excluded.metadata;

insert into public.subscription_plans(product_id,code,name,audience,plan_type,seat_allowance,ai_token_allowance,trial_days,grandfatherable,included_suite_count,status,active,entitlement_rules,metadata)
select p.id,v.code,v.name,v.audience,v.plan_type,v.seats,v.ai_tokens,v.trial_days,v.grandfatherable,v.suite_count,'active',true,v.rules,v.metadata
from public.subscription_products p
join (values
 ('aureqin-professional-suite','individual-one-suite-founding','Aureqin Individual — Founding','individual','suite',1,0,14,true,1,'{"selection_required":true}'::jsonb,'{"founding":true}'::jsonb),
 ('aureqin-professional-suite','individual-one-suite-standard','Aureqin Individual','individual','suite',1,0,14,false,1,'{"selection_required":true}'::jsonb,'{}'::jsonb),
 ('aureqin-professional-suite','team-multi-suite','Aureqin Team','team','bundle',null,0,14,false,null,'{"suite_count":"configurable"}'::jsonb,'{"availability":"future"}'::jsonb),
 ('aureqin-professional-suite','enterprise-custom','Aureqin Enterprise','enterprise','enterprise',null,0,30,false,null,'{"manual_override":true}'::jsonb,'{"availability":"sales"}'::jsonb),
 ('aureqin-ai','ai-value-future','Aureqin AI Value','individual','addon',1,0,0,false,0,'{"usage_metered":true}'::jsonb,'{"availability":"future"}'::jsonb)
) as v(product_code,code,name,audience,plan_type,seats,ai_tokens,trial_days,grandfatherable,suite_count,rules,metadata)
on p.code=v.product_code
on conflict(code) do update set name=excluded.name,entitlement_rules=excluded.entitlement_rules,metadata=excluded.metadata;

create unique index if not exists subscription_prices_catalog_unique on public.subscription_prices(plan_id,price_kind,currency,billing_interval);
insert into public.subscription_prices(plan_id,currency,unit_amount,billing_interval,price_kind,is_founding,active,valid_from,grandfather_behavior,status)
select pl.id,'usd',v.amount,'month',v.kind,v.founding,true,now(),v.grandfather,'active'
from public.subscription_plans pl
join (values
 ('individual-one-suite-founding',999,'founding',true,'while_continuously_subscribed'),
 ('individual-one-suite-standard',1999,'regular',false,'none'),
 ('ai-value-future',1999,'regular',false,'none')
) as v(plan_code,amount,kind,founding,grandfather) on pl.code=v.plan_code
on conflict(plan_id,price_kind,currency,billing_interval) do update set unit_amount=excluded.unit_amount,is_founding=excluded.is_founding,grandfather_behavior=excluded.grandfather_behavior;

alter table public.subscription_items enable row level security;
alter table public.entitlement_history enable row level security;
alter table public.suite_trials enable row level security;
alter table public.usage_allowances enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists subscription_items_org_read on public.subscription_items;
create policy subscription_items_org_read on public.subscription_items for select to authenticated
using(exists(select 1 from public.subscriptions s where s.id=subscription_id and public.axentra_org_role(s.organization_id) is not null));
drop policy if exists entitlement_history_org_read on public.entitlement_history;
create policy entitlement_history_org_read on public.entitlement_history for select to authenticated using(public.axentra_org_role(organization_id) is not null);
drop policy if exists suite_trials_org_read on public.suite_trials;
create policy suite_trials_org_read on public.suite_trials for select to authenticated using(public.axentra_org_role(organization_id) is not null);
drop policy if exists usage_allowances_org_read on public.usage_allowances;
create policy usage_allowances_org_read on public.usage_allowances for select to authenticated using(public.axentra_org_role(organization_id) is not null);
-- billing_events intentionally has no browser-client policy. Only trusted server/service-role code may read or write it.

create or replace function public.aureqin_effective_entitlement_state(entitlement_state text,entitlement_ends_at timestamptz)
returns text language sql stable as $$
 select case when entitlement_state='trial' and entitlement_ends_at is not null and entitlement_ends_at<=now() then 'expired'
             when entitlement_state='active' and entitlement_ends_at is not null and entitlement_ends_at<=now() then 'expired'
             else entitlement_state end
$$;

-- Replace the legacy bootstrap grant for newly created organizations. Existing entitlement rows are preserved.
create or replace function public.aureqin_seed_active_suite_entitlements()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.suite_entitlements(organization_id,suite_id,status,source)
 select new.id,s.id,'locked','account-bootstrap'
 from public.suites s where s.id in('operational-excellence','project-management')
 on conflict(organization_id,suite_id) do nothing;
 return new;
end;
$$;

-- New accounts receive one selected 14-day suite trial. The selection is captured before auth signup.
create or replace function public.aureqin_handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare workspace_organization_id uuid;selected_suite text;trial_record_id uuid;entitlement_record_id uuid;
begin
 workspace_organization_id:=public.aureqin_ensure_user_workspace(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'));
 selected_suite:=case new.raw_user_meta_data->>'planId'
  when 'founding-project-management' then 'project-management'
  else 'operational-excellence' end;
 insert into public.suite_trials(organization_id,user_id,suite_id,status,source,started_at,ends_at,metadata)
 values(workspace_organization_id,new.id,selected_suite,'active','onboarding',now(),now()+interval '14 days',jsonb_build_object('plan_selection',new.raw_user_meta_data->>'planId'))
 on conflict(organization_id,suite_id) where allow_repeat=false do nothing returning id into trial_record_id;
 if trial_record_id is not null then
  insert into public.suite_entitlements(organization_id,suite_id,status,source,starts_at,ends_at,granted_by,metadata)
  values(workspace_organization_id,selected_suite,'trial','onboarding-trial',now(),now()+interval '14 days',new.id,jsonb_build_object('trial_id',trial_record_id))
  on conflict(organization_id,suite_id) do update set status='trial',source='onboarding-trial',starts_at=excluded.starts_at,ends_at=excluded.ends_at,granted_by=excluded.granted_by,metadata=excluded.metadata,updated_at=now()
  returning id into entitlement_record_id;
  insert into public.entitlement_history(organization_id,suite_id,entitlement_id,previous_state,next_state,reason,actor_type,actor_user_id,metadata)
  values(workspace_organization_id,selected_suite,entitlement_record_id,'locked','trial','onboarding-trial-started','auth-provisioning',new.id,jsonb_build_object('trial_id',trial_record_id));
 end if;
 return new;
end;
$$;

revoke all on public.subscription_items,public.entitlement_history,public.suite_trials,public.usage_allowances,public.billing_events from anon;
-- No INSERT/UPDATE/DELETE policies are granted to browser clients. Checkout, portal, trials, webhooks, and usage writes are server-only.

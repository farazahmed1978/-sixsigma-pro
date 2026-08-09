# Aureqin billing architecture

## Authority boundaries

Stripe is responsible for customers, payment collection, invoices, Checkout, Portal, and subscription events. Aureqin/Supabase is responsible for commercial catalog records, subscription projections, suite entitlements, trials, usage allowances, and application authorization.

The browser never writes subscription, entitlement, trial, allowance, AI usage, or webhook records. Authenticated browser requests call same-origin server functions. Those functions verify the Supabase access token and organization membership, then use the service role for the narrowly scoped commercial mutation.

## Commercial model

`subscription_products` describes the commercial product. `subscription_plans` describes packaging and allowances. `subscription_prices` describes price versions and grandfathering behavior. `subscriptions` projects Stripe subscription state. `subscription_items` connects subscription lines to prices and optional suites. `suite_entitlements` is the access-control source of truth.

Price amount never grants access by itself. A verified webhook reconciles subscription state and then grants or updates the selected suite entitlement.

## Subscription behavior

- `trialing` and `active`: normal paid access.
- `past_due`: access remains during the grace state and the UI can warn the customer.
- `canceled`: access remains through `current_period_end` when that date is still in the future.
- `unpaid`, `incomplete`, `incomplete_expired`, and effective expiry: paid entitlement becomes expired/locked without deleting work.

Founding prices use `is_founding` and `grandfather_behavior=while_continuously_subscribed`. The subscription stores `grandfathered_price_id`; cancellation/re-enrollment rules can therefore change without changing authorization code.

## Suite trials

Cross-suite trials are server-created records in `suite_trials`. The default duration is 14 days and can be changed with `SUITE_TRIAL_DAYS`. The partial unique index prevents repeated trials unless an authorized server process explicitly marks a trial repeatable. Coming-soon suites cannot be trialed.

When the entitlement end time passes, the client evaluates it as `expired` immediately. The saved project assets remain untouched. A future scheduled reconciliation job may persist expired status for reporting, but access enforcement does not depend on that job running at the exact second of expiry.

## Webhook idempotency

Stripe signatures are verified against the unparsed request body. `billing_events.stripe_event_id` is unique. Processed, processing, or ignored duplicate deliveries return success without repeating mutations. Failed events are eligible for a later Stripe retry and retain a sanitized failure message.

## AI usage foundation

AI is an add-on product, not a suite. `usage_allowances` supports monthly AI tokens, requests, storage, and seats with per-plan warning thresholds and soft/hard-limit behavior. `ai_usage_events` records provider, model, input/output/total tokens, estimated cost, allowance consumption, project/suite context, and idempotent request IDs. No AI provider calls or live AI charges are enabled.

Suggested customer-facing usage states are under 80% normal, 80–99% warning, and 100% limit reached. Thresholds remain configurable by plan or enterprise override.

## Development safety

Unconfigured local development retains the existing local suite defaults. A configured environment may explicitly set `REACT_APP_ENTITLEMENT_MODE=development`, but the override is honored only when `NODE_ENV=development`. Production entitlement read failures fail closed; there is no global production bypass.

# Stripe setup for Aureqin

Use Stripe **test mode** until the complete billing lifecycle has been validated. Aureqin never collects card numbers; payment details are entered only in Stripe Checkout or Customer Portal.

## 1. Create the Stripe account

Create or select the Stripe account that will own Aureqin billing. Enable test mode in the Stripe Dashboard.

## 2. Create products and recurring prices

Create these initial Stripe products/prices:

1. **Aureqin Individual — Founding**: USD 9.99, recurring monthly.
2. **Aureqin Individual**: USD 19.99, recurring monthly. Keep inactive/unpublished until standard pricing launches.

Do not create an active Aureqin AI price yet. Its $19.99 starting price is future positioning only.

After applying the Supabase billing migration, copy each Stripe `price_...` identifier into `subscription_prices.stripe_price_id` for the matching plan. The founding price belongs to plan code `individual-one-suite-founding`; the regular price belongs to `individual-one-suite-standard`.

## 3. Configure Customer Portal

In **Stripe Dashboard → Settings → Billing → Customer portal**, enable:

- payment-method updates;
- invoice history;
- subscription cancellation;
- cancellation at period end.

Do not enable unreviewed product switching until add-suite price rules are finalized.

## 4. Configure the webhook

Create a webhook endpoint:

`https://YOUR_DOMAIN/api/webhooks/stripe`

Subscribe it to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy the endpoint signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

For local testing, use Stripe CLI forwarding to the local function runtime and use the CLI-provided webhook secret. Do not use live-mode events or real cards.

## 5. Configure local environment variables

Create `.env.local` from `.env.example` and set browser-safe values. Server functions additionally require:

```text
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SUITE_TRIAL_DAYS=14
```

Never expose the service-role key, Stripe secret key, or webhook secret through a `REACT_APP_` variable.

## 6. Configure Vercel

Add these variables separately for Preview and Production:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUITE_TRIAL_DAYS` (optional; defaults to 14)

Use Stripe test keys in Preview. Use live keys in Production only after test-mode validation and webhook reconciliation have passed.

## 7. Apply the Supabase migration

Apply `supabase/migrations/202608080001_billing_subscription_foundation.sql` after all earlier timestamped migrations. Then populate the Stripe price IDs described above.

## 8. Validate

Use Stripe test cards to confirm Checkout, webhook processing, entitlement creation, Portal return, payment failure, cancellation-at-period-end, and duplicate webhook delivery. Verify `billing_events` records each Stripe event ID only once.

# Configure Supabase for Aureqin

Aureqin uses Supabase Auth and Postgres. Until the two public environment variables are configured, account routes display a setup screen instead of attempting authentication.

## 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com/).
2. Select **New project**.
3. Choose an organization, project name, database password, and region.
4. Wait for provisioning to finish.

Use separate Supabase projects for development and production so test users and data cannot affect production.

## 2. Find the Project URL and anon key

In the Supabase dashboard:

1. Open the project.
2. Open **Project Settings → API**. In newer dashboard versions this may appear under **Settings → API**.
3. Copy **Project URL**. This becomes `REACT_APP_SUPABASE_URL`.
4. Under **Project API keys**, copy the public **anon** key. This becomes `REACT_APP_SUPABASE_ANON_KEY`.

Use only the public anon key in React. Never place the `service_role` key in `.env`, Vercel browser variables, or frontend code.

## 3. Create the local environment file

From the repository root, copy `.env.example` to a new file named `.env.local` and enter the values:

```env
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-public-anon-key
```

`.env.local` is ignored by Git. Do not commit it.

## 4. Apply the database migration

Open **SQL Editor** in Supabase and apply these migrations in order:

1. `supabase/migrations/202608070001_project_architecture_hardening.sql`
2. `supabase/migrations/202608070002_aureqin_suite_entitlements.sql`
3. `supabase/migrations/202608070003_user_workspace_provisioning.sql`

The first migration establishes the hardened project schema and row-level security. The second adds Aureqin's suite catalog, subscriptions, entitlements, and AI usage metering foundation. The third provisions default organizations for new and existing authenticated users so ownership-safe project import can succeed. Run each migration once.

## 5. Configure Auth URLs

In **Authentication → URL Configuration**, set:

- Local site URL: `http://localhost:3000`
- Local redirect URLs: `http://localhost:3000/start` and `http://localhost:3000/reset-password`

Add the equivalent Vercel Preview and Production URLs before deploying. Keep email confirmation enabled if verification is required.

## 6. Restart local development

Create React App reads environment variables only when it starts. Stop the running server with `Ctrl+C`, then restart it:

```powershell
npm.cmd start
```

Reload `/start`. The configuration screen should be replaced by onboarding.

## 7. Configure Vercel

For each Vercel environment—Development, Preview, and Production:

1. Open the Vercel project.
2. Go to **Settings → Environment Variables**.
3. Add `REACT_APP_SUPABASE_URL`.
4. Add `REACT_APP_SUPABASE_ANON_KEY`.
5. Select the intended environment scopes.
6. Redeploy; environment changes do not alter an already-built deployment.

Production should use the production Supabase project. Preview should normally use the development/staging project.

## Remaining launch configuration

- Configure production SMTP and review Supabase Auth email templates.
- Test signup, verification, password reset, and redirect URLs on every deployed domain.
- Test RLS with at least two users and a viewer membership.
- Create a private Storage bucket when large dataset or attachment uploads are enabled.
- Keep Stripe secrets and the Supabase service-role key in server-side functions only.

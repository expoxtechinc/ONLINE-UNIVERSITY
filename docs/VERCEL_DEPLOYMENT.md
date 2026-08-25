# Vercel deployment guide

Online University is configured as an **Expo static web export plus a Vercel Node.js API function**. Vercel serves the Expo export from `web-dist/`, while the supported `api/[...path].ts` catch-all function loads the legacy Express endpoints that remain in use for Stripe checkout, local PDF document generation, and any legacy MySQL workflows. The primary identity, course, role-governance, protected media, assessment, audit, and global certificate-verification foundation is the dedicated Supabase project.

> Never commit credentials to GitHub. The two `EXPO_PUBLIC_SUPABASE_*` values are deliberately client-visible identifiers protected by Supabase Row Level Security; **service-role keys, OAuth secrets, Stripe secrets, database URLs, and bootstrap credentials must remain server-only**.

## Required production environment variables

| Variable | Scope | Required purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Expo web/mobile bundle | Dedicated Online University Supabase URL. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Expo web/mobile bundle | Supabase publishable client key; access is limited by RLS. |
| `DATABASE_URL` | Vercel API only, while legacy routes remain | Production MySQL-compatible connection string with TLS enabled. |
| `JWT_SECRET` | Vercel API only, while legacy local sessions remain | Long, random session-signing secret. |
| `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PIN` | Vercel API only, legacy bootstrap only | Initial local administrator credentials; rotate after use. |
| `ONLINE_UNIVERSITY_STRIPE_SECRET_KEY` | Vercel API only | Stripe server secret key. |
| `ONLINE_UNIVERSITY_STRIPE_WEBHOOK_SECRET` | Vercel API only | Stripe production webhook signing secret. |
| `ALLOWED_ORIGINS` | Vercel API only | Comma-separated deployed app origins allowed for credentialed API calls. |

The Supabase storage buckets `course-media` and `credential-documents` are private and RLS-protected. Do **not** configure Vercel Blob for new course media or credential documents; it is now a legacy optional adapter only. Do not place a Supabase service-role key in Vercel client variables, Expo configuration, or the Git repository.

## Google OAuth configuration

Google sign-in is enabled in the dedicated Supabase project. Before production launch, retain the following configuration in the correct locations:

| Location | Value or requirement |
|---|---|
| Google Cloud OAuth client | Authorized redirect URI: `https://oevgnonkqpvfvjsmovpw.supabase.co/auth/v1/callback` |
| Supabase Auth → URL configuration | Site URL: the canonical production domain, for example `https://YOUR_DOMAIN` |
| Supabase Auth → URL configuration | Additional redirect URL: `https://YOUR_DOMAIN/oauth/callback` |
| Supabase Auth → URL configuration | Native redirect URL: `onlineuniversity://auth/callback` |
| Vercel | Add the Supabase public URL and publishable key for the **Production** environment, and use separate values for Preview only if a separate Supabase project is provisioned. |

The app’s Google sign-in callback is handled by `/oauth/callback` on web and the `onlineuniversity` URL scheme on native builds. A Google provider setting is included in release validation; do not treat a dashboard toggle alone as sufficient verification.

## Vercel project setup

1. In Vercel, select **Add New → Project**, then import `expoxtechinc/ONLINE-UNIVERSITY`.
2. Set the root directory to `./`, select **Other** as the framework preset, and keep the repository’s `vercel.json`.
3. Set Node.js to **22.x**. Use `pnpm install --frozen-lockfile`, build command `pnpm build:vercel`, and output directory `web-dist`.
4. Add the production variables in the preceding table. Values for `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must match the dedicated Online University project; all other sensitive values stay server-only.
5. Deploy from `main`. Vercel builds `api/[...path].ts` as the Node.js function and serves the Expo web export from `web-dist`.

If legacy Stripe checkout remains enabled, configure its production webhook after the first production deployment:

```text
https://YOUR_DOMAIN/api/payments/stripe/webhook
```

Subscribe to `checkout.session.completed`; the webhook signature is validated before the legacy API activates an enrollment. A later migration should move payment-backed enrollment activation into a Supabase-aware server workflow so only one enrollment authority remains.

## Credential security and verification

Public QR codes resolve to the deployed `verify-certificate` Supabase Edge Function. The function returns only the minimum verification record for active, non-revoked certificates, while its privileged data lookup uses the server-only role. The database security advisor has no outstanding security findings after the current hardening migration.

Assessment submission is handled by a separate JWT-protected Supabase Edge Function. It calculates the score on the server, records the attempt, checks required lesson completion, marks the enrollment completed when eligible, and creates a database-linked certificate record. The client must never be trusted to issue a certificate or set a grade.

## Release checks

Run the following before every deployment:

```bash
pnpm check
pnpm lint
pnpm test
pnpm build:vercel
```

The current release validation covers the exact dedicated Supabase endpoint, enabled Google provider, public unknown-certificate behavior, protected assessment access, legacy endpoint authorization, certificate/transcript generation, TypeScript, linting, and the Vercel build target.

For platform references, see [Expo web publishing](https://docs.expo.dev/guides/publishing-websites/), [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js), and [Supabase OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).

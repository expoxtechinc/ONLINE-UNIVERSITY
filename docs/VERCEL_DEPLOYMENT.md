# Vercel deployment guide

Online University is configured as a **single Node.js server deployment**. Vercel captures the root `server.ts` entrypoint, which serves both the exported Expo web application and the protected Express API. The build generates the web bundle in `web-dist/`; it is not committed to source control.

## Required production environment variables

| Variable | Required purpose |
|---|---|
| `DATABASE_URL` | Production MySQL-compatible database connection string with TLS enabled. |
| `JWT_SECRET` | Long, random signing secret for application sessions. |
| `BOOTSTRAP_ADMIN_USERNAME` | Initial administrator username. |
| `BOOTSTRAP_ADMIN_PASSWORD` | Initial administrator password; replace after first sign-in. |
| `BOOTSTRAP_ADMIN_EMAIL` | Administrator email address. |
| `BOOTSTRAP_ADMIN_PIN` | Administrator recovery PIN. |
| `ONLINE_UNIVERSITY_STRIPE_SECRET_KEY` | Stripe server secret key. Never expose to the mobile/web bundle. |
| `ONLINE_UNIVERSITY_STRIPE_WEBHOOK_SECRET` | Signing secret for the production Stripe webhook. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for course video, image, and document storage when working outside Vercel. |
| `BLOB_STORE_ID` and `VERCEL_OIDC_TOKEN` | Automatically provided when a private Vercel Blob store is connected to the Vercel project; preferred in production. |
| `ALLOWED_ORIGINS` | Comma-separated app domains allowed to make credentialed cross-origin API calls, if any. |

## Vercel project setup

Create a Vercel project from `expoxtechinc/ONLINE-UNIVERSITY`, set the Node.js version to **22.x**, and add the environment variables above for Production, Preview, and Development as appropriate. Keep `ONLINE_UNIVERSITY_STRIPE_SECRET_KEY`, webhook secrets, database URLs, and bootstrap credentials server-only. Do not add them as `EXPO_PUBLIC_*` variables.

Create and connect a **private Vercel Blob** store for course media. Course uploads are stored privately and the application streams them only after checking the signed-in learner’s enrollment or authoring role. For large video uploads, use the Vercel Blob direct-upload workflow rather than proxying the file through a function; Vercel documents a 4.5 MB request-body limit for server uploads. [1] [2]

After the first production deployment, configure the Stripe webhook URL as:

```text
https://YOUR_DOMAIN/api/payments/stripe/webhook
```

Subscribe to `checkout.session.completed`. The webhook signature is verified before a payment activates a course enrollment.

## Release checks

Run the following locally or in continuous integration before each release:

```bash
pnpm check
pnpm lint
pnpm test
pnpm build:vercel
```

The Vercel build configuration follows Expo’s published Vercel web-export guidance and Vercel’s Node.js server entrypoint model. See [Expo web publishing](https://docs.expo.dev/guides/publishing-websites/) and [Vercel Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js).

## References

[1] [Vercel Blob private storage](https://vercel.com/docs/vercel-blob/private-storage)

[2] [Vercel Blob server uploads](https://vercel.com/docs/vercel-blob/server-upload)

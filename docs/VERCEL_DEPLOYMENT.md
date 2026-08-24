# Vercel deployment guide

Online University is configured as an **Expo web export plus a Vercel Node.js API function**. The supported `api/[...path].ts` catch-all function loads the protected Express API, while Vercel serves the exported Expo web application from `web-dist/`. The build output is generated at deployment time and is not committed to source control.

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

1. In Vercel, select **Add New → Project**, then import `expoxtechinc/ONLINE-UNIVERSITY`.
2. Set the project root directory to `./`, select **Other** as the framework preset, and retain the repository’s `vercel.json` settings.
3. Set Node.js to **22.x**. The repository install command is `pnpm install --frozen-lockfile`; the build command is `pnpm build:vercel`; and the static output directory is `web-dist`.
4. Add the environment variables above to the **Production** environment. Add Preview values only when using a separate preview database and Stripe test configuration.
5. Deploy from `main`. Vercel compiles `api/[...path].ts` as the serverless API function and serves the Expo export from `web-dist`.

Keep `ONLINE_UNIVERSITY_STRIPE_SECRET_KEY`, webhook secrets, database URLs, and bootstrap credentials server-only. Do not add them as `EXPO_PUBLIC_*` variables.

Create and connect a **private Vercel Blob** store for course media. Course uploads are stored privately and the application streams them only after checking the signed-in learner’s enrollment or authoring role. For large video uploads, use the Vercel Blob direct-upload workflow rather than proxying the file through a function; Vercel documents a 4.5 MB request-body limit for server uploads. [1] [2]

After the first production deployment, configure the Stripe webhook URL as:

```text
https://YOUR_DOMAIN/api/payments/stripe/webhook
```

Subscribe to `checkout.session.completed`. The webhook signature is verified before a payment activates a course enrollment.

## Configuration verification

Vercel hides secret values after they are saved, so verify the configuration by confirming these **variable names** exist in the Production environment: `DATABASE_URL`, `JWT_SECRET`, `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PIN`, `ONLINE_UNIVERSITY_STRIPE_SECRET_KEY`, `ONLINE_UNIVERSITY_STRIPE_WEBHOOK_SECRET`, and either `BLOB_READ_WRITE_TOKEN` or the connected private Blob-store credentials. Never store their values in GitHub or an `EXPO_PUBLIC_*` variable.

The local credential-document test generated both a certificate PDF containing a QR verification payload and an official transcript PDF successfully. Certificate QR codes are generated server-side at download time using the public verification URL.

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

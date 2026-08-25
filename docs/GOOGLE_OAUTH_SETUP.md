# Google Sign-In Configuration

Online University delegates Google sign-in to Supabase Auth. The application returns users to the dedicated web callback route or the native deep link after Supabase has completed authentication.

| Configuration location | Required value |
| --- | --- |
| Google Cloud Console → OAuth client → Authorized redirect URIs | `https://oevgnonkqpvfvjsmovpw.supabase.co/auth/v1/callback` |
| Supabase → Authentication → URL Configuration → Redirect URLs | `https://sastech-ou.vercel.app/auth/callback` |
| Supabase → Authentication → URL Configuration → Redirect URLs | `onlineuniversity://auth/callback` |
| Supabase → Authentication → URL Configuration → Site URL | `https://sastech-ou.vercel.app` |

> `Error 400: redirect_uri_mismatch` is issued by Google before the app receives control. It is resolved by saving the Supabase callback URI in the Google OAuth client used by the dedicated Online University Supabase project. The Vercel URL is a Supabase redirect destination; it is **not** the Google OAuth callback URI.

After saving the Google OAuth client configuration, wait briefly for propagation, then retry Google sign-in from the published web application. Do not add a Supabase service-role key to Vercel or the Expo client.

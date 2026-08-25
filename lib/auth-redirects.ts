export const AUTH_CALLBACK_PATH = "/auth/callback";

export function webAuthRedirectUri(origin: string) {
  return new URL(AUTH_CALLBACK_PATH, origin).toString();
}

export function supabaseGoogleCallbackUri(supabaseUrl: string) {
  return new URL("/auth/v1/callback", supabaseUrl).toString();
}

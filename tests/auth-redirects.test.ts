import { describe, expect, it } from "vitest";

import { supabaseGoogleCallbackUri, webAuthRedirectUri } from "../lib/auth-redirects";

describe("authentication redirect URIs", () => {
  it("creates a stable in-app web callback", () => {
    expect(webAuthRedirectUri("https://sastech-ou.vercel.app")).toBe("https://sastech-ou.vercel.app/auth/callback");
  });

  it("uses the Supabase callback required by Google OAuth", () => {
    expect(supabaseGoogleCallbackUri("https://oevgnonkqpvfvjsmovpw.supabase.co")).toBe("https://oevgnonkqpvfvjsmovpw.supabase.co/auth/v1/callback");
  });
});

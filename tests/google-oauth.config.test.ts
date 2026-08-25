import { describe, expect, it } from "vitest";

describe("Google OAuth provider configuration", () => {
  it("does not receive an invalid-client response when validating the configured OAuth application", async () => {
    const clientId = process.env.SUPABASE_GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.SUPABASE_GOOGLE_OAUTH_CLIENT_SECRET;
    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId!, client_secret: clientSecret!, grant_type: "authorization_code", code: "online-university-configuration-check" }),
    });
    const payload = await response.json() as { error?: string };
    expect(response.status).toBe(400);
    expect(payload.error).not.toBe("invalid_client");
  });
});

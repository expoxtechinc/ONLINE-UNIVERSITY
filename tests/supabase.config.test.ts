import { describe, expect, it } from "vitest";

describe("dedicated Supabase client configuration", () => {
  it("authenticates the publishable key against the Online University Auth settings endpoint", async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(url).toBe("https://oevgnonkqpvfvjsmovpw.supabase.co");
    expect(key).toMatch(/^(sb_publishable_|eyJ)/);
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key! } });
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  });
});

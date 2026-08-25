import { describe, expect, it } from "vitest";

describe("dedicated Supabase Google sign-in provider", () => {
  it("reports Google as enabled in the project Auth settings", async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    expect(response.ok).toBe(true);
    const settings = await response.json() as { external?: { google?: boolean } };
    expect(settings.external?.google).toBe(true);
  });
});

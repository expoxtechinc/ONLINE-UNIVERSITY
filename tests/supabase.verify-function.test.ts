import { describe, expect, it } from "vitest";

describe("global certificate verification Edge Function", () => {
  it("returns a non-disclosing invalid result for an unknown certificate code", async () => {
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const response = await fetch(`${baseUrl}/functions/v1/verify-certificate?code=OU-UNKNOWN-TEST`);
    expect(response.status).toBe(404);
    expect((await response.json()).valid).toBe(false);
  });
});

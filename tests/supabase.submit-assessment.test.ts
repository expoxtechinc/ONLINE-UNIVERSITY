import { describe, expect, it } from "vitest";

describe("secure assessment submission Edge Function", () => {
  it("requires an authenticated learner before it will grade an attempt", async () => {
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const response = await fetch(`${baseUrl}/functions/v1/submit-assessment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: "00000000-0000-0000-0000-000000000000", answers: {} }),
    });
    expect(response.status).toBe(401);
  });
});

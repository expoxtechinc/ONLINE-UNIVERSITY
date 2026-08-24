import { describe, expect, it } from "vitest";

describe("Stripe server configuration", () => {
  it("authenticates the configured server key against the Stripe account endpoint", async () => {
    const secretKey = process.env.ONLINE_UNIVERSITY_STRIPE_SECRET_KEY;
    expect(secretKey, "ONLINE_UNIVERSITY_STRIPE_SECRET_KEY must be configured").toMatch(/^sk_(test|live)_/);

    const response = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    expect(response.ok, `Stripe authentication failed: ${response.status}`).toBe(true);
    const account = (await response.json()) as { id?: string };
    expect(account.id).toMatch(/^acct_/);
  });
});

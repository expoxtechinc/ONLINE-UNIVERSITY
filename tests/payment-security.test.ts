import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import { hashSecret, verifySecret } from "../server/security";
import { verifyStripeSignature } from "../server/stripe";

describe("production security controls", () => {
  it("uses non-reversible password hashes that verify only the matching secret", async () => {
    const stored = await hashSecret("A-long-test-password");
    expect(stored.hash).not.toBe("A-long-test-password");
    await expect(verifySecret("A-long-test-password", stored.salt, stored.hash)).resolves.toBe(true);
    await expect(verifySecret("wrong-password", stored.salt, stored.hash)).resolves.toBe(false);
  });

  it("accepts only a correctly signed and fresh Stripe webhook body", () => {
    const secret = process.env.ONLINE_UNIVERSITY_STRIPE_WEBHOOK_SECRET!;
    const body = Buffer.from(JSON.stringify({ id: "evt_test", type: "checkout.session.completed" }));
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body.toString("utf8")}`).digest("hex");
    expect(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`)).toBe(true);
    expect(verifyStripeSignature(body, `t=${timestamp},v1=${"0".repeat(64)}`)).toBe(false);
  });

  it("keeps non-existent certificates out of the public registry", async () => {
    const response = await fetch("http://127.0.0.1:3000/api/certificates/OU-NOTREAL-2099");
    expect(response.status).toBe(404);
    expect((await response.json()).valid).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000";

describe("local administrator bootstrap", () => {
  it("creates the protected administrator account and returns a signed session after credential verification", async () => {
    const bootstrap = await fetch(`${apiBase}/api/auth/local/bootstrap`, { method: "POST" });
    expect(bootstrap.ok).toBe(true);
    expect((await bootstrap.json()).initialized).toBe(true);

    const response = await fetch(`${apiBase}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: process.env.BOOTSTRAP_ADMIN_USERNAME, password: process.env.BOOTSTRAP_ADMIN_PASSWORD }),
    });
    expect(response.ok).toBe(true);
    const body = (await response.json()) as { app_session_id?: string; user?: { role?: string; email?: string } };
    expect(body.app_session_id).toBeTruthy();
    expect(body.user?.role).toBe("admin");
    expect(body.user?.email).toBe(process.env.BOOTSTRAP_ADMIN_EMAIL);
  });
});

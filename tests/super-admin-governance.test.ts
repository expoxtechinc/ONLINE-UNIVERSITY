import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("super-admin governance", () => {
  it("authorizes the approved Gmail through the server-side allowlist and existing profile promotion", () => {
    const migration = readFileSync(resolve(projectRoot, "supabase/migrations/0006_authorize_nassboss_super_admin.sql"), "utf8");
    expect(migration).toContain("nassboss231@gmail.com");
    expect(migration).toContain("'super_admin'");
    expect(migration).toContain("update public.profiles");
  });

  it("offers explicit assignment and learner-role revocation controls without removing the protected current-user check", () => {
    const screen = readFileSync(resolve(projectRoot, "app/admin/supabase-governance.tsx"), "utf8");
    expect(screen).toContain("Assign access role");
    expect(screen).toContain("Revoke staff access");
    expect(screen).toContain("target.id === profile?.id");
    expect(screen).toContain("setUniversityRole");
  });
});

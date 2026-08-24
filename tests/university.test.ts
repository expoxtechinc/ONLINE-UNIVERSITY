import { describe, expect, it } from "vitest";

import { calculateNextProgress, canIssueCertificate, certificateId, getCourse } from "../lib/university";

describe("Online University learning rules", () => {
  it("caps course progress at 100 percent", () => {
    expect(calculateNextProgress(92, 16)).toBe(100);
    expect(calculateNextProgress(0, 16)).toBe(16);
  });

  it("only permits certificates for complete courses with passing results", () => {
    expect(canIssueCertificate(100, 70)).toBe(true);
    expect(canIssueCertificate(84, 92)).toBe(false);
    expect(canIssueCertificate(100, 69)).toBe(false);
  });

  it("uses a stable verification format for a course record", () => {
    expect(certificateId("data-literacy")).toBe("OU-DAT-2026-0482");
    expect(getCourse("climate-solutions").title).toBe("Climate Solutions in Practice");
  });
});

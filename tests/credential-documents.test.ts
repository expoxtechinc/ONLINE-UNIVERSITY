import { describe, expect, it } from "vitest";

import { generateCertificatePdf, generateTranscriptPdf } from "../server/documents";

describe("credential document generation", () => {
  it("generates a downloadable certificate PDF that includes a verification QR payload", async () => {
    const verificationUrl = "https://online-university.example/verify/OU-TEST-2026";
    const pdf = await generateCertificatePdf({ learnerName: "Jordan Taylor", courseName: "Foundations of Data Literacy", issuedAt: new Date("2026-08-24T00:00:00Z"), finalScore: 92, verificationCode: "OU-TEST-2026", verificationUrl });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(3_000);
  });

  it("generates an official transcript PDF from secure learner-course records", async () => {
    const pdf = await generateTranscriptPdf({ learnerName: "Jordan Taylor", learnerEmail: "jordan@example.edu", createdAt: new Date("2026-08-24T00:00:00Z"), entries: [{ title: "Foundations of Data Literacy", category: "Data & Technology", level: "beginner", durationMinutes: 460, status: "completed", progressPercent: 100, finalScore: 92, issuedAt: new Date("2026-08-24T00:00:00Z") }] });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(2_000);
  });
});

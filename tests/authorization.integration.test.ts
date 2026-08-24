import { describe, expect, it } from "vitest";

describe("protected production endpoints", () => {
  it("rejects unauthenticated upload and checkout attempts", async () => {
    const [upload, checkout] = await Promise.all([
      fetch("http://127.0.0.1:3000/api/admin/courses/1/assets", { method: "POST", headers: { "Content-Type": "video/mp4", "X-Asset-Kind": "video", "X-File-Name": "unauthorized.mp4" }, body: "not-a-video" }),
      fetch("http://127.0.0.1:3000/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: 1 }) }),
    ]);
    expect(upload.status).toBe(401);
    expect(checkout.status).toBe(401);
  });
});

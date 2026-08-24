import type { Express } from "express";
import { Readable } from "stream";
import { ENV } from "./env";
import { sdk } from "./sdk";
import * as db from "../db";
import { storageGetPrivate, usesVercelBlob } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (usesVercelBlob()) {
      try {
        const user = await sdk.authenticateRequest(req);
        const asset = await db.getCourseAssetByStorageKey(key);
        if (!asset) { res.status(404).send("Asset not found"); return; }
        const course = await db.getCourseById(asset.courseId);
        const enrollment = await db.getEnrollment(user.id, asset.courseId);
        const mayAccess = user.role === "admin" || (user.role === "instructor" && course?.authorId === user.id) || Boolean(enrollment && ["active", "completed"].includes(enrollment.status));
        if (!mayAccess) { res.status(403).send("Course access required"); return; }
        const object = await storageGetPrivate(key);
        if (!object || object.statusCode !== 200 || !object.stream) { res.status(404).send("Asset not found"); return; }
        res.set("Content-Type", object.blob.contentType || "application/octet-stream");
        res.set("X-Content-Type-Options", "nosniff");
        res.set("Cache-Control", "private, no-cache");
        Readable.fromWeb(object.stream as import("stream/web").ReadableStream).pipe(res);
        return;
      } catch {
        res.status(401).send("Authentication is required to access this asset");
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

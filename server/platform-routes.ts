import type { Express, Request, Response } from "express";
import express from "express";

import * as db from "./db";
import { createStripeCheckoutSession, verifyStripeSignature } from "./stripe";
import { storagePut } from "./storage";
import { normalizeUsername, verifySecret } from "./security";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

type LocalCredentials = { username?: string; password?: string; email?: string; name?: string };
type StripeEvent = { id: string; type: string; data: { object: { id: string; payment_status?: string; payment_intent?: string | null; metadata?: Record<string, string> } } };

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function allowLogin(req: Request) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const state = attempts.get(key);
  if (!state || state.resetAt < now) return true;
  return state.count < 10;
}

function recordLoginAttempt(req: Request, success: boolean) {
  const key = req.ip || "unknown";
  if (success) { attempts.delete(key); return; }
  const previous = attempts.get(key);
  attempts.set(key, { count: (previous?.count ?? 0) + 1, resetAt: Date.now() + 15 * 60 * 1000 });
}

function isAuthor(user: { id: number; role: string }, course: { authorId: number }) {
  return user.role === "admin" || user.id === course.authorId;
}

function safeAppUrl(req: Request) {
  const origin = req.headers.origin;
  if (typeof origin === "string" && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, "");
  return process.env.EXPO_WEB_PREVIEW_URL || process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
}

export function registerPaymentWebhook(app: Express) {
  app.post("/api/payments/stripe/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req: Request, res: Response) => {
    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody) || !verifyStripeSignature(rawBody, req.header("stripe-signature"))) {
      res.status(400).json({ error: "Invalid Stripe signature" });
      return;
    }
    try {
      const event = JSON.parse(rawBody.toString("utf8")) as StripeEvent;
      if (event.type === "checkout.session.completed" && ["paid", "no_payment_required"].includes(event.data.object.payment_status ?? "")) {
        const enrollmentId = Number(event.data.object.metadata?.enrollmentId);
        if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) throw new Error("Checkout event missing enrollment metadata");
        await db.completeEnrollmentPayment({ enrollmentId, sessionId: event.data.object.id, paymentIntentId: event.data.object.payment_intent ?? null, eventId: event.id, payload: rawBody.toString("utf8") });
      }
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("[Stripe] Webhook processing failed", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}

export function registerPlatformRoutes(app: Express) {
  app.post("/api/auth/local/bootstrap", async (_req, res) => {
    try {
      const user = await db.ensureBootstrapAdministrator();
      res.status(200).json({ initialized: Boolean(user) });
    } catch (error) {
      console.error("[Auth] Bootstrap failed", error);
      res.status(500).json({ error: "Administrator bootstrap failed" });
    }
  });

  app.post("/api/auth/local/register", async (req: Request<any, any, LocalCredentials>, res) => {
    const { username, password, email, name } = req.body ?? {};
    if (!username || !password || !email || !name || password.length < 12 || !/^[a-z0-9._-]{3,64}$/i.test(username)) {
      res.status(400).json({ error: "Provide a valid username, name, email, and password with at least 12 characters." });
      return;
    }
    try {
      const user = await db.createLocalUser({ username, password, email, name, role: "student" });
      res.status(201).json({ id: user?.id, username: normalizeUsername(username) });
    } catch (error) {
      res.status(409).json({ error: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/auth/local/login", async (req: Request<any, any, LocalCredentials>, res) => {
    if (!allowLogin(req)) { res.status(429).json({ error: "Too many sign-in attempts. Try again later." }); return; }
    const { username, password } = req.body ?? {};
    if (!username || !password) { res.status(400).json({ error: "Username and password are required." }); return; }
    try {
      await db.ensureBootstrapAdministrator();
      const credential = await db.getCredentialByUsername(username);
      const valid = Boolean(credential && await verifySecret(password, credential.passwordSalt, credential.passwordHash));
      if (!valid || !credential) { recordLoginAttempt(req, false); res.status(401).json({ error: "Invalid username or password." }); return; }
      const user = await db.getUserById(credential.userId);
      if (!user) throw new Error("User not found");
      const token = await sdk.createSessionToken(user.openId, { name: user.name || normalizeUsername(username), expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      recordLoginAttempt(req, true);
      res.json({ app_session_id: token, user: { id: user.id, name: user.name, email: user.email, role: user.role, username: credential.username } });
    } catch (error) {
      console.error("[Auth] Local login failed", error);
      res.status(500).json({ error: "Sign-in failed" });
    }
  });

  app.post("/api/admin/courses/:courseId/assets", express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Authentication is required to upload course assets." });
      return;
    }
    try {
      const courseId = Number(req.params.courseId);
      const course = await db.getCourseById(courseId);
      const bytes = req.body as Buffer;
      const contentType = req.header("content-type") || "application/octet-stream";
      const kind = req.header("x-asset-kind") as "video" | "image" | "document" | undefined;
      const filename = req.header("x-file-name")?.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload.bin";
      if (!course || !isAuthor(user, course)) { res.status(403).json({ error: "Administrator or course author access is required." }); return; }
      if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_UPLOAD_BYTES || !kind || !["video", "image", "document"].includes(kind)) { res.status(400).json({ error: "Invalid upload payload." }); return; }
      if (kind === "video" && !contentType.startsWith("video/")) { res.status(400).json({ error: "Video uploads must use a video content type." }); return; }
      const stored = await storagePut(`courses/${courseId}/${kind}/${filename}`, bytes, contentType);
      const assetId = await db.createCourseAsset({ courseId, uploadedBy: user.id, storageKey: stored.key, url: stored.url, contentType, sizeBytes: bytes.length, kind });
      res.status(201).json({ id: assetId, ...stored, contentType, sizeBytes: bytes.length });
    } catch (error) {
      console.error("[Storage] Course upload failed", error);
      res.status(500).json({ error: "Asset upload failed" });
    }
  });

  app.post("/api/payments/checkout", async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Authentication is required to start checkout." });
      return;
    }
    try {
      const courseId = Number(req.body?.courseId);
      const course = await db.getCourseById(courseId);
      if (!course || course.status !== "published") { res.status(404).json({ error: "Published course not found" }); return; }
      if (course.priceCents < 1) { res.status(400).json({ error: "Free courses should be activated through enrollment, not checkout." }); return; }
      const enrollment = await db.createPendingEnrollment(user.id, course.id, course.priceCents, course.currency);
      if (enrollment.status === "active" || enrollment.status === "completed") { res.json({ alreadyEnrolled: true }); return; }
      const appUrl = safeAppUrl(req);
      const session = await createStripeCheckoutSession({ course, enrollmentId: enrollment.id, customerEmail: user.email, successUrl: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${appUrl}/course/${course.id}` });
      await db.attachStripeCheckout(enrollment.id, session.id);
      res.json({ checkoutUrl: session.url, checkoutSessionId: session.id });
    } catch (error) {
      console.error("[Stripe] Checkout failed", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Checkout initialization failed" });
    }
  });

  app.get("/api/certificates/:verificationCode", async (req, res) => {
    const record = await db.getCertificateByVerificationCode(req.params.verificationCode.toUpperCase());
    if (!record || record.certificate.revokedAt) { res.status(404).json({ valid: false }); return; }
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ valid: true, verificationCode: record.certificate.verificationCode, learnerName: record.learnerName, courseName: record.courseTitle, finalScore: record.certificate.finalScore, issuedAt: record.certificate.issuedAt });
  });
}

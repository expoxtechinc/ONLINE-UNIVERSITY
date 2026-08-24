import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { existsSync } from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerPaymentWebhook, registerPlatformRoutes } from "../platform-routes";
import { ensureBootstrapAdministrator } from "../db";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function startServer() {
  const app = express();
  const server = createServer(app);

  // Permit same-origin requests by default. Cross-origin credentialed requests must be allowlisted.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
    const isLocalOrigin = Boolean(origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    if (origin && (allowedOrigins.includes(origin) || isLocalOrigin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  registerPaymentWebhook(app);

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerPlatformRoutes(app);
  await ensureBootstrapAdministrator();

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const webDist = path.resolve(process.cwd(), "web-dist");
  if (existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: "1h" }));
    app.get("*", (_req, res) => res.sendFile(path.join(webDist, "index.html")));
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

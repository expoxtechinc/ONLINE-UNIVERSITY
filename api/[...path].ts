import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createApp } from "../server/_core/index";

const app = createApp();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await app;
  return expressApp(req, res);
}

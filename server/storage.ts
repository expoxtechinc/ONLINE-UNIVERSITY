import { get, issueSignedToken, presignUrl, put } from "@vercel/blob";

import { ENV } from "./_core/env";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) throw new Error("Storage config missing: connect a private Vercel Blob store or set Forge storage values for local development.");
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string) {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function hasVercelBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN));
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream"): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  if (hasVercelBlob()) {
    const payload = typeof data === "string" ? data : Buffer.from(data);
    const blob = await put(key, payload, { access: "private", contentType, addRandomSuffix: false, cacheControlMaxAge: 60 * 60 * 24 * 30 });
    return { key: blob.pathname, url: `/manus-storage/${blob.pathname}` };
  }
  const { forgeUrl, forgeKey } = getForgeConfig();
  const presignUrl = new URL("v1/storage/presign/put", `${forgeUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResponse = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!presignResponse.ok) throw new Error(`Storage presign failed (${presignResponse.status})`);
  const { url } = (await presignResponse.json()) as { url: string };
  const uploadResponse = await fetch(url, { method: "PUT", headers: { "Content-Type": contentType }, body: new Blob([data as BlobPart], { type: contentType }) });
  if (!uploadResponse.ok) throw new Error(`Storage upload failed (${uploadResponse.status})`);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (hasVercelBlob()) {
    const signedToken = await issueSignedToken({ pathname: key, operations: ["get"], validUntil: Date.now() + 15 * 60 * 1000 });
    const { presignedUrl } = await presignUrl(signedToken, { operation: "get", pathname: key, access: "private", validUntil: Date.now() + 5 * 60 * 1000 });
    return presignedUrl;
  }
  const { forgeUrl, forgeKey } = getForgeConfig();
  const getUrl = new URL("v1/storage/presign/get", `${forgeUrl}/`);
  getUrl.searchParams.set("path", key);
  const response = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!response.ok) throw new Error(`Storage signed URL failed (${response.status})`);
  return ((await response.json()) as { url: string }).url;
}

export async function storageGetPrivate(relKey: string) {
  if (!hasVercelBlob()) return null;
  return get(normalizeKey(relKey), { access: "private" });
}

export function usesVercelBlob() {
  return hasVercelBlob();
}

import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

type LocalUser = { id: number; name: string | null; email: string | null; role: "user" | "student" | "instructor" | "admin"; username: string };

function endpoint(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

async function headers(extra: Record<string, string> = {}) {
  const token = await Auth.getSessionToken();
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(endpoint(path), { ...options, credentials: "include", headers: await headers(options.headers as Record<string, string> | undefined) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || "Request failed");
  return body as T;
}

export async function localLogin(username: string, password: string) {
  const result = await request<{ app_session_id: string; user: LocalUser }>("/api/auth/local/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (Platform.OS !== "web") await Auth.setSessionToken(result.app_session_id);
  await Auth.setUserInfo({ id: result.user.id, openId: `local:${result.user.username}`, name: result.user.name, email: result.user.email, loginMethod: "password", role: result.user.role, lastSignedIn: new Date() });
  return result.user;
}

export async function registerLocalAccount(input: { username: string; name: string; email: string; password: string }) {
  return request<{ id: number; username: string }>("/api/auth/local/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
}

export async function uploadCourseAsset(input: { courseId: number; uri: string; name: string; contentType: string; kind: "video" | "image" | "document"; size?: number }) {
  if (input.size && input.size > 100 * 1024 * 1024) throw new Error("Uploads are limited to 100 MB.");
  const source = await fetch(input.uri);
  const body = await source.blob();
  return request<{ id: number; key: string; url: string; contentType: string; sizeBytes: number }>(`/api/admin/courses/${input.courseId}/assets`, { method: "POST", headers: { "Content-Type": input.contentType, "X-Asset-Kind": input.kind, "X-File-Name": input.name }, body });
}

export async function startCourseCheckout(courseId: number) {
  return request<{ checkoutUrl?: string; checkoutSessionId?: string; alreadyEnrolled?: boolean }>("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId }) });
}

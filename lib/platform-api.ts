import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

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

export async function updateCredentialProfile(input: { legalName: string; country?: string }) {
  return request<{ id: number; legalName: string; country: string | null }>("/api/learner/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
}

async function downloadProtectedPdf(path: string, filename: string) {
  const authorization = await Auth.getSessionToken();
  if (Platform.OS === "web") {
    const response = await fetch(endpoint(path), { credentials: "include", headers: await headers() });
    if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error((body as { error?: string }).error || "Document download failed"); }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const destination = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(endpoint(path), destination, { headers: authorization ? { Authorization: `Bearer ${authorization}` } : {} });
  if (!(await Sharing.isAvailableAsync())) throw new Error("File sharing is not available on this device.");
  await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: filename });
}

export function downloadCertificate(verificationCode: string) {
  return downloadProtectedPdf(`/api/learner/certificates/${encodeURIComponent(verificationCode)}/download`, `${verificationCode}-certificate.pdf`);
}

export function downloadTranscript() {
  return downloadProtectedPdf("/api/learner/transcript/download", "online-university-transcript.pdf");
}

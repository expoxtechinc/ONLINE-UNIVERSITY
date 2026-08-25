import { Platform } from "react-native";

import { supabase, type UniversityProfile } from "@/lib/supabase";

export type ManagedCourse = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  duration_minutes: number;
  price_cents: number;
  currency: string;
  status: "draft" | "review" | "published" | "archived";
  author_id: string;
  created_at: string;
};

export type CourseDraft = Pick<ManagedCourse, "title" | "description" | "category" | "level" | "duration_minutes" | "price_cents" | "currency">;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140);
}

export async function listManagedCourses() {
  const { data, error } = await supabase.from("courses").select("id,title,slug,description,category,level,duration_minutes,price_cents,currency,status,author_id,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ManagedCourse[];
}

export async function createManagedCourse(input: CourseDraft) {
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error("Sign in is required to create a course.");
  const baseSlug = slugify(input.title);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase.from("courses").insert({ ...input, author_id: session.user.id, slug, status: "draft" }).select("id,title,slug,description,category,level,duration_minutes,price_cents,currency,status,author_id,created_at").single();
  if (error) throw error;
  return data as ManagedCourse;
}

export async function setCourseStatus(courseId: string, status: ManagedCourse["status"]) {
  const values = status === "published" ? { status, published_at: new Date().toISOString() } : { status };
  const { error } = await supabase.from("courses").update(values).eq("id", courseId);
  if (error) throw error;
}

export async function uploadCourseMedia(courseId: string, asset: { uri: string; name: string; mimeType?: string | null; file?: File }) {
  const body = Platform.OS === "web" && asset.file ? asset.file : await fetch(asset.uri).then((response) => response.arrayBuffer());
  const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${courseId}/${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage.from("course-media").upload(path, body, { contentType: asset.mimeType || "application/octet-stream", upsert: false });
  if (error) throw error;
  return data.path;
}

export async function listUniversityProfiles() {
  const { data, error } = await supabase.from("profiles").select("id,email,display_name,legal_name,country_code,role").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UniversityProfile[];
}

export async function setUniversityRole(profileId: string, role: UniversityProfile["role"]) {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw error;
}

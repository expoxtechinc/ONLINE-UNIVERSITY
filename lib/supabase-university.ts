import { Platform } from "react-native";

import { requireSupabaseConfiguration, supabase, type UniversityProfile } from "@/lib/supabase";

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
export type LessonKind = "video" | "article" | "flashcards" | "quiz" | "test" | "final_exam";

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
};

export type CourseLesson = {
  id: string;
  module_id: string;
  kind: LessonKind;
  title: string;
  description: string | null;
  position: number;
  rich_text: string | null;
  video_path: string | null;
  media_path: string | null;
  video_duration_seconds: number | null;
  assessment: Record<string, unknown> | null;
  content_json: Record<string, unknown>;
  is_required: boolean;
};

export type LessonDraft = Pick<CourseLesson, "kind" | "title" | "description" | "position" | "rich_text" | "video_duration_seconds" | "assessment" | "content_json" | "is_required"> & { media_path?: string | null };

const courseSelect = "id,title,slug,description,category,level,duration_minutes,price_cents,currency,status,author_id,created_at";
const lessonSelect = "id,module_id,kind,title,description,position,rich_text,video_path,media_path,video_duration_seconds,assessment,content_json,is_required";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140);
}

export async function listManagedCourses() {
  requireSupabaseConfiguration();
  const { data, error } = await supabase.from("courses").select(courseSelect).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ManagedCourse[];
}

export async function createManagedCourse(input: CourseDraft) {
  requireSupabaseConfiguration();
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error("Sign in is required to create a course.");
  const baseSlug = slugify(input.title) || "course";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase.from("courses").insert({ ...input, author_id: session.user.id, slug, status: "draft" }).select(courseSelect).single();
  if (error) throw error;
  return data as ManagedCourse;
}

export async function deleteManagedCourse(courseId: string) {
  requireSupabaseConfiguration();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
}

export async function setCourseStatus(courseId: string, status: ManagedCourse["status"]) {
  requireSupabaseConfiguration();
  const values = status === "published" ? { status, published_at: new Date().toISOString() } : { status };
  const { error } = await supabase.from("courses").update(values).eq("id", courseId);
  if (error) throw error;
}

export async function listCourseModules(courseId: string) {
  requireSupabaseConfiguration();
  const { data, error } = await supabase.from("course_modules").select("id,course_id,title,description,position").eq("course_id", courseId).order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CourseModule[];
}

export async function createCourseModule(courseId: string, input: Pick<CourseModule, "title" | "description" | "position">) {
  requireSupabaseConfiguration();
  const { data, error } = await supabase.from("course_modules").insert({ course_id: courseId, ...input }).select("id,course_id,title,description,position").single();
  if (error) throw error;
  return data as CourseModule;
}

export async function updateCourseModule(moduleId: string, patch: Partial<Pick<CourseModule, "title" | "description" | "position">>) {
  requireSupabaseConfiguration();
  const { data, error } = await supabase.from("course_modules").update(patch).eq("id", moduleId).select("id,course_id,title,description,position").single();
  if (error) throw error;
  return data as CourseModule;
}

export async function deleteCourseModule(moduleId: string) {
  requireSupabaseConfiguration();
  const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
  if (error) throw error;
}

export async function listCourseLessons(moduleId: string) {
  requireSupabaseConfiguration();
  const { data, error } = await supabase.from("lessons").select(lessonSelect).eq("module_id", moduleId).order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CourseLesson[];
}

export async function createCourseLesson(moduleId: string, input: LessonDraft) {
  requireSupabaseConfiguration();
  const { data, error } = await supabase.from("lessons").insert({ module_id: moduleId, ...input }).select(lessonSelect).single();
  if (error) throw error;
  return data as CourseLesson;
}

export async function updateCourseLesson(lessonId: string, patch: Partial<LessonDraft>) {
  requireSupabaseConfiguration();
  const { data, error } = await supabase.from("lessons").update(patch).eq("id", lessonId).select(lessonSelect).single();
  if (error) throw error;
  return data as CourseLesson;
}

export async function deleteCourseLesson(lessonId: string) {
  requireSupabaseConfiguration();
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
}

export async function uploadCourseMedia(courseId: string, asset: { uri: string; name: string; mimeType?: string | null; file?: File }) {
  requireSupabaseConfiguration();
  const body = Platform.OS === "web" && asset.file ? asset.file : await fetch(asset.uri).then((response) => response.arrayBuffer());
  const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${courseId}/${Date.now()}-${safeName}`;
  const { data, error } = await supabase.storage.from("course-media").upload(path, body, { contentType: asset.mimeType || "application/octet-stream", upsert: false });
  if (error) throw error;
  return data.path;
}

export async function listUniversityProfiles() {
  requireSupabaseConfiguration();
  const { data, error } = await supabase.from("profiles").select("id,email,display_name,legal_name,country_code,role").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UniversityProfile[];
}

export async function setUniversityRole(profileId: string, role: UniversityProfile["role"]) {
  requireSupabaseConfiguration();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw error;
}

export async function updateUniversityProfile(profileId: string, patch: Pick<UniversityProfile, "display_name" | "legal_name" | "country_code">) {
  requireSupabaseConfiguration();
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", profileId).select("id,email,display_name,legal_name,country_code,role").single();
  if (error) throw error;
  return data as UniversityProfile;
}

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { Pill, ScreenTitle } from "@/components/university-ui";
import { useSupabaseSession } from "@/hooks/use-supabase-auth";
import {
  createCourseLesson,
  createCourseModule,
  createManagedCourse,
  deleteCourseLesson,
  deleteCourseModule,
  deleteManagedCourse,
  listCourseLessons,
  listCourseModules,
  listManagedCourses,
  setCourseStatus,
  updateCourseLesson,
  updateCourseModule,
  uploadCourseMedia,
  type CourseLesson,
  type CourseModule,
  type LessonKind,
  type ManagedCourse,
} from "@/lib/supabase-university";

const lessonKinds: Array<{ value: LessonKind; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { value: "video", label: "Video", icon: "play-circle-outline" },
  { value: "article", label: "Article", icon: "article" },
  { value: "flashcards", label: "Flashcards", icon: "style" },
  { value: "quiz", label: "Quiz", icon: "quiz" },
  { value: "test", label: "Test", icon: "fact-check" },
  { value: "final_exam", label: "Final exam", icon: "school" },
];

function parseJson(value: string, fallback: Record<string, unknown>) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export default function SupabaseStudioScreen() {
  const { profile, loading } = useSupabaseSession();
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<ManagedCourse | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [lessons, setLessons] = useState<Record<string, CourseLesson[]>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Professional Development");
  const [price, setPrice] = useState("0");
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonKind, setLessonKind] = useState<LessonKind>("article");
  const [lessonBody, setLessonBody] = useState("");
  const [assessmentJson, setAssessmentJson] = useState('{"passing_score":70,"questions":[]}');
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const canManage = profile?.role === "instructor" || profile?.role === "administrator" || profile?.role === "super_admin";

  const refresh = useCallback(async () => {
    try {
      const next = await listManagedCourses();
      setCourses(next);
      if (selectedCourse) {
        const refreshed = next.find((course) => course.id === selectedCourse.id);
        if (refreshed) setSelectedCourse(refreshed);
      }
    } catch (error) {
      Alert.alert("Unable to load courses", error instanceof Error ? error.message : "Please retry.");
    }
  }, [selectedCourse]);

  const loadBuilder = useCallback(async (course: ManagedCourse) => {
    setSelectedCourse(course);
    setWorking(course.id);
    try {
      const nextModules = await listCourseModules(course.id);
      setModules(nextModules);
      const entries = await Promise.all(nextModules.map(async (module) => [module.id, await listCourseLessons(module.id)] as const));
      setLessons(Object.fromEntries(entries));
    } catch (error) {
      Alert.alert("Unable to open builder", error instanceof Error ? error.message : "Please retry.");
    } finally {
      setWorking(null);
    }
  }, []);

  useEffect(() => { if (canManage) void refresh(); }, [canManage, refresh]);

  const createCourse = async () => {
    if (title.trim().length < 3 || description.trim().length < 30) {
      Alert.alert("Add course details", "Provide a title and a description of at least 30 characters.");
      return;
    }
    setSaving(true);
    try {
      const created = await createManagedCourse({ title: title.trim(), description: description.trim(), category: category.trim() || "General", level: "beginner", duration_minutes: 60, price_cents: Math.round(Number(price || 0) * 100), currency: "usd" });
      setTitle(""); setDescription(""); setPrice("0"); await refresh(); await loadBuilder(created);
      Alert.alert("Draft created", "The course is saved. Add modules and learning activities below.");
    } catch (error) { Alert.alert("Course not created", error instanceof Error ? error.message : "Please retry."); }
    finally { setSaving(false); }
  };

  const addModule = async () => {
    if (!selectedCourse || moduleTitle.trim().length < 3) return Alert.alert("Add a module title", "Give this module a meaningful title.");
    setSaving(true);
    try {
      const created = await createCourseModule(selectedCourse.id, { title: moduleTitle.trim(), description: moduleDescription.trim() || null, position: modules.length });
      setModules((current) => [...current, created]); setLessons((current) => ({ ...current, [created.id]: [] })); setModuleTitle(""); setModuleDescription("");
    } catch (error) { Alert.alert("Module not saved", error instanceof Error ? error.message : "Please retry."); }
    finally { setSaving(false); }
  };

  const saveLesson = async (module: CourseModule) => {
    if (!lessonTitle.trim()) return Alert.alert("Add a lesson title", "Every learning activity needs a title.");
    setSaving(true);
    try {
      const draft = { kind: lessonKind, title: lessonTitle.trim(), description: lessonDescription.trim() || null, position: editingLesson?.position ?? (lessons[module.id]?.length ?? 0), rich_text: ["article", "flashcards"].includes(lessonKind) ? lessonBody.trim() : null, video_duration_seconds: lessonKind === "video" ? Number(lessonBody) || null : null, assessment: ["quiz", "test", "final_exam"].includes(lessonKind) ? parseJson(assessmentJson, { passing_score: 70, questions: [] }) : null, content_json: lessonKind === "flashcards" ? parseJson(lessonBody, { cards: [] }) : {}, is_required: true };
      const saved = editingLesson ? await updateCourseLesson(editingLesson.id, draft) : await createCourseLesson(module.id, draft);
      setLessons((current) => ({ ...current, [module.id]: editingLesson ? (current[module.id] ?? []).map((lesson) => lesson.id === saved.id ? saved : lesson) : [...(current[module.id] ?? []), saved] }));
      setEditingLesson(null); setLessonTitle(""); setLessonDescription(""); setLessonBody(""); setAssessmentJson('{"passing_score":70,"questions":[]}');
      Alert.alert(editingLesson ? "Lesson updated" : "Lesson saved", "The learning activity is now persisted in Supabase.");
    } catch (error) { Alert.alert("Lesson not saved", error instanceof Error ? error.message : "Please retry."); }
    finally { setSaving(false); }
  };

  const upload = async (course: ManagedCourse) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["video/*", "audio/*", "application/pdf", "text/plain", "image/*"], copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    setWorking(course.id);
    try { const path = await uploadCourseMedia(course.id, result.assets[0]); Alert.alert("Private media uploaded", `Stored securely at ${path}. Attach it to a video lesson using its content record.`); }
    catch (error) { Alert.alert("Upload failed", error instanceof Error ? error.message : "Please retry."); }
    finally { setWorking(null); }
  };

  const removeCourse = (course: ManagedCourse) => Alert.alert("Delete course", "This permanently removes the course and its modules, lessons, enrollments, and certificate references. Continue only when you are certain.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { setWorking(course.id); try { await deleteManagedCourse(course.id); if (selectedCourse?.id === course.id) { setSelectedCourse(null); setModules([]); } await refresh(); } catch (error) { Alert.alert("Delete failed", error instanceof Error ? error.message : "Please retry."); } finally { setWorking(null); } } }]);
  const removeModule = (module: CourseModule) => Alert.alert("Delete module", "Its lessons will also be removed.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { try { await deleteCourseModule(module.id); setModules((current) => current.filter((item) => item.id !== module.id)); } catch (error) { Alert.alert("Delete failed", error instanceof Error ? error.message : "Please retry."); } } }]);
  const removeLesson = (module: CourseModule, lesson: CourseLesson) => Alert.alert("Delete learning activity", "This cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { try { await deleteCourseLesson(lesson.id); setLessons((current) => ({ ...current, [module.id]: (current[module.id] ?? []).filter((item) => item.id !== lesson.id) })); } catch (error) { Alert.alert("Delete failed", error instanceof Error ? error.message : "Please retry."); } } }]);

  if (loading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#183B65" /></ScreenContainer>;
  if (!canManage) return <ScreenContainer className="px-5 justify-center"><View style={styles.denied}><MaterialIcons name="lock" size={32} color="#D6A84B" /><Text style={styles.deniedTitle}>Author access required</Text><Text style={styles.deniedText}>Only instructors and university administrators can access this production studio.</Text><Pressable onPress={() => router.back()} style={styles.primary}><Text style={styles.primaryText}>Return to profile</Text></Pressable></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><Pressable onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#102A43" /></Pressable><ScreenTitle eyebrow="Dedicated Supabase workspace" title="Course studio" /><View style={styles.notice}><MaterialIcons name="cloud-done" size={20} color="#177648" /><Text style={styles.noticeText}>Drafts, structured lessons, assessments, and private media are persisted with row-level access control.</Text></View><Text style={styles.section}>Create course draft</Text><View style={styles.form}><Label label="COURSE TITLE" /><TextInput value={title} onChangeText={setTitle} placeholder="e.g. Global Health Foundations" placeholderTextColor="#829AB1" style={styles.input} /><Label label="COURSE DESCRIPTION" /><TextInput value={description} onChangeText={setDescription} placeholder="Describe the outcomes and learner value." placeholderTextColor="#829AB1" style={[styles.input, styles.textarea]} multiline textAlignVertical="top" /><Label label="CATEGORY" /><TextInput value={category} onChangeText={setCategory} placeholder="Course category" placeholderTextColor="#829AB1" style={styles.input} /><Label label="TUITION (USD)" /><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#829AB1" style={styles.input} /><Pressable onPress={createCourse} disabled={saving} style={({ pressed }) => [styles.primary, (pressed || saving) && { opacity: 0.72 }]}>{saving ? <ActivityIndicator color="#102A43" /> : <><Text style={styles.primaryText}>Create secure draft</Text><MaterialIcons name="add" size={18} color="#102A43" /></>}</Pressable></View><Text style={styles.section}>Managed courses</Text>{courses.map((course) => <View style={styles.course} key={course.id}><View style={styles.courseTop}><View style={{ flex: 1 }}><Text style={styles.courseTitle}>{course.title}</Text><Text style={styles.courseMeta}>{course.category} · ${(course.price_cents / 100).toFixed(2)} USD</Text></View><Pill label={course.status} tone={course.status === "published" ? "green" : course.status === "review" ? "gold" : "slate"} /></View><View style={styles.actions}><Pressable onPress={() => void loadBuilder(course)} style={styles.secondary}><MaterialIcons name="account-tree" size={18} color="#183B65" /><Text style={styles.secondaryText}>{selectedCourse?.id === course.id ? "Builder open" : "Open builder"}</Text></Pressable><Pressable onPress={() => upload(course)} disabled={working === course.id} style={styles.secondary}><MaterialIcons name="upload-file" size={18} color="#183B65" /><Text style={styles.secondaryText}>Upload source</Text></Pressable><Pressable onPress={() => removeCourse(course)} style={styles.iconButton}><MaterialIcons name="delete-outline" size={19} color="#C64545" /></Pressable></View><Pressable onPress={async () => { const next = course.status === "draft" ? "review" : course.status === "review" ? "published" : "archived"; setWorking(course.id); try { await setCourseStatus(course.id, next); await refresh(); } catch (error) { Alert.alert("Status not updated", error instanceof Error ? error.message : "Please retry."); } finally { setWorking(null); } }} style={styles.statusButton}><MaterialIcons name="published-with-changes" size={17} color="#183B65" /><Text style={styles.secondaryText}>{course.status === "draft" ? "Submit review" : course.status === "review" ? "Publish" : "Archive"}</Text></Pressable></View>)}{!courses.length ? <View style={styles.empty}><Text style={styles.emptyText}>No database courses yet. Create the first secure draft above.</Text></View> : null}{selectedCourse ? <><Text style={styles.section}>Builder · {selectedCourse.title}</Text><View style={styles.form}><Label label="NEW MODULE" /><TextInput value={moduleTitle} onChangeText={setModuleTitle} placeholder="Module title" placeholderTextColor="#829AB1" style={styles.input} /><TextInput value={moduleDescription} onChangeText={setModuleDescription} placeholder="Module description (optional)" placeholderTextColor="#829AB1" style={styles.input} /><Pressable onPress={() => void addModule()} style={styles.primary}><Text style={styles.primaryText}>Add module</Text><MaterialIcons name="add" size={18} color="#102A43" /></Pressable></View>{modules.map((module) => <View style={styles.module} key={module.id}><View style={styles.courseTop}><View style={{ flex: 1 }}><Text style={styles.moduleTitle}>{module.position + 1}. {module.title}</Text><Text style={styles.courseMeta}>{module.description || "No description"}</Text></View><Pressable onPress={() => removeModule(module)}><MaterialIcons name="delete-outline" size={19} color="#C64545" /></Pressable></View>{(lessons[module.id] ?? []).map((lesson) => <View style={styles.lesson} key={lesson.id}><View style={{ flex: 1 }}><Text style={styles.lessonTitle}>{lesson.title}</Text><Text style={styles.courseMeta}>{lesson.kind.replace("_", " ")} · {lesson.is_required ? "Required" : "Optional"}</Text></View><Pressable onPress={() => { setEditingLesson(lesson); setLessonKind(lesson.kind); setLessonTitle(lesson.title); setLessonDescription(lesson.description || ""); setLessonBody(lesson.kind === "flashcards" ? JSON.stringify(lesson.content_json) : lesson.kind === "article" ? lesson.rich_text || "" : lesson.kind === "video" ? String(lesson.video_duration_seconds || "") : ""); setAssessmentJson(JSON.stringify(lesson.assessment || { passing_score: 70, questions: [] })); }}><MaterialIcons name="edit" size={18} color="#183B65" /></Pressable><Pressable onPress={() => removeLesson(module, lesson)}><MaterialIcons name="delete-outline" size={18} color="#C64545" /></Pressable></View>)}<View style={styles.lessonForm}><Text style={styles.formSubhead}>{editingLesson ? "Edit learning activity" : "Add learning activity"}</Text><TextInput value={lessonTitle} onChangeText={setLessonTitle} placeholder="Lesson title" placeholderTextColor="#829AB1" style={styles.input} /><TextInput value={lessonDescription} onChangeText={setLessonDescription} placeholder="Learner-facing description" placeholderTextColor="#829AB1" style={styles.input} /><View style={styles.kindGrid}>{lessonKinds.map((kind) => <Pressable key={kind.value} onPress={() => setLessonKind(kind.value)} style={[styles.kind, lessonKind === kind.value && styles.kindSelected]}><MaterialIcons name={kind.icon} size={16} color={lessonKind === kind.value ? "#FFFFFF" : "#183B65"} /><Text style={[styles.kindText, lessonKind === kind.value && { color: "#FFFFFF" }]}>{kind.label}</Text></Pressable>)}</View>{lessonKind === "article" ? <TextInput value={lessonBody} onChangeText={setLessonBody} placeholder="Rich-text article content" placeholderTextColor="#829AB1" style={[styles.input, styles.textarea]} multiline textAlignVertical="top" /> : null}{lessonKind === "video" ? <TextInput value={lessonBody} onChangeText={setLessonBody} keyboardType="number-pad" placeholder="Video duration in seconds" placeholderTextColor="#829AB1" style={styles.input} /> : null}{lessonKind === "flashcards" ? <TextInput value={lessonBody} onChangeText={setLessonBody} placeholder='JSON, e.g. {"cards":[{"front":"Term","back":"Definition"}]}' placeholderTextColor="#829AB1" style={[styles.input, styles.textarea]} multiline textAlignVertical="top" /> : null}{["quiz", "test", "final_exam"].includes(lessonKind) ? <TextInput value={assessmentJson} onChangeText={setAssessmentJson} placeholder='Assessment JSON with passing_score and questions' placeholderTextColor="#829AB1" style={[styles.input, styles.textarea]} multiline textAlignVertical="top" /> : null}<Pressable onPress={() => void saveLesson(module)} style={styles.primary}><Text style={styles.primaryText}>{editingLesson ? "Update activity" : "Save activity"}</Text><MaterialIcons name="save" size={18} color="#102A43" /></Pressable>{editingLesson ? <Pressable onPress={() => setEditingLesson(null)} style={styles.cancel}><Text style={styles.cancelText}>Cancel editing</Text></Pressable> : null}</View></View>)}</> : null}</ScrollView></ScreenContainer>;
}

function Label({ label }: { label: string }) { return <Text style={styles.label}>{label}</Text>; }
const styles = StyleSheet.create({ content: { paddingTop: 12, paddingBottom: 28 }, back: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", justifyContent: "center", alignItems: "center", marginBottom: 15 }, notice: { backgroundColor: "#EAF5EF", borderRadius: 14, padding: 13, flexDirection: "row", gap: 9, marginBottom: 21 }, noticeText: { color: "#286245", fontSize: 12, lineHeight: 18, flex: 1 }, section: { color: "#102A43", fontSize: 17, fontWeight: "800", marginBottom: 10 }, form: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#E3EAF0", marginBottom: 24 }, label: { color: "#627D98", fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginTop: 11, marginBottom: 6 }, input: { borderWidth: 1, borderColor: "#D8E2EB", borderRadius: 12, minHeight: 46, paddingHorizontal: 12, color: "#102A43", fontSize: 13, marginBottom: 8 }, textarea: { minHeight: 92, paddingTop: 12 }, primary: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, backgroundColor: "#D6A84B", borderRadius: 13, padding: 14, marginTop: 10 }, primaryText: { color: "#102A43", fontSize: 13, fontWeight: "800" }, course: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E3EAF0", marginBottom: 10 }, courseTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" }, courseTitle: { color: "#102A43", fontSize: 15, fontWeight: "800" }, courseMeta: { color: "#627D98", fontSize: 11, marginTop: 4 }, actions: { flexDirection: "row", gap: 7, marginTop: 13 }, secondary: { flex: 1, borderRadius: 11, backgroundColor: "#EAF0F7", minHeight: 40, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, paddingHorizontal: 7 }, secondaryText: { color: "#183B65", fontSize: 11, fontWeight: "800" }, iconButton: { width: 40, borderRadius: 11, backgroundColor: "#FFF2F1", alignItems: "center", justifyContent: "center" }, statusButton: { borderTopWidth: 1, borderTopColor: "#E3EAF0", marginTop: 12, paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, empty: { padding: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", borderRadius: 16 }, emptyText: { color: "#627D98", fontSize: 12, textAlign: "center" }, denied: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E3EAF0", padding: 25 }, deniedTitle: { color: "#102A43", fontSize: 19, fontWeight: "800", marginTop: 13 }, deniedText: { color: "#627D98", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 5 }, module: { backgroundColor: "#FFFFFF", borderRadius: 17, padding: 14, borderWidth: 1, borderColor: "#D8E2EB", marginBottom: 12 }, moduleTitle: { color: "#102A43", fontSize: 15, fontWeight: "800" }, lesson: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: "#EEF2F6", paddingVertical: 11 }, lessonTitle: { color: "#183B65", fontSize: 13, fontWeight: "700" }, lessonForm: { backgroundColor: "#F8F6F1", borderRadius: 14, padding: 12, marginTop: 6 }, formSubhead: { color: "#102A43", fontSize: 13, fontWeight: "800", marginBottom: 8 }, kindGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginVertical: 7 }, kind: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 9, backgroundColor: "#EAF0F7" }, kindSelected: { backgroundColor: "#183B65" }, kindText: { color: "#183B65", fontSize: 10, fontWeight: "800" }, cancel: { alignItems: "center", padding: 10 }, cancelText: { color: "#C64545", fontSize: 12, fontWeight: "700" } });

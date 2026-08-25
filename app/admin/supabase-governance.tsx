import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { Pill, ScreenTitle } from "@/components/university-ui";
import { useSupabaseSession } from "@/hooks/use-supabase-auth";
import { listManagedCourses, listUniversityProfiles, setCourseStatus, setUniversityRole, type ManagedCourse } from "@/lib/supabase-university";
import type { UniversityProfile, UniversityRole } from "@/lib/supabase";

type Tab = "overview" | "users" | "courses";

const tabs: { id: Tab; label: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { id: "overview", label: "Overview", icon: "dashboard" },
  { id: "users", label: "Users", icon: "groups" },
  { id: "courses", label: "Courses", icon: "menu-book" },
];

const roleChoices: { role: UniversityRole; label: string; description: string; icon: React.ComponentProps<typeof MaterialIcons>["name"] }[] = [
  { role: "student", label: "Learner", description: "Revoke staff access", icon: "school" },
  { role: "instructor", label: "Instructor", description: "Create course content", icon: "edit-note" },
  { role: "administrator", label: "Administrator", description: "Manage academic operations", icon: "admin-panel-settings" },
  { role: "super_admin", label: "Super-admin", description: "Control roles and governance", icon: "verified-user" },
];

function nextCourseStatus(status: ManagedCourse["status"]): ManagedCourse["status"] {
  if (status === "draft") return "review";
  if (status === "review") return "published";
  if (status === "published") return "archived";
  return "draft";
}
function courseAction(status: ManagedCourse["status"]) {
  if (status === "draft") return "Submit review";
  if (status === "review") return "Publish";
  if (status === "published") return "Archive";
  return "Restore draft";
}
function roleLabel(role: UniversityRole) { return roleChoices.find((choice) => choice.role === role)?.label ?? role; }

export default function SupabaseGovernanceScreen() {
  const { profile, loading: sessionLoading } = useSupabaseSession();
  const [tab, setTab] = useState<Tab>("overview");
  const [profiles, setProfiles] = useState<UniversityProfile[]>([]);
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [roleEditorId, setRoleEditorId] = useState<string | null>(null);
  const isSuperAdmin = profile?.role === "super_admin";

  const refresh = useCallback(async () => {
    setLoadingData(true);
    try {
      const [nextProfiles, nextCourses] = await Promise.all([listUniversityProfiles(), listManagedCourses()]);
      setProfiles(nextProfiles);
      setCourses(nextCourses);
    } catch (error) {
      Alert.alert("Unable to load administration records", error instanceof Error ? error.message : "Check the secure connection and try again.");
    } finally { setLoadingData(false); }
  }, []);

  useEffect(() => { if (isSuperAdmin) void refresh(); }, [isSuperAdmin, refresh]);

  const filteredProfiles = useMemo(() => profiles.filter((item) => `${item.email} ${item.display_name ?? ""} ${item.legal_name ?? ""} ${item.role}`.toLowerCase().includes(search.trim().toLowerCase())), [profiles, search]);
  const filteredCourses = useMemo(() => courses.filter((item) => `${item.title} ${item.category} ${item.status}`.toLowerCase().includes(search.trim().toLowerCase())), [courses, search]);
  const staffCount = profiles.filter((item) => item.role !== "student").length;
  const publishedCount = courses.filter((item) => item.status === "published").length;

  const performRoleChange = async (target: UniversityProfile, next: UniversityRole) => {
    setWorking(`user-${target.id}`);
    try {
      await setUniversityRole(target.id, next);
      setRoleEditorId(null);
      await refresh();
    } catch (error) {
      Alert.alert("Role not updated", error instanceof Error ? error.message : "Please retry.");
    } finally { setWorking(null); }
  };

  const requestRoleChange = (target: UniversityProfile, next: UniversityRole) => {
    if (target.id === profile?.id) {
      Alert.alert("Protected super-admin role", "Use a different verified super-admin account to change your own role.");
      return;
    }
    if (target.role === next) return;
    const isRevocation = next === "student" && target.role !== "student";
    Alert.alert(
      isRevocation ? "Revoke staff access?" : `Assign ${roleLabel(next)}?`,
      isRevocation
        ? `${target.email} will keep their learner account but lose staff and governance access.`
        : `${target.email} will receive ${roleLabel(next)} access after this protected Supabase update.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: isRevocation ? "Revoke access" : "Assign role", style: isRevocation ? "destructive" : "default", onPress: () => void performRoleChange(target, next) },
      ],
    );
  };

  const changeCourseStatus = async (course: ManagedCourse) => {
    const next = nextCourseStatus(course.status);
    setWorking(`course-${course.id}`);
    try {
      await setCourseStatus(course.id, next);
      await refresh();
    } catch (error) { Alert.alert("Course not updated", error instanceof Error ? error.message : "Please retry."); } finally { setWorking(null); }
  };

  if (sessionLoading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#183B65" /></ScreenContainer>;
  if (!isSuperAdmin) return <ScreenContainer className="px-5 justify-center"><View style={styles.denied}><MaterialIcons name="admin-panel-settings" size={32} color="#D6A84B" /><Text style={styles.deniedTitle}>Super-admin access required</Text><Text style={styles.deniedText}>Only a verified super-admin account can govern university users, courses, and global operations.</Text><Pressable onPress={() => router.back()} style={styles.primary}><Text style={styles.primaryText}>Return to profile</Text></Pressable></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><Pressable onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#102A43" /></Pressable><ScreenTitle eyebrow="Founder control center" title="Super-admin dashboard" /><View style={styles.notice}><MaterialIcons name="verified-user" size={20} color="#D6A84B" /><Text style={styles.noticeText}>Every role action is confirmed in the interface and enforced by Supabase Row Level Security. Credentials and private learner documents are never exposed here.</Text></View><View style={styles.metrics}><Metric label="Users" value={profiles.length} icon="groups" /><Metric label="Staff" value={staffCount} icon="admin-panel-settings" tone="#177648" /><Metric label="Published" value={publishedCount} icon="public" tone="#9A6F1E" /></View><View style={styles.tabs}>{tabs.map((item) => <Pressable key={item.id} onPress={() => { setTab(item.id); setSearch(""); setRoleEditorId(null); }} style={[styles.tab, tab === item.id && styles.tabActive]}><MaterialIcons name={item.icon} size={17} color={tab === item.id ? "#FFFFFF" : "#627D98"} /><Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text></Pressable>)}</View>{tab === "overview" ? <Overview onUsers={() => setTab("users")} onCourses={() => setTab("courses")} onStudio={() => router.push("/admin/supabase-studio")} /> : <><View style={styles.search}><MaterialIcons name="search" size={19} color="#627D98" /><TextInput value={search} onChangeText={setSearch} placeholder={tab === "users" ? "Search users, email, or role" : "Search courses, categories, or status"} placeholderTextColor="#829AB1" style={styles.searchInput} autoCapitalize="none" /><Pressable onPress={() => void refresh()} style={styles.refresh} accessibilityLabel="Refresh administration records"><MaterialIcons name="refresh" size={19} color="#183B65" /></Pressable></View>{loadingData ? <View style={styles.loading}><ActivityIndicator color="#183B65" /><Text style={styles.loadingText}>Refreshing secure records…</Text></View> : null}{tab === "users" ? <Users profiles={filteredProfiles} currentUserId={profile?.id} working={working} roleEditorId={roleEditorId} onToggleRoleEditor={(id) => setRoleEditorId((current) => current === id ? null : id)} onRoleChange={requestRoleChange} /> : <Courses courses={filteredCourses} working={working} onStatusChange={changeCourseStatus} onStudio={() => router.push("/admin/supabase-studio")} />}</>}</ScrollView></ScreenContainer>;
}

function Metric({ label, value, icon, tone = "#183B65" }: { label: string; value: number; icon: React.ComponentProps<typeof MaterialIcons>["name"]; tone?: string }) { return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}><MaterialIcons name={icon} size={18} color={tone} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function Overview({ onUsers, onCourses, onStudio }: { onUsers: () => void; onCourses: () => void; onStudio: () => void }) { return <View style={styles.overview}><Text style={styles.sectionTitle}>University operations</Text><Text style={styles.sectionText}>Assign learner, instructor, administrator, or super-admin roles deliberately. Selecting Learner revokes staff access while retaining the account and academic record.</Text><Pressable onPress={onUsers} style={styles.action}><View style={styles.actionIcon}><MaterialIcons name="manage-accounts" size={20} color="#183B65" /></View><View style={{ flex: 1 }}><Text style={styles.actionTitle}>Manage people</Text><Text style={styles.actionText}>Assign or revoke roles with a confirmed protected update.</Text></View><MaterialIcons name="chevron-right" size={21} color="#829AB1" /></Pressable><Pressable onPress={onCourses} style={styles.action}><View style={styles.actionIcon}><MaterialIcons name="rule" size={20} color="#183B65" /></View><View style={{ flex: 1 }}><Text style={styles.actionTitle}>Govern course states</Text><Text style={styles.actionText}>Review, publish, archive, or restore courses.</Text></View><MaterialIcons name="chevron-right" size={21} color="#829AB1" /></Pressable><Pressable onPress={onStudio} style={styles.primary}><MaterialIcons name="edit-note" size={19} color="#102A43" /><Text style={styles.primaryText}>Open secure course studio</Text></Pressable></View>; }
function Users({ profiles, currentUserId, working, roleEditorId, onToggleRoleEditor, onRoleChange }: { profiles: UniversityProfile[]; currentUserId?: string; working: string | null; roleEditorId: string | null; onToggleRoleEditor: (id: string) => void; onRoleChange: (profile: UniversityProfile, role: UniversityRole) => void }) { return <View><Text style={styles.listHeading}>{profiles.length} accounts</Text>{profiles.map((item) => { const protectedUser = item.id === currentUserId; const editing = roleEditorId === item.id; const isWorking = working === `user-${item.id}`; return <View style={styles.userCard} key={item.id}><View style={styles.userTop}><View style={styles.userIcon}><Text style={styles.userInitial}>{(item.legal_name || item.display_name || item.email).slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.userName}>{item.legal_name || item.display_name || "Learner"}</Text><Text style={styles.userEmail}>{item.email}</Text><View style={styles.roleLine}><Pill label={roleLabel(item.role)} tone={item.role === "super_admin" ? "gold" : item.role === "administrator" ? "green" : "slate"} />{protectedUser ? <Text style={styles.protected}>Your role is protected</Text> : null}</View></View><Pressable onPress={() => onToggleRoleEditor(item.id)} disabled={isWorking || protectedUser} style={[styles.outlineButton, protectedUser && { opacity: 0.45 }]}>{isWorking ? <ActivityIndicator color="#183B65" size="small" /> : <><MaterialIcons name="manage-accounts" size={17} color="#183B65" /><Text style={styles.outlineText}>{editing ? "Close" : "Manage"}</Text></>}</Pressable></View>{editing ? <View style={styles.roleEditor}><Text style={styles.roleEditorTitle}>Assign access role</Text><Text style={styles.roleEditorText}>Choose Learner to revoke staff access. Changes are logged and checked by Supabase.</Text><View style={styles.roleGrid}>{roleChoices.map((choice) => <Pressable key={choice.role} disabled={choice.role === item.role || isWorking} onPress={() => onRoleChange(item, choice.role)} style={[styles.roleChoice, choice.role === item.role && styles.roleChoiceActive]}><MaterialIcons name={choice.icon} size={17} color={choice.role === item.role ? "#FFFFFF" : "#183B65"} /><View style={{ flex: 1 }}><Text style={[styles.roleChoiceTitle, choice.role === item.role && styles.roleChoiceTitleActive]}>{choice.label}</Text><Text style={[styles.roleChoiceText, choice.role === item.role && styles.roleChoiceTextActive]}>{choice.description}</Text></View>{choice.role === item.role ? <MaterialIcons name="check" size={17} color="#FFFFFF" /> : null}</Pressable>)}</View></View> : null}</View>; })}{!profiles.length ? <Empty message="No user accounts match this search." /> : null}</View>; }
function Courses({ courses, working, onStatusChange, onStudio }: { courses: ManagedCourse[]; working: string | null; onStatusChange: (course: ManagedCourse) => void; onStudio: () => void }) { return <View><View style={styles.courseHeading}><Text style={styles.listHeading}>{courses.length} courses</Text><Pressable onPress={onStudio} style={styles.studioLink}><Text style={styles.studioLinkText}>Studio</Text><MaterialIcons name="arrow-forward" size={16} color="#183B65" /></Pressable></View>{courses.map((course) => <View style={styles.course} key={course.id}><View style={{ flex: 1 }}><Text style={styles.courseTitle}>{course.title}</Text><Text style={styles.courseMeta}>{course.category} · ${(course.price_cents / 100).toFixed(2)} {course.currency.toUpperCase()}</Text><View style={{ marginTop: 8, alignSelf: "flex-start" }}><Pill label={course.status} tone={course.status === "published" ? "green" : course.status === "review" ? "gold" : "slate"} /></View></View><Pressable onPress={() => onStatusChange(course)} disabled={working === `course-${course.id}`} style={styles.outlineButton}>{working === `course-${course.id}` ? <ActivityIndicator color="#183B65" size="small" /> : <><MaterialIcons name="published-with-changes" size={17} color="#183B65" /><Text style={styles.outlineText}>{courseAction(course.status)}</Text></>}</Pressable></View>)}{!courses.length ? <Empty message="No course records match this search." /> : null}</View>; }
function Empty({ message }: { message: string }) { return <View style={styles.empty}><MaterialIcons name="manage-search" size={29} color="#D6A84B" /><Text style={styles.emptyText}>{message}</Text></View>; }

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 28 }, back: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", justifyContent: "center", alignItems: "center", marginBottom: 15 }, notice: { backgroundColor: "#102A43", borderRadius: 16, padding: 14, flexDirection: "row", gap: 9, marginBottom: 16 }, noticeText: { color: "#D2DFEA", fontSize: 12, lineHeight: 18, flex: 1 }, metrics: { flexDirection: "row", gap: 8, marginBottom: 16 }, metric: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 15, padding: 11, borderWidth: 1, borderColor: "#E3EAF0" }, metricIcon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center" }, metricValue: { color: "#102A43", fontSize: 20, fontWeight: "800", marginTop: 8 }, metricLabel: { color: "#627D98", fontSize: 10, marginTop: 2 }, tabs: { flexDirection: "row", gap: 7, backgroundColor: "#EAF0F7", padding: 4, borderRadius: 14, marginBottom: 15 }, tab: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 }, tabActive: { backgroundColor: "#183B65" }, tabText: { color: "#627D98", fontSize: 11, fontWeight: "800" }, tabTextActive: { color: "#FFFFFF" }, overview: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E3EAF0", padding: 16 }, sectionTitle: { color: "#102A43", fontSize: 17, fontWeight: "800" }, sectionText: { color: "#627D98", fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 14 }, action: { borderTopWidth: 1, borderTopColor: "#E8EEF2", paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }, actionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#EAF0F7", alignItems: "center", justifyContent: "center" }, actionTitle: { color: "#102A43", fontSize: 13, fontWeight: "800" }, actionText: { color: "#627D98", fontSize: 10, marginTop: 3 }, primary: { minHeight: 46, borderRadius: 13, backgroundColor: "#D6A84B", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, paddingHorizontal: 14, marginTop: 14 }, primaryText: { color: "#102A43", fontWeight: "800", fontSize: 13 }, search: { height: 48, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D8E2EB", borderRadius: 14, paddingLeft: 13, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }, searchInput: { flex: 1, color: "#102A43", fontSize: 13, height: 46 }, refresh: { height: 46, width: 44, justifyContent: "center", alignItems: "center", borderLeftWidth: 1, borderLeftColor: "#E3EAF0" }, loading: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 10, backgroundColor: "#EAF0F7", borderRadius: 12, marginBottom: 12 }, loadingText: { color: "#4A5E73", fontSize: 11, fontWeight: "700" }, listHeading: { color: "#102A43", fontSize: 14, fontWeight: "800", marginBottom: 10 }, userCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", borderRadius: 15, padding: 12, marginBottom: 9 }, userTop: { flexDirection: "row", alignItems: "center", gap: 10 }, userIcon: { height: 37, width: 37, borderRadius: 12, backgroundColor: "#EAF0F7", justifyContent: "center", alignItems: "center" }, userInitial: { color: "#183B65", fontWeight: "800" }, userName: { color: "#102A43", fontSize: 13, fontWeight: "800" }, userEmail: { color: "#627D98", fontSize: 10, marginTop: 3 }, roleLine: { flexDirection: "row", gap: 7, alignItems: "center", marginTop: 7 }, protected: { color: "#9A6F1E", fontSize: 9, fontWeight: "800" }, outlineButton: { minWidth: 70, minHeight: 38, borderRadius: 11, backgroundColor: "#EAF0F7", alignItems: "center", justifyContent: "center", paddingHorizontal: 8, flexDirection: "row", gap: 4 }, outlineText: { color: "#183B65", fontSize: 10, fontWeight: "800", textAlign: "center" }, roleEditor: { backgroundColor: "#F7FAFC", borderRadius: 12, marginTop: 11, padding: 11, borderWidth: 1, borderColor: "#D8E2EB" }, roleEditorTitle: { color: "#102A43", fontSize: 12, fontWeight: "900" }, roleEditorText: { color: "#627D98", fontSize: 10, lineHeight: 15, marginTop: 3 }, roleGrid: { gap: 7, marginTop: 10 }, roleChoice: { minHeight: 51, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D8E2EB", paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8 }, roleChoiceActive: { backgroundColor: "#183B65", borderColor: "#183B65" }, roleChoiceTitle: { color: "#183B65", fontSize: 11, fontWeight: "900" }, roleChoiceTitleActive: { color: "#FFFFFF" }, roleChoiceText: { color: "#627D98", fontSize: 9, marginTop: 1 }, roleChoiceTextActive: { color: "#D2DFEA" }, courseHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, studioLink: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 10 }, studioLinkText: { color: "#183B65", fontSize: 11, fontWeight: "800" }, course: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 }, courseTitle: { color: "#102A43", fontSize: 13, fontWeight: "800" }, courseMeta: { color: "#627D98", fontSize: 10, marginTop: 4 }, empty: { alignItems: "center", padding: 28, backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#E3EAF0" }, emptyText: { color: "#627D98", fontSize: 12, textAlign: "center", marginTop: 8 }, denied: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E3EAF0", padding: 25 }, deniedTitle: { color: "#102A43", fontSize: 19, fontWeight: "800", marginTop: 13 }, deniedText: { color: "#627D98", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 5 },
});

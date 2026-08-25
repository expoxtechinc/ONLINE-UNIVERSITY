import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { Pill, ScreenTitle } from "@/components/university-ui";
import { useSupabaseSession } from "@/hooks/use-supabase-auth";
import { listUniversityProfiles, setUniversityRole } from "@/lib/supabase-university";
import type { UniversityProfile, UniversityRole } from "@/lib/supabase";

const roles: UniversityRole[] = ["student", "instructor", "administrator", "super_admin"];

export default function SupabaseGovernanceScreen() {
  const { profile, loading } = useSupabaseSession();
  const [profiles, setProfiles] = useState<UniversityProfile[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const isSuperAdmin = profile?.role === "super_admin";
  const refresh = useCallback(async () => { try { setProfiles(await listUniversityProfiles()); } catch (error) { Alert.alert("Unable to load user records", error instanceof Error ? error.message : "Please retry."); } }, []);
  useEffect(() => { if (isSuperAdmin) void refresh(); }, [isSuperAdmin, refresh]);
  const advanceRole = async (target: UniversityProfile) => { const next = roles[(roles.indexOf(target.role) + 1) % roles.length]; setWorking(target.id); try { await setUniversityRole(target.id, next); await refresh(); } catch (error) { Alert.alert("Role not updated", error instanceof Error ? error.message : "Please retry."); } finally { setWorking(null); } };
  if (loading) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color="#183B65" /></ScreenContainer>;
  if (!isSuperAdmin) return <ScreenContainer className="px-5 justify-center"><View style={styles.denied}><MaterialIcons name="admin-panel-settings" size={32} color="#D6A84B" /><Text style={styles.deniedTitle}>Super-admin access required</Text><Text style={styles.deniedText}>Only the dedicated founder super-admin account can govern user roles and global administration.</Text><Pressable onPress={() => router.back()} style={styles.primary}><Text style={styles.primaryText}>Return to profile</Text></Pressable></View></ScreenContainer>;
  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5"><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><Pressable onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#102A43" /></Pressable><ScreenTitle eyebrow="Founder governance" title="University access" /><View style={styles.notice}><MaterialIcons name="shield" size={20} color="#D6A84B" /><Text style={styles.noticeText}>Role changes apply through Supabase Row Level Security. The founder allowlist ensures the approved Google identity is granted super-admin access on first sign-in.</Text></View>{profiles.map((item) => <View style={styles.user} key={item.id}><View style={styles.userIcon}><Text style={styles.userInitial}>{(item.legal_name || item.display_name || item.email).slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.userName}>{item.legal_name || item.display_name || "Learner"}</Text><Text style={styles.userEmail}>{item.email}</Text></View><Pressable onPress={() => advanceRole(item)} disabled={working === item.id || item.email === "akin.sokpah.link@gmail.com"} style={styles.role}><Pill label={item.role.replace("_", " ")} tone={item.role === "super_admin" ? "gold" : item.role === "administrator" ? "green" : "slate"} /></Pressable></View>)}</ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { paddingTop: 12, paddingBottom: 28 }, back: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", justifyContent: "center", alignItems: "center", marginBottom: 15 }, notice: { backgroundColor: "#102A43", borderRadius: 16, padding: 14, flexDirection: "row", gap: 9, marginBottom: 20 }, noticeText: { color: "#D2DFEA", fontSize: 12, lineHeight: 18, flex: 1 }, user: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E3EAF0", borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 }, userIcon: { height: 37, width: 37, borderRadius: 12, backgroundColor: "#EAF0F7", justifyContent: "center", alignItems: "center" }, userInitial: { color: "#183B65", fontWeight: "800" }, userName: { color: "#102A43", fontSize: 13, fontWeight: "800" }, userEmail: { color: "#627D98", fontSize: 10, marginTop: 3 }, role: { padding: 3 }, denied: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E3EAF0", padding: 25 }, deniedTitle: { color: "#102A43", fontSize: 19, fontWeight: "800", marginTop: 13 }, deniedText: { color: "#627D98", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 5 }, primary: { backgroundColor: "#D6A84B", borderRadius: 13, paddingVertical: 13, paddingHorizontal: 18, marginTop: 18 }, primaryText: { color: "#102A43", fontSize: 13, fontWeight: "800" } });

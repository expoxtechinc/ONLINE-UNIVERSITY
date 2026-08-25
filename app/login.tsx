import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useSupabaseAuth } from "@/lib/supabase-auth";

function userMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();
  if (lower.includes("not configured")) return "This deployment is missing its secure Supabase connection. Ask an administrator to add the public Supabase settings in Vercel, then redeploy.";
  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("timeout")) return "We could not reach the secure sign-in service. Check your connection and try again.";
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) return "The email address or password is incorrect. Please try again.";
  if (lower.includes("already registered")) return "An account already exists for this email. Switch to Sign in to continue.";
  return message || "We could not complete the secure sign-in request. Please try again.";
}

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, loading: restoringSession, error: connectionError, refresh } = useSupabaseAuth();
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const busy = submitting || retrying;

  useEffect(() => { if (connectionError) setMessage(userMessage(connectionError)); }, [connectionError]);
  useEffect(() => { if (!isSupabaseConfigured) setMessage("This deployment is missing its secure Supabase connection. Ask an administrator to add the public Supabase settings in Vercel, then redeploy."); }, []);

  const retryConnection = async () => { setRetrying(true); setMessage(null); try { await refresh(); } catch (error) { setMessage(userMessage(error)); } finally { setRetrying(false); } };
  const submit = async () => {
    if (!email.trim() || !password) { setMessage("Enter your email address and password to continue."); return; }
    if (mode === "create" && !name.trim()) { setMessage("Enter your full name to create an academic record."); return; }
    setMessage(null); setSubmitting(true);
    try {
      if (mode === "create") {
        const requiresEmailConfirmation = await signUp({ email, password, fullName: name });
        Alert.alert("Account created", requiresEmailConfirmation ? "Check your inbox to confirm your account, then sign in." : "Your learner account is ready.");
        if (!requiresEmailConfirmation) router.replace("/(tabs)"); else setMode("signIn");
      } else { await signIn(email, password); router.replace("/(tabs)"); }
    } catch (error) { setMessage(userMessage(error)); } finally { setSubmitting(false); }
  };
  const google = async () => { setMessage(null); setSubmitting(true); try { await signInWithGoogle(); } catch (error) { setMessage(userMessage(error)); } finally { setSubmitting(false); } };
  const updateMode = (next: "signIn" | "create") => { setMode(next); setMessage(null); };

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5"><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.brand}><View style={styles.cap}><Text style={styles.capText}>OU</Text></View><Text style={styles.wordmark}>ONLINE UNIVERSITY</Text><Text style={styles.title}>{mode === "signIn" ? "Welcome back" : "Begin your learning path"}</Text><Text style={styles.subtitle}>{mode === "signIn" ? "Sign in to access your verified learning record." : "Create a secure learner account to enroll in courses."}</Text></View><View style={styles.switcher}><Pressable disabled={busy} onPress={() => updateMode("signIn")} style={[styles.switch, mode === "signIn" && styles.switchActive]}><Text style={[styles.switchText, mode === "signIn" && styles.switchTextActive]}>Sign in</Text></Pressable><Pressable disabled={busy} onPress={() => updateMode("create")} style={[styles.switch, mode === "create" && styles.switchActive]}><Text style={[styles.switchText, mode === "create" && styles.switchTextActive]}>Create account</Text></Pressable></View><View style={styles.form}>{restoringSession ? <View style={styles.checking}><ActivityIndicator size="small" color="#183B65" /><Text style={styles.checkingText}>Checking your secure connection…</Text></View> : null}{message ? <View style={styles.errorBanner}><MaterialIcons name="cloud-off" size={19} color="#8B2F2F" /><View style={{ flex: 1 }}><Text style={styles.errorTitle}>Sign-in needs attention</Text><Text style={styles.errorText}>{message}</Text></View><Pressable onPress={() => void retryConnection()} disabled={busy} style={styles.retry}>{retrying ? <ActivityIndicator size="small" color="#8B2F2F" /> : <Text style={styles.retryText}>Retry</Text>}</Pressable></View> : null}{mode === "create" ? <><Text style={styles.label}>FULL NAME</Text><TextInput value={name} onChangeText={(value) => { setName(value); setMessage(null); }} placeholder="Your full legal name" placeholderTextColor="#829AB1" style={styles.input} autoCapitalize="words" editable={!busy} /></> : null}<Text style={styles.label}>EMAIL ADDRESS</Text><TextInput value={email} onChangeText={(value) => { setEmail(value); setMessage(null); }} placeholder="name@example.com" placeholderTextColor="#829AB1" style={styles.input} autoCapitalize="none" keyboardType="email-address" autoCorrect={false} editable={!busy} /><Text style={styles.label}>PASSWORD</Text><TextInput value={password} onChangeText={(value) => { setPassword(value); setMessage(null); }} placeholder={mode === "create" ? "At least 12 characters" : "Your password"} placeholderTextColor="#829AB1" style={styles.input} secureTextEntry autoCapitalize="none" editable={!busy} /><Pressable onPress={submit} disabled={busy || restoringSession} style={({ pressed }) => [styles.primary, (pressed || busy || restoringSession) && { opacity: 0.76 }]}>{submitting ? <><ActivityIndicator color="#102A43" /><Text style={styles.primaryText}>Securing your session…</Text></> : <Text style={styles.primaryText}>{mode === "signIn" ? "Sign in securely" : "Create secure account"}</Text>}</Pressable><View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>OR</Text><View style={styles.dividerLine} /></View><Pressable onPress={google} disabled={busy || restoringSession} style={({ pressed }) => [styles.google, (pressed || busy || restoringSession) && { opacity: 0.72 }]}>{submitting ? <ActivityIndicator color="#183B65" /> : <MaterialIcons name="account-circle" size={20} color="#183B65" />}<Text style={styles.googleText}>{submitting ? "Connecting securely…" : "Continue with Google"}</Text></Pressable><Text style={styles.notice}>Authentication is protected by Supabase Auth. Your account data and learning records are governed by role-based access policies.</Text></View></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { flexGrow: 1, paddingVertical: 32, justifyContent: "center" }, brand: { alignItems: "center", marginBottom: 28 }, cap: { width: 64, height: 64, borderRadius: 22, backgroundColor: "#102A43", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#D6A84B" }, capText: { color: "#D6A84B", fontSize: 18, fontWeight: "800" }, wordmark: { color: "#9A6F1E", fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginTop: 13 }, title: { color: "#102A43", fontSize: 27, fontWeight: "800", letterSpacing: -0.4, marginTop: 8, textAlign: "center" }, subtitle: { color: "#627D98", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7, maxWidth: 300 }, switcher: { flexDirection: "row", backgroundColor: "#EAF0F7", borderRadius: 14, padding: 4, marginBottom: 20 }, switch: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 11 }, switchActive: { backgroundColor: "#FFFFFF" }, switchText: { color: "#627D98", fontSize: 13, fontWeight: "700" }, switchTextActive: { color: "#102A43" }, form: { backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E3EAF0", padding: 17 }, checking: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#EAF0F7", padding: 10, borderRadius: 12, marginBottom: 12 }, checkingText: { color: "#4A5E73", fontSize: 11, fontWeight: "800" }, errorBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FDECEC", borderWidth: 1, borderColor: "#F2C8C8", padding: 11, borderRadius: 13, marginBottom: 5 }, errorTitle: { color: "#8B2F2F", fontSize: 11, fontWeight: "900" }, errorText: { color: "#9C4C4C", fontSize: 11, lineHeight: 15, marginTop: 2 }, retry: { minWidth: 42, minHeight: 30, justifyContent: "center", alignItems: "center", borderRadius: 9, backgroundColor: "#FFFFFF" }, retryText: { color: "#8B2F2F", fontSize: 10, fontWeight: "900" }, label: { color: "#627D98", fontWeight: "800", fontSize: 10, letterSpacing: 0.9, marginBottom: 7, marginTop: 11 }, input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#D8E2EB", paddingHorizontal: 13, fontSize: 14, color: "#102A43", backgroundColor: "#FFFFFF" }, primary: { height: 50, marginTop: 20, backgroundColor: "#D6A84B", borderRadius: 13, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8 }, primaryText: { color: "#102A43", fontSize: 14, fontWeight: "800" }, divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 }, dividerLine: { height: 1, backgroundColor: "#E3EAF0", flex: 1 }, dividerText: { color: "#829AB1", fontSize: 10, fontWeight: "800" }, google: { height: 48, borderRadius: 13, borderWidth: 1, borderColor: "#183B65", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, googleText: { color: "#183B65", fontSize: 13, fontWeight: "800" }, notice: { color: "#829AB1", fontSize: 11, lineHeight: 16, marginTop: 15, textAlign: "center" } });

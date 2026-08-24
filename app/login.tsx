import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { localLogin, registerLocalAccount } from "@/lib/platform-api";

export default function LoginScreen() {
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "create") {
        await registerLocalAccount({ username, password, email, name });
        Alert.alert("Account created", "Your learner account is ready. Sign in to access your courses.");
        setMode("signIn");
      } else {
        await localLogin(username, password);
        router.replace("/(tabs)");
      }
    } catch (error) {
      Alert.alert("Unable to continue", error instanceof Error ? error.message : "Please check your details and try again.");
    } finally { setLoading(false); }
  };
  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5"><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.brand}><View style={styles.cap}><Text style={styles.capText}>OU</Text></View><Text style={styles.wordmark}>ONLINE UNIVERSITY</Text><Text style={styles.title}>{mode === "signIn" ? "Welcome back" : "Begin your learning path"}</Text><Text style={styles.subtitle}>{mode === "signIn" ? "Sign in to access your verified learning record." : "Create a secure learner account to enroll in courses."}</Text></View><View style={styles.switcher}><Pressable onPress={() => setMode("signIn")} style={[styles.switch, mode === "signIn" && styles.switchActive]}><Text style={[styles.switchText, mode === "signIn" && styles.switchTextActive]}>Sign in</Text></Pressable><Pressable onPress={() => setMode("create")} style={[styles.switch, mode === "create" && styles.switchActive]}><Text style={[styles.switchText, mode === "create" && styles.switchTextActive]}>Create account</Text></Pressable></View><View style={styles.form}>{mode === "create" ? <><Text style={styles.label}>FULL NAME</Text><TextInput value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#829AB1" style={styles.input} autoCapitalize="words" /><Text style={styles.label}>EMAIL ADDRESS</Text><TextInput value={email} onChangeText={setEmail} placeholder="name@example.com" placeholderTextColor="#829AB1" style={styles.input} autoCapitalize="none" keyboardType="email-address" /></> : null}<Text style={styles.label}>USERNAME</Text><TextInput value={username} onChangeText={setUsername} placeholder="Your username" placeholderTextColor="#829AB1" style={styles.input} autoCapitalize="none" autoCorrect={false} /><Text style={styles.label}>PASSWORD</Text><TextInput value={password} onChangeText={setPassword} placeholder={mode === "create" ? "At least 12 characters" : "Your password"} placeholderTextColor="#829AB1" style={styles.input} secureTextEntry autoCapitalize="none" /><Pressable onPress={submit} disabled={loading} style={({ pressed }) => [styles.primary, (pressed || loading) && { opacity: 0.76 }]}>{loading ? <ActivityIndicator color="#102A43" /> : <Text style={styles.primaryText}>{mode === "signIn" ? "Sign in securely" : "Create secure account"}</Text>}</Pressable><Text style={styles.notice}>Passwords are protected using one-way server-side hashing. Payment details are processed only through the secure checkout provider.</Text></View></ScrollView></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { flexGrow: 1, paddingVertical: 32, justifyContent: "center" }, brand: { alignItems: "center", marginBottom: 28 }, cap: { width: 64, height: 64, borderRadius: 22, backgroundColor: "#102A43", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#D6A84B" }, capText: { color: "#D6A84B", fontSize: 18, fontWeight: "800" }, wordmark: { color: "#9A6F1E", fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginTop: 13 }, title: { color: "#102A43", fontSize: 27, fontWeight: "800", letterSpacing: -0.4, marginTop: 8, textAlign: "center" }, subtitle: { color: "#627D98", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7, maxWidth: 300 }, switcher: { flexDirection: "row", backgroundColor: "#EAF0F7", borderRadius: 14, padding: 4, marginBottom: 20 }, switch: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 11 }, switchActive: { backgroundColor: "#FFFFFF" }, switchText: { color: "#627D98", fontSize: 13, fontWeight: "700" }, switchTextActive: { color: "#102A43" }, form: { backgroundColor: "#FFFFFF", borderRadius: 20, borderWidth: 1, borderColor: "#E3EAF0", padding: 17 }, label: { color: "#627D98", fontWeight: "800", fontSize: 10, letterSpacing: 0.9, marginBottom: 7, marginTop: 11 }, input: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#D8E2EB", paddingHorizontal: 13, fontSize: 14, color: "#102A43", backgroundColor: "#FFFFFF" }, primary: { height: 50, marginTop: 20, backgroundColor: "#D6A84B", borderRadius: 13, justifyContent: "center", alignItems: "center" }, primaryText: { color: "#102A43", fontSize: 14, fontWeight: "800" }, notice: { color: "#829AB1", fontSize: 11, lineHeight: 16, marginTop: 15, textAlign: "center" } });

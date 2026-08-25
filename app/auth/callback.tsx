import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/lib/supabase-auth";

export default function AuthCallbackScreen() {
  const { refresh } = useSupabaseAuth();
  const [message, setMessage] = useState("Completing your secure sign-in…");

  useEffect(() => {
    let mounted = true;
    const complete = async () => {
      if (!isSupabaseConfigured) {
        if (mounted) setMessage("Secure sign-in is not configured for this deployment.");
        return;
      }
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          if (mounted) setMessage("We could not finish the sign-in. Return to sign in and try again.");
          return;
        }
        await refresh();
        router.replace("/(tabs)");
      } catch {
        if (mounted) setMessage("We could not complete secure sign-in. Return to the app and try again.");
      }
    };
    void complete();
    return () => { mounted = false; };
  }, [refresh]);

  return <ScreenContainer edges={["top", "left", "right", "bottom"]} className="px-5"><View style={styles.container}><ActivityIndicator size="large" color="#183B65" /><Text style={styles.title}>Online University</Text><Text style={styles.message}>{message}</Text></View></ScreenContainer>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  title: { color: "#102A43", fontSize: 22, fontWeight: "800", marginTop: 18 },
  message: { color: "#627D98", fontSize: 14, lineHeight: 20, marginTop: 8, textAlign: "center" },
});

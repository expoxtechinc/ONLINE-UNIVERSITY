import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured, requireSupabaseConfiguration, supabase, type UniversityProfile } from "@/lib/supabase";
import { webAuthRedirectUri } from "@/lib/auth-redirects";

if (typeof window !== "undefined") WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  session: Session | null;
  profile: UniversityProfile | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; fullName: string }) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SupabaseAuthContext = createContext<AuthContextValue | null>(null);

function extractHashTokens(url: string) {
  const hash = url.split("#")[1] ?? "";
  const values = new URLSearchParams(hash);
  return { accessToken: values.get("access_token"), refreshToken: values.get("refresh_token") };
}

export function SupabaseAuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UniversityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user.id) { setProfile(null); return; }
    const { data, error: profileError } = await supabase.from("profiles").select("id,email,display_name,legal_name,country_code,role").eq("id", activeSession.user.id).maybeSingle();
    if (profileError) throw profileError;
    setProfile(data as UniversityProfile | null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      requireSupabaseConfiguration();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      setSession(data.session);
      await loadProfile(data.session);
      setError(null);
    } catch (caught) {
      setSession(null);
      setProfile(null);
      setError(caught instanceof Error ? caught : new Error("Unable to restore your session."));
    } finally { setLoading(false); }
  }, [loadProfile]);

  useEffect(() => {
    refresh();
    if (!isSupabaseConfigured) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession).catch((caught) => setError(caught instanceof Error ? caught : new Error("Unable to load account profile.")));
      setLoading(false);
    });
    return () => subscription.subscription.unsubscribe();
  }, [loadProfile, refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    requireSupabaseConfiguration();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (signInError) throw signInError;
  }, []);

  const signUp = useCallback(async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
    requireSupabaseConfiguration();
    const redirectTo = Platform.OS === "web" ? (typeof window !== "undefined" ? webAuthRedirectUri(window.location.origin) : undefined) : AuthSession.makeRedirectUri({ scheme: "onlineuniversity", path: "auth/callback" });
    const { data, error: signUpError } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: fullName.trim() }, emailRedirectTo: redirectTo } });
    if (signUpError) throw signUpError;
    return !data.session;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    requireSupabaseConfiguration();
    if (Platform.OS === "web") {
      const redirectTo = typeof window !== "undefined" ? webAuthRedirectUri(window.location.origin) : undefined;
      const { error: signInError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (signInError) throw signInError;
      return;
    }
    const redirectTo = AuthSession.makeRedirectUri({ scheme: "onlineuniversity", path: "auth/callback" });
    const { data, error: signInError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
    if (signInError || !data.url) throw signInError ?? new Error("Google sign-in is unavailable.");
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success") return;
    const { accessToken, refreshToken } = extractHashTokens(result.url);
    if (!accessToken || !refreshToken) throw new Error("Google sign-in did not return a complete secure session.");
    const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (sessionError) throw sessionError;
    router.replace("/(tabs)");
  }, []);

  const signOut = useCallback(async () => {
    requireSupabaseConfiguration();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setProfile(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ session, profile, loading, error, isAuthenticated: Boolean(session), signIn, signUp, signInWithGoogle, signOut, refresh }), [session, profile, loading, error, signIn, signUp, signInWithGoogle, signOut, refresh]);
  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
}

export function useSupabaseAuth() {
  const value = useContext(SupabaseAuthContext);
  if (!value) throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  return value;
}

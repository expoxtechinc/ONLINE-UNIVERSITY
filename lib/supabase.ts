import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const extra = Constants.expoConfig?.extra ?? {};
const configuredUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || (typeof extra.supabaseUrl === "string" ? extra.supabaseUrl.trim() : ""));
const configuredPublishableKey = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || (typeof extra.supabasePublishableKey === "string" ? extra.supabasePublishableKey.trim() : ""));

/**
 * A static Vercel export evaluates modules before browser runtime variables are
 * available. These valid placeholder values keep prerendering deterministic;
 * app operations are explicitly blocked below unless both real public values
 * were supplied at build time.
 */
export const isSupabaseConfigured = Boolean(configuredUrl && configuredPublishableKey);
const url = configuredUrl || "https://build-placeholder.supabase.co";
const publishableKey = configuredPublishableKey || "build-time-placeholder";

export function requireSupabaseConfiguration() {
  if (!isSupabaseConfigured) {
    throw new Error("Online University is not configured for this deployment. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Vercel, then redeploy.");
  }
}

const mobileSecureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const isStaticWebExport = Platform.OS === "web" && typeof window === "undefined";
const serverSafeStorage = { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined };
const storage = isStaticWebExport ? serverSafeStorage : Platform.OS === "web" ? AsyncStorage : mobileSecureStorage;

export const supabase = createClient(url, publishableKey, {
  auth: {
    storage,
    autoRefreshToken: !isStaticWebExport,
    persistSession: !isStaticWebExport,
    detectSessionInUrl: Platform.OS === "web" && !isStaticWebExport,
  },
});

export type UniversityRole = "student" | "instructor" | "administrator" | "super_admin";

export type UniversityProfile = {
  id: string;
  email: string;
  display_name: string | null;
  legal_name: string | null;
  country_code: string | null;
  role: UniversityRole;
};

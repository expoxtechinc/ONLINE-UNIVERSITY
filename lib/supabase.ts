import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

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

import { useSupabaseAuth } from "@/lib/supabase-auth";

export function useSupabaseSession() {
  return useSupabaseAuth();
}

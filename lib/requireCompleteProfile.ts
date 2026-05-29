import { supabase } from "@/lib/supabase";
import { isProfileSetupComplete } from "@/lib/profile";

export async function requireCompleteProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return isProfileSetupComplete(data);
}
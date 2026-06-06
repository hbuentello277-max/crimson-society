import type { SupabaseClient } from "@supabase/supabase-js";

export type NexusOwner = {
  userId: string;
  email: string | null;
  role: string | null;
  status: string | null;
  isPlatformOwner: boolean;
};

export type NexusSession = {
  userId: string;
  email: string | null;
  supabase: SupabaseClient;
  owner: NexusOwner;
};

export type NexusAccessResult =
  | { ok: true; session: NexusSession }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

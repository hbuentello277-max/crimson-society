import { supabase } from "@/lib/supabase";

export function sosChatHref(conversationId: string) {
  return `/inbox?conversation=${encodeURIComponent(conversationId)}`;
}

export async function getRiderSosConversationId(sosEventId: string) {
  const { data, error } = await supabase.rpc("get_rider_sos_conversation_id", {
    p_sos_event_id: sosEventId,
  });

  if (error) throw error;
  return (data as string | null) ?? null;
}

export type ActiveSosChatRow = {
  conversation_id: string;
  sos_event_id: string;
  title: string | null;
};

export async function loadActiveSosChatForCurrentUser() {
  const { data, error } = await supabase.rpc("get_active_rider_sos_chat_for_current_user");

  if (error) throw error;
  const rows = (data ?? []) as ActiveSosChatRow[];
  return rows[0] ?? null;
}


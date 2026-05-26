import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PROFILE_SELECT, cleanUsername } from "@/lib/profile";

type StepResult = {
  step: string;
  ok: boolean;
  data?: unknown;
  error?: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
};

function serializeError(error: unknown) {
  const supabaseError = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };

  return {
    message: supabaseError?.message,
    code: supabaseError?.code,
    details: supabaseError?.details,
    hint: supabaseError?.hint,
  };
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const steps: StepResult[] = [];

  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;
  steps.push({
    step: "auth.getUser",
    ok: !userResponse.error && !!user,
    data: user ? { id: user.id, email: user.email } : null,
    error: userResponse.error ? serializeError(userResponse.error) : undefined,
  });

  if (!user) {
    return NextResponse.json({ ok: false, steps }, { status: 401 });
  }

  const selectResponse = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();
  steps.push({
    step: "profiles.select.current_user",
    ok: !selectResponse.error,
    data: selectResponse.data
      ? {
          id: selectResponse.data.id,
          username: selectResponse.data.username,
          display_name: selectResponse.data.display_name,
          status: selectResponse.data.status,
        }
      : null,
    error: selectResponse.error ? serializeError(selectResponse.error) : undefined,
  });

  const currentDisplayName =
    selectResponse.data?.display_name ||
    selectResponse.data?.full_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    "Crimson Member";
  const currentUsername = cleanUsername(
    selectResponse.data?.username || user.user_metadata?.username || currentDisplayName,
  );

  const updateResponse = await supabase
    .from("profiles")
    .update({
      display_name: currentDisplayName,
      full_name: currentDisplayName,
      username: currentUsername,
    })
    .eq("id", user.id)
    .select("id, username, display_name, full_name")
    .maybeSingle();
  steps.push({
    step: "profiles.update.current_user_identity_fields",
    ok: !updateResponse.error,
    data: updateResponse.data,
    error: updateResponse.error ? serializeError(updateResponse.error) : undefined,
  });

  const upsertResponse = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: currentDisplayName,
        full_name: currentDisplayName,
        username: currentUsername,
      },
      { onConflict: "id" },
    )
    .select("id, username, display_name, full_name")
    .maybeSingle();
  steps.push({
    step: "profiles.upsert.current_user_identity_fields",
    ok: !upsertResponse.error,
    data: upsertResponse.data,
    error: upsertResponse.error ? serializeError(upsertResponse.error) : undefined,
  });

  return NextResponse.json({
    ok: steps.every((step) => step.ok),
    user_id: user.id,
    profile_row_exists: !!selectResponse.data,
    id_matches_auth_uid: selectResponse.data ? selectResponse.data.id === user.id : null,
    steps,
  });
}

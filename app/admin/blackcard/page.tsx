"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type BlackcardMember = {
  id: string;
  user_id: string;
  status: string;
  plan_type: string | null;
  current_period_end: string | null;
};

export default function AdminBlackcardPage() {
  const [members, setMembers] = useState<BlackcardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembers() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("You must be logged in.");
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile || profile.role !== "admin") {
          setError("Admins only.");
          setLoading(false);
          return;
        }

        const { data, error: subError } = await supabase
          .from("subscriptions")
          .select("id, user_id, status, plan_type, current_period_end")
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false });

        if (subError) {
          setError("Unable to load Blackcard members.");
          setLoading(false);
          return;
        }

        setMembers(data || []);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setError("Something went wrong.");
        setLoading(false);
      }
    }

    loadMembers();
  }, []);

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-red-500/70">
              Control Room
            </p>
            <h1 className="mt-3 text-4xl font-light tracking-tight">
              Blackcard Members
            </h1>
          </div>

          <Link
            href="/admin"
            className="text-sm text-zinc-400 underline underline-offset-4 hover:text-white"
          >
            Back to admin
          </Link>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#090909] p-6">
          {loading && <p className="text-sm text-zinc-400">Loading members…</p>}
          {!loading && error && <p className="text-sm text-red-400">{error}</p>}

          {!loading && !error && members.length === 0 && (
            <p className="text-sm text-zinc-400">
              No active Blackcard members yet.
            </p>
          )}

          {!loading && !error && members.length > 0 && (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-[20px] border border-white/8 bg-white/[0.02] p-4"
                >
                  <p className="text-sm text-white">{member.user_id}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    {member.plan_type || "apex"} • {member.status}
                  </p>
                  {member.current_period_end && (
                    <p className="mt-2 text-xs text-zinc-400">
                      Renews {new Date(member.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
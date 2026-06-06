"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { restrictedAccountStatusLabel } from "@/lib/account-status";

export default function AccountRestrictedPage() {
  const { loading, status, signOut } = useAuth();
  const label = restrictedAccountStatusLabel(status);

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-[calc(env(safe-area-inset-top)+48px)] text-white">
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center text-center">
        <p className="text-[10px] uppercase tracking-[0.34em] text-[#e87a82]">
          Account Status
        </p>
        <h1 className="mt-4 font-serif text-4xl text-white">Access Restricted</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          {loading
            ? "Checking your account status…"
            : `This account is currently ${label}. Protected Crimson Society features are unavailable while this status is active.`}
        </p>
        <div className="mt-8 grid gap-3">
          <Link
            href="/support"
            className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-5 py-3 text-xs uppercase tracking-[0.22em] text-[#f1c3c7]"
          >
            Contact Support
          </Link>
          <Link
            href="/account-deletion"
            className="rounded-full border border-white/10 px-5 py-3 text-xs uppercase tracking-[0.22em] text-zinc-300"
          >
            Account Deletion
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full border border-white/10 px-5 py-3 text-xs uppercase tracking-[0.22em] text-zinc-500"
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { AppProfile, ProfileIdentityInput } from "@/lib/profile";

type Props = {
  profile: AppProfile;
  saving: boolean;
  message: string;
  onSubmit: (values: ProfileIdentityInput) => Promise<void>;
};

function formFromProfile(profile: AppProfile): ProfileIdentityInput {
  return {
    display_name: profile.display_name ?? profile.full_name ?? "",
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? [profile.city, profile.state].filter(Boolean).join(", "),
    quote: profile.quote ?? "",
    instagram_url: profile.instagram_url ?? "",
    tiktok_url: profile.tiktok_url ?? "",
    youtube_url: profile.youtube_url ?? "",
    website_url: profile.website_url ?? "",
  };
}

export default function EditProfileForm({ profile, saving, message, onSubmit }: Props) {
  const [form, setForm] = useState<ProfileIdentityInput>(() => formFromProfile(profile));

  useEffect(() => {
    const timer = window.setTimeout(() => setForm(formFromProfile(profile)), 0);
    return () => window.clearTimeout(timer);
  }, [profile]);

  function updateField(field: keyof ProfileIdentityInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form
      className="mt-8 space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(form);
      }}
    >
      <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">Profile</p>
            <h2 className="mt-2 font-serif text-3xl text-white">Craft your identity</h2>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#b4141e]/80 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-[#b4141e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Identity"}
          </button>
        </div>

        {message && <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-400">{message}</p>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["display_name", "Display Name", "Display name"],
            ["username", "Username", "username"],
            ["location", "Location", "City, State"],
            ["quote", "Quote", "A line that defines you"],
            ["instagram_url", "Instagram URL", "https://instagram.com/yourname"],
            ["tiktok_url", "TikTok URL", "https://tiktok.com/@yourname"],
            ["youtube_url", "YouTube URL", "https://youtube.com/@yourchannel"],
            ["website_url", "Website URL", "https://your-site.com"],
          ].map(([field, label, placeholder]) => (
            <div key={field}>
              <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                {label}
              </label>
              <input
                type={field.toString().endsWith("_url") ? "url" : "text"}
                value={form[field as keyof ProfileIdentityInput]}
                onChange={(e) => updateField(field as keyof ProfileIdentityInput, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
              />
            </div>
          ))}

          <div className="md:col-span-2">
            <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Tell the Society what drives you."
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
            />
          </div>
        </div>
      </section>
    </form>
  );
}

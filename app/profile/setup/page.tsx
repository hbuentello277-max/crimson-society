"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { cleanUsername } from "@/lib/profile";

const STYLES = ["Street", "Track", "Touring", "Stunt", "Cruiser"];

function normalizeUrl(value: string) {
  const trimmed = value.trim().replace(/^@+/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function ProfileSetup() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Chapter I — Rider
  const [name, setName] = useState("");
  const [usernameInput, setUsernameInput] = useState("");

  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");

  // Chapter II — Motorcycle
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");

  // Chapter III — Style
  const [styles, setStyles] = useState<string[]>([]);

  const toggleStyle = (s: string) => {
    setStyles((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const next = () => setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

  async function finishSetup() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
     if (!user) throw new Error("Sign in before completing setup.");

const displayName = name.trim();

if (!displayName) {
  throw new Error("Enter your name before continuing.");
}

const username = cleanUsername(usernameInput);

if (!username) {
  throw new Error("Enter a valid username before continuing.");
}

let profileExists = false;

for (let attempt = 0; attempt < 5; attempt++) {
  const { data: existingProfile, error: profileCheckError } =
    await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

        if (profileCheckError) {
          throw profileCheckError;
        }

        if (existingProfile?.id) {
          profileExists = true;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 350));
      }

     if (!profileExists) {
  throw new Error(
    "Your profile is still being prepared. Please wait a moment and try again."
  );
}

const { data: existingUsername, error: usernameCheckError } =
  await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

if (usernameCheckError) throw usernameCheckError;

if (existingUsername) {
  throw new Error("That username is already taken.");
}

const { error: profileError } = await supabase
  .from("profiles")
  .update({


          display_name: displayName,
          username,
          bio: bio.trim(),
          location: city.trim(),
          instagram_url: normalizeUrl(instagram),
          tiktok_url: normalizeUrl(tiktok),
          youtube_url: normalizeUrl(youtube),
          quote: styles.length ? styles.join(" / ") : null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      if (make.trim() || model.trim() || year.trim() || color.trim()) {
        const { error: motorcycleError } = await supabase
          .from("motorcycles")
          .upsert(
            {
              user_id: user.id,
              label: "Garage One",
              name: [make.trim(), model.trim()].filter(Boolean).join(" "),
              year: year.trim(),
              finish: color.trim(),
            },
            { onConflict: "user_id,label" }
          );

        if (motorcycleError) throw motorcycleError;
      }

      router.replace("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save setup."
      );
      setSaving(false);
    }
  }

  return (
    <>
      <Link
        href="/profile"
        className="fixed left-5 top-[calc(env(safe-area-inset-top)+1.25rem)] z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/70 text-3xl text-white backdrop-blur-md active:scale-95"
        aria-label="Go back"
      >
        ‹
      </Link>

      <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(180,20,30,0.30), transparent 65%)",
          }}
        />

        <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-6 pb-12 pt-14">
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#b4141e]/60">
              <span className="font-serif text-2xl italic text-[#e87a82]">
                CS
              </span>
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.5em] text-zinc-500">
              Forge Your Identity
            </p>
          </div>

          <header className="mt-10 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
              Chapter {step === 1 ? "I" : step === 2 ? "II" : "III"} of III
            </p>
            <h1 className="mt-3 font-serif text-5xl leading-none">
              {step === 1
                ? "The Rider"
                : step === 2
                  ? "The Machine"
                  : "The Style"}
            </h1>
            <div className="mx-auto mt-5 flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-white/20" />
              <span className="text-[#b4141e]">✦</span>
              <span className="h-px w-12 bg-white/20" />
            </div>
            <p className="mt-5 font-serif text-xl italic text-[#e87a82]">
              {step === 1
                ? "Tell the Order who you are."
                : step === 2
                  ? "Introduce your iron."
                  : "Choose how you ride."}
            </p>
          </header>

          <div className="mt-10 flex items-center justify-center gap-3">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 rounded-full transition-all ${
                  step === n
                    ? "w-10 bg-[#b4141e]"
                    : step > n
                      ? "w-6 bg-[#b4141e]/40"
                      : "w-6 bg-white/10"
                }`}
              />
            ))}
          </div>

          <section className="mt-10 space-y-5">
            {step === 1 && (
              <>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    Full Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-2 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 transition focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    Username
                  </label>
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Choose a username"
                    className="mt-2 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 transition focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    City
                  </label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Houston, TX"
                    className="mt-2 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 transition focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    Instagram
                  </label>
                  <div className="mt-2 flex items-center rounded-full border border-white/10 bg-white/[0.03] px-5 transition focus-within:border-[#b4141e]/60 focus-within:ring-2 focus-within:ring-[#b4141e]/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-5 w-5 text-zinc-500"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle
                        cx="17.5"
                        cy="6.5"
                        r="0.8"
                        fill="currentColor"
                      />
                    </svg>
                    <input
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@handle"
                      className="w-full bg-transparent px-3 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    TikTok
                  </label>
                  <div className="mt-2 flex items-center rounded-full border border-white/10 bg-white/[0.03] px-5 transition focus-within:border-[#b4141e]/60 focus-within:ring-2 focus-within:ring-[#b4141e]/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5 text-zinc-500"
                    >
                      <path d="M16 3v3.2a4.8 4.8 0 0 0 4.8 4.8V14a8 8 0 0 1-4.8-1.6V17a5 5 0 1 1-5-5v3.2a1.8 1.8 0 1 0 1.8 1.8V3H16z" />
                    </svg>
                    <input
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      placeholder="@handle"
                      className="w-full bg-transparent px-3 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    YouTube
                  </label>
                  <div className="mt-2 flex items-center rounded-full border border-white/10 bg-white/[0.03] px-5 transition focus-within:border-[#b4141e]/60 focus-within:ring-2 focus-within:ring-[#b4141e]/20">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-5 w-5 text-zinc-500"
                    >
                      <rect x="2.5" y="6" width="19" height="12" rx="3" />
                      <path
                        d="M10.5 9.5v5l4.5-2.5-4.5-2.5z"
                        fill="currentColor"
                        stroke="none"
                      />
                    </svg>
                    <input
                      value={youtube}
                      onChange={(e) => setYoutube(e.target.value)}
                      placeholder="@channel"
                      className="w-full bg-transparent px-3 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    Short Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="A line that captures you."
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 transition focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    Make
                  </label>
                  <input
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="Ducati"
                    className="mt-2 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 transition focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                    Model
                  </label>
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Panigale V4"
                    className="mt-2 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 transition focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Year
                    </label>
                    <input
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="2023"
                      className="mt-2 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 transition focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Color
                    </label>
                    <input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Crimson"
                      className="mt-2 w-full rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-base text-zinc-200 placeholder:text-zinc-600 transition focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <div>
                <p className="text-center text-sm text-zinc-400">
                  Pick all that apply.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {STYLES.map((s) => {
                    const active = styles.includes(s);

                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleStyle(s)}
                        className={`rounded-2xl border px-5 py-5 text-center transition ${
                          active
                            ? "border-[#b4141e] bg-[#b4141e]/15"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <p
                          className={`font-serif text-2xl ${
                            active ? "text-[#e87a82]" : "text-zinc-200"
                          }`}
                        >
                          {s}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <div className="mt-10 flex gap-3">
            {step > 1 && (
              <button
                onClick={back}
                className="rounded-full border border-white/10 px-6 py-3 text-xs uppercase tracking-[0.3em] text-zinc-300 transition hover:border-white/30"
              >
                ← Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={next}
                className="ml-auto rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-7 py-3 text-xs uppercase tracking-[0.3em] text-[#e87a82] transition hover:bg-[#b4141e]/30"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={finishSetup}
                disabled={saving}
                className="ml-auto rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-7 py-3 text-xs uppercase tracking-[0.3em] text-[#e87a82] transition hover:bg-[#b4141e]/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Enter the Society"}
              </button>
            )}
          </div>

          {message && (
            <p className="mt-5 text-center text-sm text-red-300">{message}</p>
          )}

          <footer className="mt-auto pt-16 text-center">
            <div className="mx-auto h-px w-12 bg-white/10" />
            <p className="mt-5 text-[9px] uppercase tracking-[0.5em] text-zinc-600">
              © Crimson Society · MMXXVI
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
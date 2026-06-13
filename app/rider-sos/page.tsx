"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PrivacyToggle from "@/components/profile/PrivacyToggle";
import { useAuth } from "@/components/AuthProvider";
import { BOTTOM_NAV_CLEARANCE, CS_CTA_PRIMARY_LG } from "@/lib/crimson-accent";
import { RiderSosActivationPanel } from "@/components/rider-sos/RiderSosActivationPanel";
import { formatRiderSosBikeInfo } from "@/lib/rider-sos/bike-info";
import type { RiderSosProfileInput, RiderSosProfileRow } from "@/lib/rider-sos/types";
import { supabase } from "@/lib/supabase";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60";

const LABEL_CLASS = "mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500";

function emptyForm(): RiderSosProfileInput {
  return {
    emergency_contact_name: "",
    emergency_contact_phone: "",
    relationship: "",
    blood_type: "",
    allergies: "",
    medical_notes: "",
    bike_info: "",
    location_sharing_enabled: false,
  };
}

function rowToForm(row: RiderSosProfileRow): RiderSosProfileInput {
  return {
    emergency_contact_name: row.emergency_contact_name ?? "",
    emergency_contact_phone: row.emergency_contact_phone ?? "",
    relationship: row.relationship ?? "",
    blood_type: row.blood_type ?? "",
    allergies: row.allergies ?? "",
    medical_notes: row.medical_notes ?? "",
    bike_info: row.bike_info ?? "",
    location_sharing_enabled: row.location_sharing_enabled ?? false,
  };
}

export default function RiderSosPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id ?? null;

  const [form, setForm] = useState<RiderSosProfileInput>(emptyForm);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const [sosResult, profileResult, garageResult] = await Promise.all([
          supabase.from("rider_sos_profiles").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("profiles").select("bike_type").eq("id", userId).maybeSingle(),
          supabase
            .from("motorcycles")
            .select("year, name, finish, label")
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .limit(1),
        ]);

        if (cancelled) return;

        if (sosResult.error) {
          throw new Error(sosResult.error.message);
        }

        if (profileResult.error) {
          throw new Error(profileResult.error.message);
        }

        if (garageResult.error) {
          throw new Error(garageResult.error.message);
        }

        const bikeInfo = formatRiderSosBikeInfo(
          { bike_type: profileResult.data?.bike_type ?? null },
          garageResult.data ?? [],
        );

        if (sosResult.data) {
          const next = rowToForm(sosResult.data as RiderSosProfileRow);
          setHasSavedProfile(true);
          setForm({
            ...next,
            bike_info: next.bike_info || bikeInfo,
          });
        } else {
          setHasSavedProfile(false);
          setForm({
            ...emptyForm(),
            bike_info: bikeInfo,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load SOS profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, router, userId]);

  function updateField<K extends keyof RiderSosProfileInput>(field: K, value: RiderSosProfileInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!userId || saving) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      user_id: userId,
      emergency_contact_name: form.emergency_contact_name.trim(),
      emergency_contact_phone: form.emergency_contact_phone.trim(),
      relationship: form.relationship.trim(),
      blood_type: form.blood_type.trim() || null,
      allergies: form.allergies.trim() || null,
      medical_notes: form.medical_notes.trim() || null,
      bike_info: form.bike_info.trim() || null,
      location_sharing_enabled: form.location_sharing_enabled,
    };

    const { error: saveError } = await supabase
      .from("rider_sos_profiles")
      .upsert(payload, { onConflict: "user_id" });

    setSaving(false);

    if (saveError) {
      setError(saveError.message || "Could not save SOS profile.");
      return;
    }

    setHasSavedProfile(true);
    setMessage("SOS profile saved.");
  }

  if (authLoading || loading) {
    return (
      <main className={`relative min-h-screen bg-[#050505] px-4 pt-[calc(env(safe-area-inset-top)+12px)] text-white ${BOTTOM_NAV_CLEARANCE}`}>
        <div className="mx-auto max-w-2xl animate-pulse space-y-4 py-8">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="h-10 w-56 rounded-full bg-white/10" />
          <div className="h-40 rounded-[28px] border border-white/10 bg-white/[0.03]" />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(180,20,30,0.25),transparent_65%)]" />

      <div className={`relative mx-auto max-w-2xl px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6 ${BOTTOM_NAV_CLEARANCE}`}>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition hover:text-[#e87a82]"
        >
          ‹ Back to Profile
        </Link>

        <header className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.34em] text-[#e87a82]">Rider SOS</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-white sm:text-4xl">Rider SOS</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Activate SOS in an emergency and keep your private profile details up to date. For
            emergency rider alerts, turn Location Sharing ON. Without GPS, admins can still see
            your SOS, but nearby riders may not be alerted.
          </p>
        </header>

        {userId ? (
          <div className="mt-6">
            <RiderSosActivationPanel
              userId={userId}
              profileForm={form}
              hasSavedProfile={hasSavedProfile}
            />
          </div>
        ) : null}

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">Emergency Contact</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={LABEL_CLASS} htmlFor="sos-contact-name">
                  Emergency Contact Name
                </label>
                <input
                  id="sos-contact-name"
                  type="text"
                  value={form.emergency_contact_name}
                  onChange={(event) => updateField("emergency_contact_name", event.target.value)}
                  placeholder="Full name"
                  className={INPUT_CLASS}
                  autoComplete="name"
                />
              </div>

              <div>
                <label className={LABEL_CLASS} htmlFor="sos-contact-phone">
                  Emergency Contact Phone
                </label>
                <input
                  id="sos-contact-phone"
                  type="tel"
                  value={form.emergency_contact_phone}
                  onChange={(event) => updateField("emergency_contact_phone", event.target.value)}
                  placeholder="(555) 555-5555"
                  className={INPUT_CLASS}
                  autoComplete="tel"
                />
              </div>

              <div>
                <label className={LABEL_CLASS} htmlFor="sos-relationship">
                  Relationship
                </label>
                <input
                  id="sos-relationship"
                  type="text"
                  value={form.relationship}
                  onChange={(event) => updateField("relationship", event.target.value)}
                  placeholder="Spouse, parent, friend"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">Medical Info (Optional)</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={LABEL_CLASS} htmlFor="sos-blood-type">
                  Blood Type
                </label>
                <input
                  id="sos-blood-type"
                  type="text"
                  value={form.blood_type}
                  onChange={(event) => updateField("blood_type", event.target.value)}
                  placeholder="O+"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className={LABEL_CLASS} htmlFor="sos-allergies">
                  Allergies
                </label>
                <input
                  id="sos-allergies"
                  type="text"
                  value={form.allergies}
                  onChange={(event) => updateField("allergies", event.target.value)}
                  placeholder="Penicillin, latex"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className={LABEL_CLASS} htmlFor="sos-medical-notes">
                  Medical Notes
                </label>
                <textarea
                  id="sos-medical-notes"
                  value={form.medical_notes}
                  onChange={(event) => updateField("medical_notes", event.target.value)}
                  placeholder="Conditions, medications, or notes for responders"
                  rows={4}
                  className={`${INPUT_CLASS} rounded-2xl`}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
            <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">Bike Info</p>
            <p className="mt-2 text-xs leading-6 text-zinc-500">
              Auto-filled from your profile and garage. Update your garage in Edit Profile to change
              this.
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">
              {form.bike_info.trim() || "No bike info on your profile yet."}
            </div>
          </section>

          <PrivacyToggle
            label="Location Sharing"
            description="For emergency rider alerts, turn Location Sharing ON. Without GPS, admins can still see your SOS, but nearby riders may not be alerted."
            enabled={form.location_sharing_enabled}
            onChange={(enabled) => updateField("location_sharing_enabled", enabled)}
          />

          {error ? (
            <p className="text-xs uppercase tracking-[0.2em] text-red-400">{error}</p>
          ) : null}
          {message ? (
            <p className="text-xs uppercase tracking-[0.2em] text-[#e87a82]">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className={`w-full ${CS_CTA_PRIMARY_LG} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {saving ? "Saving..." : "Save SOS Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { CS_CTA_PRIMARY_LG } from "@/lib/crimson-accent";
import { requestCurrentPosition } from "@/lib/rider-sos/geolocation";
import {
  SOS_TYPES,
  type RiderSosEventRow,
  type SosType,
  buildMapsUrl,
  formatMedicalSnapshot,
  hasCompleteEmergencyProfile,
  sosTypeLabel,
} from "@/lib/rider-sos/sos-types";
import type { RiderSosProfileInput } from "@/lib/rider-sos/types";
import { supabase } from "@/lib/supabase";

type ActivationStep = "idle" | "select_type" | "confirm_send" | "active";

type Props = {
  userId: string;
  profileForm: RiderSosProfileInput;
  hasSavedProfile: boolean;
};

export function RiderSosActivationPanel({ userId, profileForm, hasSavedProfile }: Props) {
  const [step, setStep] = useState<ActivationStep>("idle");
  const [selectedType, setSelectedType] = useState<SosType | null>(null);
  const [activeEvent, setActiveEvent] = useState<RiderSosEventRow | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
  }>({ latitude: null, longitude: null, accuracy: null });
  const [loadingActive, setLoadingActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActiveEvent = useCallback(async () => {
    setLoadingActive(true);
    const { data, error: loadError } = await supabase
      .from("rider_sos_events")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (loadError) {
      setError(loadError.message);
      setLoadingActive(false);
      return;
    }

    if (data) {
      setActiveEvent(data as RiderSosEventRow);
      setStep("active");
    } else {
      setActiveEvent(null);
      setStep("idle");
    }

    setLoadingActive(false);
  }, [userId]);

  useEffect(() => {
    void loadActiveEvent();
  }, [loadActiveEvent]);

  async function prepareLocation() {
    setLocationNote(null);
    setPendingCoords({ latitude: null, longitude: null, accuracy: null });

    if (!profileForm.location_sharing_enabled) {
      setLocationNote(
        "Location sharing is off in your SOS profile. You can send SOS without GPS or enable sharing below.",
      );
      return;
    }

    const result = await requestCurrentPosition();
    if (result.ok) {
      setPendingCoords({
        latitude: result.latitude,
        longitude: result.longitude,
        accuracy: result.accuracy,
      });
      setLocationNote("Current location captured.");
      return;
    }

    setLocationNote(result.message);
  }

  async function handleSelectType(type: SosType) {
    setSelectedType(type);
    setStep("confirm_send");
    setError(null);
    await prepareLocation();
  }

  async function handleSendSos() {
    if (!selectedType || submitting) return;

    setSubmitting(true);
    setError(null);

    let latitude = pendingCoords.latitude;
    let longitude = pendingCoords.longitude;
    let accuracy = pendingCoords.accuracy;

    if (profileForm.location_sharing_enabled && latitude == null) {
      const result = await requestCurrentPosition();
      if (result.ok) {
        latitude = result.latitude;
        longitude = result.longitude;
        accuracy = result.accuracy;
      } else {
        setLocationNote(result.message);
      }
    }

    const medicalNotes = formatMedicalSnapshot(profileForm);

    const { data, error: insertError } = await supabase
      .from("rider_sos_events")
      .insert({
        user_id: userId,
        sos_type: selectedType,
        status: "active",
        latitude,
        longitude,
        location_accuracy: accuracy,
        bike_info: profileForm.bike_info.trim() || null,
        emergency_contact_name: profileForm.emergency_contact_name.trim() || null,
        emergency_contact_phone: profileForm.emergency_contact_phone.trim() || null,
        medical_notes: medicalNotes,
      })
      .select("*")
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message || "Could not send SOS.");
      return;
    }

    setActiveEvent(data as RiderSosEventRow);
    setStep("active");
  }

  async function closeEvent(status: "resolved" | "cancelled") {
    if (!activeEvent || resolving) return;

    setResolving(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from("rider_sos_events")
      .update({
        status,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", activeEvent.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    setResolving(false);

    if (updateError) {
      setError(updateError.message || "Could not update SOS.");
      return;
    }

    setActiveEvent(null);
    setSelectedType(null);
    setStep("idle");
    void data;
  }

  const missingProfile = !hasCompleteEmergencyProfile(profileForm);

  if (loadingActive) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
        <div className="mt-4 h-10 animate-pulse rounded-2xl bg-white/10" />
      </section>
    );
  }

  if (step === "active" && activeEvent) {
    const hasCoords =
      activeEvent.latitude != null &&
      activeEvent.longitude != null &&
      Number.isFinite(Number(activeEvent.latitude)) &&
      Number.isFinite(Number(activeEvent.longitude));

    return (
      <section className="rounded-[28px] border border-[#b4141e]/40 bg-[#b4141e]/10 p-5 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">Active SOS</p>
        <h2 className="mt-2 font-serif text-2xl text-white">{sosTypeLabel(activeEvent.sos_type)}</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Your SOS is active. Crimson Society admins can see this alert. Push notifications and
          nearby rider alerts are not enabled yet.
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
          Sent {new Date(activeEvent.created_at).toLocaleString()}
        </p>

        {hasCoords ? (
          <a
            href={buildMapsUrl(Number(activeEvent.latitude), Number(activeEvent.longitude))}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex text-xs uppercase tracking-[0.16em] text-[#e87a82] hover:text-[#f1c3c7]"
          >
            View shared coordinates
          </a>
        ) : (
          <p className="mt-4 text-xs text-zinc-500">No GPS coordinates were attached.</p>
        )}

        {error ? <p className="mt-4 text-xs uppercase tracking-[0.2em] text-red-400">{error}</p> : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void closeEvent("resolved")}
            disabled={resolving}
            className={`${CS_CTA_PRIMARY_LG} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {resolving ? "Saving..." : "Mark Resolved"}
          </button>
          <button
            type="button"
            onClick={() => void closeEvent("cancelled")}
            disabled={resolving}
            className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm uppercase tracking-[0.3em] text-zinc-300 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel SOS
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[#b4141e]/35 bg-[#b4141e]/8 p-5 sm:p-6">
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">Activate SOS</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">
        Send an emergency alert to Crimson Society admins with your saved profile details and
        optional GPS location.
      </p>

      {missingProfile ? (
        <p className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-6 text-amber-100/90">
          Your emergency contact is incomplete. You can still activate SOS, but admins may have
          limited contact information.
        </p>
      ) : null}

      {step === "idle" ? (
        <button
          type="button"
          onClick={() => {
            setStep("select_type");
            setError(null);
          }}
          className={`mt-5 w-full ${CS_CTA_PRIMARY_LG}`}
        >
          Activate SOS
        </button>
      ) : null}

      {step === "select_type" ? (
        <div className="mt-5 space-y-2">
          {SOS_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => void handleSelectType(type.value)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left text-sm text-white transition hover:border-[#b4141e]/50"
            >
              <span>{type.label}</span>
              <span className="text-zinc-500">›</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setStep("idle")}
            className="w-full pt-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500 hover:text-zinc-300"
          >
            Back
          </button>
        </div>
      ) : null}

      {step === "confirm_send" && selectedType ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">SOS Type</p>
            <p className="mt-1 text-sm text-white">{sosTypeLabel(selectedType)}</p>
          </div>

          {locationNote ? (
            <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-zinc-400">
              {locationNote}
            </p>
          ) : null}

          {pendingCoords.latitude != null && pendingCoords.longitude != null ? (
            <p className="text-xs text-zinc-500">
              GPS: {pendingCoords.latitude.toFixed(5)}, {pendingCoords.longitude.toFixed(5)}
              {pendingCoords.accuracy != null
                ? ` (±${Math.round(pendingCoords.accuracy)}m)`
                : ""}
            </p>
          ) : null}

          {error ? <p className="text-xs uppercase tracking-[0.2em] text-red-400">{error}</p> : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleSendSos()}
              disabled={submitting}
              className={`${CS_CTA_PRIMARY_LG} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {submitting ? "Sending..." : "Send SOS"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("select_type");
                setSelectedType(null);
              }}
              disabled={submitting}
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3.5 text-sm uppercase tracking-[0.3em] text-zinc-300 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

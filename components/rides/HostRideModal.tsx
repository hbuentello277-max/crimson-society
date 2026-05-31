"use client";

import { useEffect, useRef, useState } from "react";
import type { RideType, RidePrivacy } from "@/app/rides/page";
import { supabase } from "@/lib/supabase";

export interface HostRideForm {
  name: string;
  date: string;
  time: string;
  meetPoint: string;
  meetPointLat: number | null;
  meetPointLng: number | null;
  destination: string;
  destinationLat: number | null;
  destinationLng: number | null;
  distance: string;
  duration: string;
  type: RideType;
  privacy: RidePrivacy;
  description: string;
  cover?: string;
}

type LocationSuggestion = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

const RIDE_TYPES: RideType[] = ["Canyon Run", "Night Run", "Track Day", "Touring", "Group Ride"];

const EMPTY_FORM: HostRideForm = {
  name: "",
  date: "",
  time: "",
  meetPoint: "",
  meetPointLat: null,
  meetPointLng: null,
  destination: "",
  destinationLat: null,
  destinationLng: null,
  distance: "",
  duration: "",
  type: "Group Ride",
  privacy: "Open",
  description: "",
  cover: "",
};

interface Props {
  initialForm?: HostRideForm;
  mode?: "create" | "edit";
  onClose: () => void;
  onCreate: (form: HostRideForm) => void;
}

export function HostRideModal({
  initialForm,
  mode = "create",
  onClose,
  onCreate,
}: Props) {
  const [form, setForm] = useState<HostRideForm>(initialForm ?? EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof HostRideForm, string>>>({});
  const [uploadingCover, setUploadingCover] = useState(false);

  function set<K extends keyof HostRideForm>(key: K, value: HostRideForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.date) next.date = "Required";
    if (!form.time) next.time = "Required";
    if (!form.meetPoint.trim()) next.meetPoint = "Required";
    if (!form.destination.trim()) next.destination = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onCreate(form);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === "edit" ? "Edit Meet" : "Host a Meet"}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-[#0d080a] shadow-[0_-24px_80px_rgba(0,0,0,0.9)] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
             <p className="text-[9px] uppercase tracking-[0.2em] text-[#d85f6c]">
               {mode === "edit" ? "Edit Meet" : "Host a Meet"}
            </p>

            <h2 className="mt-0.5 font-serif text-2xl text-[#f4f0ea]">
             {mode === "edit" ? "Update Meet" : "Create Route"}
           </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-zinc-300 transition hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="max-h-[65vh] overflow-y-auto px-5 py-5 sm:max-h-[55vh]">
            <div className="grid gap-4">
              <Field label="Meet Name" error={errors.name}>
                <input
                  type="text"
                  placeholder="e.g. Sunday Canyon Run"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputCls(!!errors.name)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date" error={errors.date}>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                    className={inputCls(!!errors.date)}
                  />
                </Field>

                <Field label="Time" error={errors.time}>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => set("time", e.target.value)}
                    className={inputCls(!!errors.time)}
                  />
                </Field>
              </div>

              <LocationAutocomplete
                label="Meetup / Start Location"
                placeholder="Search a real place or address"
                value={form.meetPoint}
                error={errors.meetPoint}
                onManualChange={(value) => {
                  setForm((prev) => ({
                    ...prev,
                    meetPoint: value,
                    meetPointLat: null,
                    meetPointLng: null,
                  }));
                  if (errors.meetPoint) {
                    setErrors((prev) => ({ ...prev, meetPoint: undefined }));
                  }
                }}
                onSelect={(suggestion) => {
                  setForm((prev) => ({
                    ...prev,
                    meetPoint: suggestion.display_name,
                    meetPointLat: Number(suggestion.lat),
                    meetPointLng: Number(suggestion.lon),
                  }));
                  setErrors((prev) => ({ ...prev, meetPoint: undefined }));
                }}
              />

              <LocationAutocomplete
                label="Destination / End Location"
                placeholder="Search destination"
                value={form.destination}
                error={errors.destination}
                onManualChange={(value) => {
                  setForm((prev) => ({
                    ...prev,
                    destination: value,
                    destinationLat: null,
                    destinationLng: null,
                  }));
                  if (errors.destination) {
                    setErrors((prev) => ({ ...prev, destination: undefined }));
                  }
                }}
                onSelect={(suggestion) => {
                  setForm((prev) => ({
                    ...prev,
                    destination: suggestion.display_name,
                    destinationLat: Number(suggestion.lat),
                    destinationLng: Number(suggestion.lon),
                  }));
                  setErrors((prev) => ({ ...prev, destination: undefined }));
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Distance (optional)">
                  <input
                    type="text"
                    placeholder="e.g. 180 mi"
                    value={form.distance}
                    onChange={(e) => set("distance", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>

                <Field label="Duration (optional)">
                  <input
                    type="text"
                    placeholder="e.g. 5h"
                    value={form.duration}
                    onChange={(e) => set("duration", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Meet Type">
                  <select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value as RideType)}
                    className={inputCls(false)}
                  >
                    {RIDE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Visibility">
                  <select
                    value={form.privacy}
                    onChange={(e) => set("privacy", e.target.value as RidePrivacy)}
                    className={inputCls(false)}
                  >
                    <option value="Open">Open</option>
                    <option value="Invite">Invite Only</option>
                  </select>
                </Field>
              </div>

              <Field label="Meet Cover Image">
  <input
    type="file"
    accept="image/*"
    disabled={uploadingCover}
    className={inputCls(false)}
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        setUploadingCover(true);

        if (!file.type.startsWith("image/")) {
          throw new Error("Please select an image file.");
        }

        if (file.size > 8 * 1024 * 1024) {
          throw new Error("Image must be under 8MB.");
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          throw new Error("You must be signed in to upload a cover.");
        }

        const safeName = file.name
          .toLowerCase()
          .replace(/[^a-z0-9.]+/g, "-")
          .replace(/^-+|-+$/g, "");

        const filePath = `${user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("ride-covers")
          .upload(filePath, file, {
            upsert: false,
            contentType: file.type || "image/jpeg",
            cacheControl: "3600",
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("ride-covers")
          .getPublicUrl(filePath);

        if (!publicUrlData.publicUrl) {
          throw new Error("Could not generate cover URL.");
        }

        set("cover", publicUrlData.publicUrl);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Could not upload cover.");
      } finally {
        setUploadingCover(false);
        e.target.value = "";
      }
    }}
  />

  {uploadingCover && (
    <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
      Uploading cover...
    </p>
  )}

  {form.cover && (
    <img
      src={form.cover}
      alt="Meet cover preview"
      className="mt-3 h-40 w-full rounded-lg object-cover"
    />
  )}
</Field>

<Field label="Description (optional)">
  <textarea
    rows={3}
    placeholder="Tell riders what to expect…"
    value={form.description}
    onChange={(e) => set("description", e.target.value)}
    className={`${inputCls(false)} resize-none`}
  />
</Field>
            </div>
          </div>

          <div className="border-t border-white/8 px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/12 bg-white/[0.03] py-3 text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex-1 rounded-lg border border-[#7f111b]/70 bg-[#7f111b]/28 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f4dadd] transition hover:bg-[#7f111b]/40"
              >
                {mode === "edit" ? "Save Changes" : "Create Meet"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function LocationAutocomplete({
  label,
  placeholder,
  value,
  error,
  onManualChange,
  onSelect,
}: {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  onManualChange: (value: string) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    const query = value.trim();

    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);

        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "5");
        url.searchParams.set("countrycodes", "us");

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) throw new Error("Location search failed");

        const data = (await response.json()) as LocationSuggestion[];
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  return (
    <div className="relative">
      <Field label={label} error={error}>
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onManualChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            className={inputCls(!!error)}
          />

          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Searching
            </span>
          )}
        </div>
      </Field>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#120b0d] shadow-[0_18px_50px_rgba(0,0,0,0.75)]">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                skipNextSearch.current = true;
                onSelect(suggestion);
                setSuggestions([]);
                setOpen(false);
              }}
              className="block w-full border-b border-white/8 px-3 py-3 text-left text-sm text-zinc-200 transition last:border-b-0 hover:bg-white/[0.05]"
            >
              <span className="line-clamp-2">{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition",
    "focus:ring-1",
    hasError
      ? "border-[#7f111b]/70 focus:border-[#d85f6c] focus:ring-[#d85f6c]/30"
      : "border-white/10 focus:border-white/25 focus:ring-white/10",
  ].join(" ");
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</label>
      {children}
      {error && <p className="text-[10px] text-[#d85f6c]">{error}</p>}
    </div>
  );
}
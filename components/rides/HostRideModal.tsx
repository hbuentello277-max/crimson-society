"use client";

import { useState } from "react";
import type { RideType, RidePrivacy } from "@/app/rides/page";

interface HostRideForm {
  name: string;
  date: string;
  time: string;
  meetPoint: string;
  destination: string;
  distance: string;
  duration: string;
  type: RideType;
  privacy: RidePrivacy;
  description: string;
}

const RIDE_TYPES: RideType[] = ["Canyon Run", "Night Run", "Track Day", "Touring", "Group Ride"];

const EMPTY_FORM: HostRideForm = {
  name: "",
  date: "",
  time: "",
  meetPoint: "",
  destination: "",
  distance: "",
  duration: "",
  type: "Group Ride",
  privacy: "Open",
  description: "",
};

interface Props {
  onClose: () => void;
  onCreate: (form: HostRideForm) => void;
}

export function HostRideModal({ onClose, onCreate }: Props) {
  const [form, setForm] = useState<HostRideForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof HostRideForm, string>>>({});

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
      aria-label="Host a Ride"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      {/* Backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-[#0d080a] shadow-[0_-24px_80px_rgba(0,0,0,0.9)] sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#d85f6c]">Host a Ride</p>
            <h2 className="mt-0.5 font-serif text-2xl text-[#f4f0ea]">Create Route</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="max-h-[65vh] overflow-y-auto px-5 py-5 sm:max-h-[55vh]">
            <div className="grid gap-4">
              {/* Ride Name */}
              <Field label="Ride Name" error={errors.name}>
                <input
                  type="text"
                  placeholder="e.g. Sunday Canyon Run"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputCls(!!errors.name)}
                />
              </Field>

              {/* Date + Time */}
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

              {/* Meetup + Destination */}
              <Field label="Meetup / Start Location" error={errors.meetPoint}>
                <input
                  type="text"
                  placeholder="e.g. Buc-ee's, Katy TX"
                  value={form.meetPoint}
                  onChange={(e) => set("meetPoint", e.target.value)}
                  className={inputCls(!!errors.meetPoint)}
                />
              </Field>
              <Field label="Destination / End Location" error={errors.destination}>
                <input
                  type="text"
                  placeholder="e.g. Pedernales Falls State Park"
                  value={form.destination}
                  onChange={(e) => set("destination", e.target.value)}
                  className={inputCls(!!errors.destination)}
                />
              </Field>

              {/* Distance + Duration */}
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

              {/* Type + Privacy */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ride Type">
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

              {/* Description */}
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

          {/* Footer */}
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
                Create Ride
              </button>
            </div>
          </div>
        </form>
      </div>
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

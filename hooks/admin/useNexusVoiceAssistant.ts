"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendNexusVoiceHistory, readNexusVoiceHistory } from "@/lib/admin/nexus-voice/history";
import type { NexusVoiceHistoryEntry } from "@/lib/admin/nexus-voice/history";
import { createNexusVoiceTtsAdapter } from "@/lib/admin/nexus-voice/client-tts";
import type { NexusVoiceActionResult, NexusVoiceStatus } from "@/lib/admin/nexus-voice/types";
import {
  isVoiceRecordingSupported,
  startVoiceRecorderSession,
  voiceBlobToFile,
} from "@/lib/messages/voice-recorder";

const MAX_RECORD_SECONDS = 30;

type NexusVoiceApiResponse = {
  transcript?: string;
  response?: string;
  actionResult?: NexusVoiceActionResult;
  tool?: string | null;
  configured?: boolean;
  error?: string;
};

export function useNexusVoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<NexusVoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<NexusVoiceHistoryEntry[]>(() => readNexusVoiceHistory());
  const recorderRef = useRef<Awaited<ReturnType<typeof startVoiceRecorderSession>> | null>(null);
  const ttsRef = useRef<ReturnType<typeof createNexusVoiceTtsAdapter> | null>(null);

  const recordingSupported = isVoiceRecordingSupported();
  const ttsSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    ttsRef.current = createNexusVoiceTtsAdapter(
      () => setStatus("speaking"),
      () => setStatus("idle"),
    );
  }, []);

  const closePanel = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    ttsRef.current?.stop();
    setOpen(false);
    setStatus("idle");
    setError(null);
  }, []);

  const submitTranscript = useCallback(async (nextTranscript: string) => {
    const trimmed = nextTranscript.trim();
    if (!trimmed) {
      setError("No speech detected. Try again.");
      setStatus("error");
      return;
    }

    setTranscript(trimmed);
    setStatus("thinking");
    setError(null);

    try {
      const apiResponse = await fetch("/api/admin/nexus/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: trimmed }),
      });

      const payload = (await apiResponse.json()) as NexusVoiceApiResponse;

      if (!apiResponse.ok) {
        throw new Error(payload.error || "NEXUS voice request failed.");
      }

      const nextResponse = payload.response?.trim() || "NEXUS did not return a response.";
      setResponse(nextResponse);
      setHistory(
        appendNexusVoiceHistory({
          transcript: payload.transcript || trimmed,
          response: nextResponse,
          tool: payload.tool ?? null,
        }),
      );

      if (ttsSupported && nextResponse) {
        ttsRef.current?.speak(nextResponse);
      } else {
        setStatus("idle");
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "NEXUS voice request failed.";
      setError(message);
      setStatus("error");
    }
  }, [ttsSupported]);

  const submitAudio = useCallback(async (file: File) => {
    setStatus("transcribing");
    setError(null);

    const formData = new FormData();
    formData.append("audio", file);

    try {
      const apiResponse = await fetch("/api/admin/nexus/voice", {
        method: "POST",
        body: formData,
      });

      const payload = (await apiResponse.json()) as NexusVoiceApiResponse;

      if (!apiResponse.ok) {
        throw new Error(payload.error || "NEXUS voice request failed.");
      }

      const nextTranscript = payload.transcript?.trim() || "";
      const nextResponse = payload.response?.trim() || "NEXUS did not return a response.";

      setTranscript(nextTranscript);
      setResponse(nextResponse);
      setHistory(
        appendNexusVoiceHistory({
          transcript: nextTranscript,
          response: nextResponse,
          tool: payload.tool ?? null,
        }),
      );

      if (ttsSupported && nextResponse) {
        ttsRef.current?.speak(nextResponse);
      } else {
        setStatus("idle");
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "NEXUS voice request failed.";
      setError(message);
      setStatus("error");
    }
  }, [ttsSupported]);

  const stopListening = useCallback(async () => {
    const session = recorderRef.current;
    recorderRef.current = null;

    if (!session) {
      setStatus("idle");
      return;
    }

    const recording = await session.stop();
    if (!recording || recording.durationSeconds < 0.5) {
      setError("Recording was too short. Hold the mic and speak clearly.");
      setStatus("error");
      return;
    }

    const file = voiceBlobToFile(recording.blob, recording.mimeType);
    await submitAudio(file);
  }, [submitAudio]);

  const toggleListening = useCallback(async () => {
    if (status === "listening") {
      await stopListening();
      return;
    }

    if (status === "transcribing" || status === "thinking" || status === "speaking") {
      return;
    }

    if (!recordingSupported) {
      setOpen(true);
      setError("Voice recording is not supported on this device.");
      setStatus("error");
      return;
    }

    setOpen(true);
    setError(null);
    setStatus("listening");

    try {
      recorderRef.current?.cancel();
      recorderRef.current = await startVoiceRecorderSession(MAX_RECORD_SECONDS);
    } catch (recordError) {
      const message =
        recordError instanceof Error ? recordError.message : "Could not start recording.";
      setError(message);
      setStatus("error");
      recorderRef.current = null;
    }
  }, [recordingSupported, status, stopListening]);

  const openPanel = useCallback(() => {
    setOpen(true);
  }, []);

  const statusLabel =
    status === "listening"
      ? "Listening..."
      : status === "transcribing"
        ? "Transcribing..."
        : status === "thinking"
          ? "Thinking..."
          : status === "speaking"
            ? "Speaking..."
            : null;

  return {
    open,
    openPanel,
    closePanel,
    status,
    statusLabel,
    transcript,
    response,
    error,
    history,
    recordingSupported,
    ttsSupported,
    toggleListening,
    submitTranscript,
    isListening: status === "listening",
    isBusy: status === "transcribing" || status === "thinking" || status === "speaking",
  };
}

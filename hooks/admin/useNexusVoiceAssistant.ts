"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { appendNexusVoiceHistory, readNexusVoiceHistory } from "@/lib/admin/nexus-voice/history";
import type { NexusVoiceHistoryEntry } from "@/lib/admin/nexus-voice/history";
import { createNexusVoiceTtsAdapter } from "@/lib/admin/nexus-voice/client-tts";
import type {
  NexusVoiceActionResult,
  NexusVoicePendingConfirmation,
  NexusVoiceStatus,
} from "@/lib/admin/nexus-voice/types";
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
  pendingConfirmation?: NexusVoicePendingConfirmation;
  requiresConfirmation?: boolean;
};

function speakResponse(
  ttsSupported: boolean,
  ttsRef: RefObject<ReturnType<typeof createNexusVoiceTtsAdapter> | null>,
  text: string,
  setStatus: (status: NexusVoiceStatus) => void,
) {
  if (ttsSupported && text) {
    ttsRef.current?.speak(text);
  } else {
    setStatus("idle");
  }
}

export function useNexusVoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<NexusVoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<NexusVoicePendingConfirmation | null>(null);
  const [history, setHistory] = useState<NexusVoiceHistoryEntry[]>(() => readNexusVoiceHistory());
  const recorderRef = useRef<Awaited<ReturnType<typeof startVoiceRecorderSession>> | null>(null);
  const ttsRef = useRef<ReturnType<typeof createNexusVoiceTtsAdapter> | null>(null);

  const recordingSupported = isVoiceRecordingSupported();
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    ttsRef.current = createNexusVoiceTtsAdapter(
      () => setStatus("speaking"),
      () => setStatus((current) => (current === "confirming" ? "confirming" : "idle")),
    );
  }, []);

  const recordHistory = useCallback(
    (entry: {
      transcript: string;
      response: string;
      tool: string | null;
      kind?: NexusVoiceHistoryEntry["kind"];
    }) => {
      setHistory(
        appendNexusVoiceHistory({
          transcript: entry.transcript,
          response: entry.response,
          tool: entry.tool,
          kind: entry.kind,
        }),
      );
    },
    [],
  );

  const applyVoiceResponse = useCallback(
    (payload: NexusVoiceApiResponse, sourceTranscript: string) => {
      const nextTranscript = payload.transcript?.trim() || sourceTranscript;
      const nextResponse = payload.response?.trim() || "NEXUS did not return a response.";

      setTranscript(nextTranscript);
      setResponse(nextResponse);
      setPendingConfirmation(payload.pendingConfirmation ?? null);
      setStatus(payload.requiresConfirmation ? "confirming" : "thinking");

      recordHistory({
        transcript: nextTranscript,
        response: nextResponse,
        tool: payload.tool ?? null,
        kind: payload.requiresConfirmation ? "action" : undefined,
      });

      if (!payload.requiresConfirmation) {
        speakResponse(ttsSupported, ttsRef, nextResponse, setStatus);
      } else {
        setStatus("confirming");
      }
    },
    [recordHistory, ttsSupported],
  );

  const closePanel = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    ttsRef.current?.stop();
    setOpen(false);
    setStatus("idle");
    setError(null);
    setPendingConfirmation(null);
  }, []);

  const cancelConfirmation = useCallback(() => {
    setPendingConfirmation(null);
    setResponse("Action cancelled. No changes were made.");
    setStatus("idle");
    recordHistory({
      transcript,
      response: "Action cancelled.",
      tool: "confirm",
      kind: "confirmation",
    });
  }, [recordHistory, transcript]);

  const confirmPendingAction = useCallback(async () => {
    if (!pendingConfirmation) {
      return;
    }

    setStatus("thinking");
    setError(null);

    try {
      const apiResponse = await fetch("/api/admin/nexus/voice/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pendingConfirmation.token }),
      });

      const payload = (await apiResponse.json()) as NexusVoiceApiResponse;

      if (!apiResponse.ok) {
        throw new Error(payload.error || "NEXUS confirmation failed.");
      }

      const nextResponse = payload.response?.trim() || "Action completed.";
      setPendingConfirmation(null);
      setResponse(nextResponse);
      recordHistory({
        transcript,
        response: nextResponse,
        tool: payload.tool ?? pendingConfirmation.tool,
        kind: "confirmation",
      });
      speakResponse(ttsSupported, ttsRef, nextResponse, setStatus);
    } catch (confirmError) {
      const message =
        confirmError instanceof Error ? confirmError.message : "NEXUS confirmation failed.";
      setError(message);
      setStatus("error");
    }
  }, [pendingConfirmation, recordHistory, transcript, ttsSupported]);

  const submitTranscript = useCallback(
    async (nextTranscript: string) => {
      const trimmed = nextTranscript.trim();
      if (!trimmed) {
        setError("No speech detected. Try again.");
        setStatus("error");
        return;
      }

      setTranscript(trimmed);
      setStatus("thinking");
      setError(null);
      setPendingConfirmation(null);

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

        applyVoiceResponse(payload, trimmed);
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "NEXUS voice request failed.";
        setError(message);
        setStatus("error");
      }
    },
    [applyVoiceResponse],
  );

  const submitAudio = useCallback(
    async (file: File) => {
      setStatus("transcribing");
      setError(null);
      setPendingConfirmation(null);

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

        applyVoiceResponse(payload, payload.transcript?.trim() || "");
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "NEXUS voice request failed.";
        setError(message);
        setStatus("error");
      }
    },
    [applyVoiceResponse],
  );

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

    if (
      status === "transcribing" ||
      status === "thinking" ||
      status === "speaking" ||
      status === "confirming"
    ) {
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

  const statusLabel =
    status === "listening"
      ? "Listening..."
      : status === "transcribing"
        ? "Transcribing..."
        : status === "thinking"
          ? "Thinking..."
          : status === "speaking"
            ? "Speaking..."
            : status === "confirming"
              ? "Awaiting confirmation..."
              : null;

  return {
    open,
    closePanel,
    status,
    statusLabel,
    transcript,
    response,
    error,
    history,
    pendingConfirmation,
    recordingSupported,
    ttsSupported,
    toggleListening,
    submitTranscript,
    confirmPendingAction,
    cancelConfirmation,
    isListening: status === "listening",
    isBusy:
      status === "transcribing" ||
      status === "thinking" ||
      status === "speaking" ||
      status === "confirming",
  };
}

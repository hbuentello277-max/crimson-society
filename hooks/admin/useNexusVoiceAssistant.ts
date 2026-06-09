"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { appendNexusVoiceHistory, readNexusVoiceHistory } from "@/lib/admin/nexus-voice/history";
import type { NexusVoiceHistoryEntry } from "@/lib/admin/nexus-voice/history";
import { createNexusVoiceTtsAdapter } from "@/lib/admin/nexus-voice/client-tts";
import type {
  NexusVoiceActionResult,
  NexusVoiceNavigationAction,
  NexusVoicePendingConfirmation,
  NexusVoiceStatus,
} from "@/lib/admin/nexus-voice/types";
import { toNexusVoiceUserError } from "@/lib/admin/nexus-voice/user-errors";
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
  transcriptionUnavailable?: boolean;
  pendingConfirmation?: NexusVoicePendingConfirmation;
  requiresConfirmation?: boolean;
  navigation?: NexusVoiceNavigationAction;
};

function speakResponse(
  ttsSupported: boolean,
  ttsRef: RefObject<ReturnType<typeof createNexusVoiceTtsAdapter> | null>,
  text: string,
  setStatus: (status: NexusVoiceStatus) => void,
  onComplete?: () => void,
) {
  if (ttsSupported && text) {
    ttsRef.current?.speak(text, onComplete);
  } else {
    setStatus("idle");
    onComplete?.();
  }
}

export function useNexusVoiceAssistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<NexusVoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [transcriptionUnavailable, setTranscriptionUnavailable] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<NexusVoiceNavigationAction | null>(
    null,
  );
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

  const navigateTo = useCallback(
    (navigation: NexusVoiceNavigationAction) => {
      setPendingNavigation(null);
      router.push(navigation.href);
    },
    [router],
  );

  const applyVoiceResponse = useCallback(
    (payload: NexusVoiceApiResponse, sourceTranscript: string) => {
      const nextTranscript = payload.transcript?.trim() || sourceTranscript;
      const nextResponse = payload.response?.trim() || "NEXUS did not return a response.";
      const navigation = payload.navigation ?? null;

      setTranscript(nextTranscript);
      setResponse(nextResponse);
      setPendingConfirmation(payload.pendingConfirmation ?? null);
      setPendingNavigation(navigation);
      setStatus(payload.requiresConfirmation ? "confirming" : "thinking");

      recordHistory({
        transcript: nextTranscript,
        response: nextResponse,
        tool: navigation ? "navigate" : (payload.tool ?? null),
        kind: payload.requiresConfirmation
          ? "action"
          : navigation
            ? "navigation"
            : undefined,
      });

      if (!payload.requiresConfirmation) {
        const afterSpeech = navigation ? () => navigateTo(navigation) : undefined;
        speakResponse(ttsSupported, ttsRef, nextResponse, setStatus, afterSpeech);
      } else {
        setStatus("confirming");
      }
    },
    [navigateTo, recordHistory, ttsSupported],
  );

  const openPanel = useCallback(() => {
    setOpen(true);
    setError(null);
  }, []);

  const applyVoiceFailure = useCallback((failure: unknown, fallback?: string) => {
    const payloadUnavailable =
      typeof failure === "object" &&
      failure !== null &&
      "transcriptionUnavailable" in failure &&
      Boolean((failure as { transcriptionUnavailable?: boolean }).transcriptionUnavailable);

    const { message, transcriptionUnavailable: unavailable } = toNexusVoiceUserError(
      failure,
      fallback,
    );
    const degraded = unavailable || payloadUnavailable;

    setError(message);
    if (degraded) {
      setTranscriptionUnavailable(true);
      setStatus("idle");
      return;
    }
    setStatus("error");
  }, []);

  const closePanel = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    ttsRef.current?.stop();
    setOpen(false);
    setStatus("idle");
    setError(null);
    setTranscriptionUnavailable(false);
    setPendingConfirmation(null);
    setPendingNavigation(null);
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
        const failure = toNexusVoiceUserError(
          payload.error || payload,
          "NEXUS confirmation failed. Try again or type a command.",
        );
        throw Object.assign(new Error(failure.message), failure);
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
      applyVoiceFailure(confirmError, "NEXUS confirmation failed. Try again or type a command.");
    }
  }, [applyVoiceFailure, pendingConfirmation, recordHistory, transcript, ttsSupported]);

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
      setPendingNavigation(null);

      try {
        const apiResponse = await fetch("/api/admin/nexus/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: trimmed }),
        });

        const payload = (await apiResponse.json()) as NexusVoiceApiResponse;

        if (!apiResponse.ok) {
          const failure = toNexusVoiceUserError(
            payload.error || payload,
            "NEXUS voice request failed. Try again or type a command.",
          );
          throw Object.assign(new Error(failure.message), {
            ...failure,
            transcriptionUnavailable:
              failure.transcriptionUnavailable || Boolean(payload.transcriptionUnavailable),
          });
        }

        applyVoiceResponse(payload, trimmed);
      } catch (submitError) {
        applyVoiceFailure(submitError, "NEXUS voice request failed. Try again or type a command.");
      }
    },
    [applyVoiceResponse],
  );

  const submitAudio = useCallback(
    async (file: File) => {
      setStatus("transcribing");
      setError(null);
      setPendingConfirmation(null);
      setPendingNavigation(null);

      const formData = new FormData();
      formData.append("audio", file);

      try {
        const apiResponse = await fetch("/api/admin/nexus/voice", {
          method: "POST",
          body: formData,
        });

        const payload = (await apiResponse.json()) as NexusVoiceApiResponse;

        if (!apiResponse.ok) {
          const failure = toNexusVoiceUserError(
            payload.error || payload,
            "NEXUS voice request failed. Try again or type a command.",
          );
          throw Object.assign(new Error(failure.message), {
            ...failure,
            transcriptionUnavailable:
              failure.transcriptionUnavailable || Boolean(payload.transcriptionUnavailable),
          });
        }

        applyVoiceResponse(payload, payload.transcript?.trim() || "");
      } catch (submitError) {
        applyVoiceFailure(submitError, "NEXUS voice request failed. Try again or type a command.");
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

    if (!recordingSupported || transcriptionUnavailable) {
      setOpen(true);
      if (transcriptionUnavailable) {
        setError(
          "NEXUS voice transcription is temporarily unavailable. You can still type a command.",
        );
        setStatus("idle");
      } else {
        setError("Voice recording is not supported on this device.");
        setStatus("error");
      }
      return;
    }

    setOpen(true);
    setError(null);
    setStatus("listening");

    try {
      recorderRef.current?.cancel();
      recorderRef.current = await startVoiceRecorderSession(MAX_RECORD_SECONDS);
    } catch (recordError) {
      applyVoiceFailure(recordError, "Could not start recording. Try typing a command.");
      recorderRef.current = null;
    }
  }, [applyVoiceFailure, recordingSupported, status, stopListening, transcriptionUnavailable]);

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
    openPanel,
    closePanel,
    status,
    statusLabel,
    transcript,
    response,
    error,
    transcriptionUnavailable,
    history,
    pendingConfirmation,
    pendingNavigation,
    recordingSupported: recordingSupported && !transcriptionUnavailable,
    ttsSupported,
    toggleListening,
    submitTranscript,
    confirmPendingAction,
    cancelConfirmation,
    navigateTo,
    isListening: status === "listening",
    isBusy:
      status === "transcribing" ||
      status === "thinking" ||
      status === "speaking" ||
      status === "confirming",
  };
}

export type NexusVoiceAssistantState = ReturnType<typeof useNexusVoiceAssistant>;

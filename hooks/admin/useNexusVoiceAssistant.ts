"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  formatConversationControlResponse,
  readConversationModePreference,
  resolveConversationControlCommand,
  shouldResumeConversationListening,
  writeConversationModePreference,
  type NexusVoiceSessionContext,
} from "@/lib/admin/nexus-voice/conversation";
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
  sessionContext?: NexusVoiceSessionContext;
  resolvedTranscript?: string;
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
  const [conversationModeEnabled, setConversationModeEnabled] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [conversationPaused, setConversationPaused] = useState(false);
  const [sessionContext, setSessionContext] = useState<NexusVoiceSessionContext | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<NexusVoiceNavigationAction | null>(
    null,
  );
  const [pendingConfirmation, setPendingConfirmation] =
    useState<NexusVoicePendingConfirmation | null>(null);
  const [history, setHistory] = useState<NexusVoiceHistoryEntry[]>(() => readNexusVoiceHistory());
  const recorderRef = useRef<Awaited<ReturnType<typeof startVoiceRecorderSession>> | null>(null);
  const ttsRef = useRef<ReturnType<typeof createNexusVoiceTtsAdapter> | null>(null);
  const sessionContextRef = useRef<NexusVoiceSessionContext | null>(null);
  const conversationModeRef = useRef(false);
  const conversationActiveRef = useRef(false);
  const conversationPausedRef = useRef(false);
  const transcriptionUnavailableRef = useRef(false);

  const recordingSupported = isVoiceRecordingSupported();
  const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    setConversationModeEnabled(readConversationModePreference());
  }, []);

  useEffect(() => {
    sessionContextRef.current = sessionContext;
  }, [sessionContext]);

  useEffect(() => {
    conversationModeRef.current = conversationModeEnabled;
  }, [conversationModeEnabled]);

  useEffect(() => {
    conversationActiveRef.current = conversationActive;
  }, [conversationActive]);

  useEffect(() => {
    conversationPausedRef.current = conversationPaused;
  }, [conversationPaused]);

  useEffect(() => {
    transcriptionUnavailableRef.current = transcriptionUnavailable;
  }, [transcriptionUnavailable]);

  useEffect(() => {
    ttsRef.current = createNexusVoiceTtsAdapter(
      () => setStatus("speaking"),
      () => undefined,
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

  const stopRecorder = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
  }, []);

  const endConversation = useCallback(() => {
    stopRecorder();
    setConversationActive(false);
    setConversationPaused(false);
    setSessionContext(null);
    if (status === "listening" || status === "listening_followup") {
      setStatus("idle");
    }
  }, [status, stopRecorder]);

  const setConversationMode = useCallback((enabled: boolean) => {
    writeConversationModePreference(enabled);
    setConversationModeEnabled(enabled);
    if (!enabled) {
      setConversationActive(false);
      setConversationPaused(false);
    }
  }, []);

  const startListeningSession = useCallback(
    async (mode: "manual" | "followup") => {
      if (!recordingSupported || transcriptionUnavailableRef.current) {
        if (mode === "followup") {
          setStatus("listening_followup");
        } else {
          setError(
            "NEXUS voice transcription is temporarily unavailable. You can still type a follow-up.",
          );
          setStatus(transcriptionUnavailableRef.current ? "idle" : "error");
        }
        return;
      }

      setOpen(true);
      setError(null);
      setStatus(mode === "followup" ? "listening_followup" : "listening");

      try {
        stopRecorder();
        recorderRef.current = await startVoiceRecorderSession(MAX_RECORD_SECONDS);
      } catch (recordError) {
        const { message } = toNexusVoiceUserError(
          recordError,
          "Could not start recording. Try typing a command.",
        );
        setError(message);
        setStatus("error");
        recorderRef.current = null;
      }
    },
    [recordingSupported, stopRecorder],
  );

  const resumeConversationListening = useCallback(
    async (input: { hadError?: boolean; requiresConfirmation?: boolean }) => {
      const decision = shouldResumeConversationListening({
        conversationModeEnabled: conversationModeRef.current,
        conversationActive: conversationActiveRef.current,
        conversationPaused: conversationPausedRef.current,
        transcriptionUnavailable: transcriptionUnavailableRef.current,
        recordingSupported,
        hadError: input.hadError === true,
        requiresConfirmation: input.requiresConfirmation === true,
      });

      if (decision.shouldResumeListening) {
        await startListeningSession("followup");
        return;
      }

      if (decision.nextStatus === "listening_followup") {
        setStatus("listening_followup");
        return;
      }

      setStatus("idle");
    },
    [recordingSupported, startListeningSession],
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
      setSessionContext(payload.sessionContext ?? null);
      setStatus(payload.requiresConfirmation ? "confirming" : "thinking");

      if (conversationModeRef.current) {
        setConversationActive(true);
      }

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
        const afterSpeech = () => {
          if (navigation) {
            navigateTo(navigation);
          }
          void resumeConversationListening({ requiresConfirmation: false, hadError: false });
        };
        speakResponse(ttsSupported, ttsRef, nextResponse, setStatus, afterSpeech);
      } else {
        setStatus("confirming");
      }
    },
    [navigateTo, recordHistory, resumeConversationListening, ttsSupported],
  );

  const handleConversationControl = useCallback(
    (command: NonNullable<ReturnType<typeof resolveConversationControlCommand>>) => {
      const message = formatConversationControlResponse(command);

      switch (command) {
        case "start_mode":
          setConversationMode(true);
          setConversationActive(true);
          setConversationPaused(false);
          break;
        case "stop_mode":
          setConversationMode(false);
          endConversation();
          break;
        case "end_conversation":
          endConversation();
          break;
        case "pause_listening":
          stopRecorder();
          setConversationPaused(true);
          setStatus("conversation_paused");
          break;
        case "resume_listening":
          setConversationPaused(false);
          if (conversationModeRef.current) {
            setConversationActive(true);
            void startListeningSession("followup");
          } else {
            setStatus("idle");
          }
          break;
        default:
          break;
      }

      setTranscript("");
      setResponse(message);
      recordHistory({ transcript: command, response: message, tool: "conversation" });
      speakResponse(ttsSupported, ttsRef, message, setStatus, () => {
        if (command === "resume_listening" && conversationModeRef.current) {
          return;
        }
        setStatus(command === "pause_listening" ? "conversation_paused" : "idle");
      });
      return true;
    },
    [endConversation, recordHistory, setConversationMode, startListeningSession, stopRecorder, ttsSupported],
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
      void resumeConversationListening({ hadError: false, requiresConfirmation: false });
      return;
    }
    setStatus("error");
    void resumeConversationListening({ hadError: true, requiresConfirmation: false });
  }, [resumeConversationListening]);

  const closePanel = useCallback(() => {
    stopRecorder();
    ttsRef.current?.stop();
    endConversation();
    setOpen(false);
    setStatus("idle");
    setError(null);
    setTranscriptionUnavailable(false);
    setPendingConfirmation(null);
    setPendingNavigation(null);
  }, [endConversation, stopRecorder]);

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
    void resumeConversationListening({ hadError: false, requiresConfirmation: false });
  }, [recordHistory, resumeConversationListening, transcript]);

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
      if (payload.sessionContext) {
        setSessionContext(payload.sessionContext);
      }
      recordHistory({
        transcript,
        response: nextResponse,
        tool: payload.tool ?? pendingConfirmation.tool,
        kind: "confirmation",
      });
      speakResponse(ttsSupported, ttsRef, nextResponse, setStatus, () => {
        void resumeConversationListening({ hadError: false, requiresConfirmation: false });
      });
    } catch (confirmError) {
      applyVoiceFailure(confirmError, "NEXUS confirmation failed. Try again or type a command.");
    }
  }, [
    applyVoiceFailure,
    pendingConfirmation,
    recordHistory,
    resumeConversationListening,
    transcript,
    ttsSupported,
  ]);

  const submitTranscript = useCallback(
    async (nextTranscript: string) => {
      const trimmed = nextTranscript.trim();
      if (!trimmed) {
        setError("No speech detected. Try again.");
        setStatus("error");
        return;
      }

      const control = resolveConversationControlCommand(trimmed);
      if (control) {
        handleConversationControl(control);
        return;
      }

      setTranscript(trimmed);
      setStatus("thinking");
      setError(null);
      setPendingConfirmation(null);
      setPendingNavigation(null);

      if (conversationModeRef.current) {
        setConversationActive(true);
      }

      try {
        const apiResponse = await fetch("/api/admin/nexus/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: trimmed,
            sessionContext: sessionContextRef.current,
          }),
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
    [applyVoiceFailure, applyVoiceResponse, handleConversationControl],
  );

  const submitAudio = useCallback(
    async (file: File) => {
      setStatus("transcribing");
      setError(null);
      setPendingConfirmation(null);
      setPendingNavigation(null);

      if (conversationModeRef.current) {
        setConversationActive(true);
      }

      const formData = new FormData();
      formData.append("audio", file);
      if (sessionContextRef.current) {
        formData.append("sessionContext", JSON.stringify(sessionContextRef.current));
      }

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
    [applyVoiceFailure, applyVoiceResponse],
  );

  const stopListening = useCallback(async () => {
    const session = recorderRef.current;
    recorderRef.current = null;

    if (!session) {
      setStatus(conversationPaused ? "conversation_paused" : "idle");
      return;
    }

    const recording = await session.stop();
    if (!recording || recording.durationSeconds < 0.5) {
      setError("Recording was too short. Hold the mic and speak clearly.");
      setStatus("error");
      void resumeConversationListening({ hadError: true, requiresConfirmation: false });
      return;
    }

    const file = voiceBlobToFile(recording.blob, recording.mimeType);
    await submitAudio(file);
  }, [conversationPaused, resumeConversationListening, submitAudio]);

  const toggleListening = useCallback(async () => {
    if (status === "listening" || status === "listening_followup") {
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

    if (conversationPaused) {
      setConversationPaused(false);
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

    if (conversationModeEnabled) {
      setConversationActive(true);
    }

    await startListeningSession("manual");
  }, [
    conversationModeEnabled,
    conversationPaused,
    recordingSupported,
    startListeningSession,
    status,
    stopListening,
    transcriptionUnavailable,
  ]);

  const pauseConversation = useCallback(() => {
    stopRecorder();
    setConversationPaused(true);
    setStatus("conversation_paused");
  }, [stopRecorder]);

  const resumeConversation = useCallback(() => {
    setConversationPaused(false);
    if (conversationModeEnabled) {
      setConversationActive(true);
      void startListeningSession("followup");
    } else {
      setStatus("idle");
    }
  }, [conversationModeEnabled, startListeningSession]);

  const toggleConversationMode = useCallback(() => {
    const next = !conversationModeEnabled;
    setConversationMode(next);
    if (next) {
      setResponse("Conversation mode is on. I will listen for follow-ups after each response.");
    } else {
      endConversation();
      setResponse("Conversation mode is off.");
    }
  }, [conversationModeEnabled, endConversation, setConversationMode]);

  const statusLabel =
    transcriptionUnavailable && (status === "idle" || status === "listening_followup")
      ? "Transcription unavailable — type a follow-up"
      : status === "listening"
        ? "Listening..."
        : status === "listening_followup"
          ? "Listening for follow-up..."
          : status === "transcribing"
            ? "Transcribing..."
            : status === "thinking"
              ? "Thinking..."
              : status === "speaking"
                ? "Speaking..."
                : status === "confirming"
                  ? "Awaiting confirmation..."
                  : status === "conversation_paused"
                    ? "Conversation paused"
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
    conversationModeEnabled,
    conversationActive,
    conversationPaused,
    sessionContext,
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
    endConversation,
    pauseConversation,
    resumeConversation,
    toggleConversationMode,
    isListening: status === "listening" || status === "listening_followup",
    isBusy:
      status === "transcribing" ||
      status === "thinking" ||
      status === "speaking" ||
      status === "confirming",
  };
}

export type NexusVoiceAssistantState = ReturnType<typeof useNexusVoiceAssistant>;

"use client";

import type { ChangeEvent, RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmojiTray } from "@/components/inbox/EmojiTray";
import { IconCamera, IconGallery, IconSend } from "@/components/inbox/inbox-icons";
import {
  VoiceMicButton,
  VoiceRecordingBar,
  VoiceUnsupportedNotice,
} from "@/components/inbox/VoiceRecordingBar";
import { VoicePreviewBar } from "@/components/inbox/VoicePreviewBar";
import {
  CS_SEND_BTN,
  CS_SEND_BTN_DISABLED,
  CS_TOOLBAR_BTN_ACTIVE,
  CS_TOOLBAR_BTN_INACTIVE,
  MOBILE_BOTTOM_SAFE_INSET,
} from "@/lib/crimson-accent";
import {
  DM_VOICE_MAX_SECONDS,
  DM_VOICE_MIN_SECONDS,
  isVoiceRecordingSupported,
  startVoiceRecorderSession,
  voiceBlobToFile,
  VOICE_UNSUPPORTED_MESSAGE,
} from "@/lib/messages/voice-recorder";

/** Dock at the home indicator — tucked inside full safe-area on notched iPhones. */
export const MESSAGE_COMPOSER_BOTTOM_OFFSET = MOBILE_BOTTOM_SAFE_INSET;

export type VoiceComposerPhase = "idle" | "recording" | "preview" | "uploading" | "failed";

type VoicePreviewState = {
  file: File;
  durationSeconds: number;
  objectUrl: string;
};

type MessageComposerProps = {
  draft: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onImageSelected: (file: File) => void;
  onAudioRecorded: (file: File, durationSeconds: number) => void;
  sending?: boolean;
  uploadingMedia?: boolean;
  mediaUploadKind?: "image" | "audio" | null;
  uploadError?: string | null;
};

export function MessageComposer({
  draft,
  inputRef,
  onDraftChange,
  onSend,
  onImageSelected,
  onAudioRecorded,
  sending = false,
  uploadingMedia = false,
  mediaUploadKind = null,
  uploadError = null,
}: MessageComposerProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showVoiceUnsupported, setShowVoiceUnsupported] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoiceComposerPhase>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [preview, setPreview] = useState<VoicePreviewState | null>(null);
  const [finishingVoice, setFinishingVoice] = useState(false);

  const sessionRef = useRef<Awaited<ReturnType<typeof startVoiceRecorderSession>> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef(0);
  const finishRecordingRef = useRef<(autoFromMax?: boolean) => Promise<void>>(async () => {});
  const [errorMsgLocal, setErrorMsgLocal] = useState<string | null>(null);

  const uploadingVoice = uploadingMedia && mediaUploadKind === "audio";
  const busy = sending || uploadingMedia || finishingVoice;
  const canSend = Boolean(draft.trim()) && !busy && voicePhase === "idle";
  const showPreview =
    preview && (voicePhase === "preview" || voicePhase === "failed");
  const displayPhase: VoiceComposerPhase = uploadingVoice ? "uploading" : voicePhase;

  useEffect(() => {
    setVoiceSupported(isVoiceRecordingSupported());
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreview((current) => {
      if (current?.objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
      }
      return null;
    });
  }, []);

  const resetRecordingState = useCallback(() => {
    clearTimer();
    sessionRef.current = null;
    setVoicePhase("idle");
    setElapsedSeconds(0);
    recordingStartedAtRef.current = 0;
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
      sessionRef.current?.cancel();
      clearPreview();
    };
  }, [clearPreview, clearTimer]);

  useEffect(() => {
    if (!uploadingMedia && voicePhase === "uploading") {
      if (uploadError) {
        setVoicePhase("failed");
      } else {
        clearPreview();
        setVoicePhase("idle");
      }
    }
  }, [clearPreview, uploadError, uploadingMedia, voicePhase]);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - recordingStartedAtRef.current) / 1000;
      setElapsedSeconds(Math.min(elapsed, DM_VOICE_MAX_SECONDS));
      if (elapsed >= DM_VOICE_MAX_SECONDS) {
        void finishRecordingRef.current(true);
      }
    }, 200);
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    if (busy || voicePhase === "recording" || voicePhase === "preview") return;

    if (!voiceSupported) {
      setShowVoiceUnsupported(true);
      return;
    }

    setShowVoiceUnsupported(false);
    setErrorMsgLocal(null);
    clearPreview();

    try {
      const session = await startVoiceRecorderSession(DM_VOICE_MAX_SECONDS);
      sessionRef.current = session;
      recordingStartedAtRef.current = Date.now();
      setVoicePhase("recording");
      setElapsedSeconds(0);
      startTimer();
    } catch (error) {
      const message = error instanceof Error ? error.message : VOICE_UNSUPPORTED_MESSAGE;
      if (message === VOICE_UNSUPPORTED_MESSAGE) {
        setVoiceSupported(false);
        setShowVoiceUnsupported(true);
      }
      setErrorMsgLocal(message);
      setVoicePhase("failed");
    }
  }, [busy, clearPreview, startTimer, voicePhase, voiceSupported]);

  const finishRecording = useCallback(
    async (autoFromMax = false) => {
      const session = sessionRef.current;
      if (!session || finishingVoice) return;

      setFinishingVoice(true);
      clearTimer();

      try {
        const result = await session.stop();
        sessionRef.current = null;
        setVoicePhase("idle");
        setElapsedSeconds(0);
        recordingStartedAtRef.current = 0;

        if (!result) return;

        const duration = Math.min(
          DM_VOICE_MAX_SECONDS,
          Math.max(0, result.durationSeconds),
        );

        if (duration < DM_VOICE_MIN_SECONDS && !autoFromMax) {
          setErrorMsgLocal(`Record for at least ${DM_VOICE_MIN_SECONDS} second before previewing.`);
          setVoicePhase("failed");
          return;
        }

        if (duration < DM_VOICE_MIN_SECONDS) {
          setErrorMsgLocal("Recording too short.");
          setVoicePhase("failed");
          return;
        }

        const file = voiceBlobToFile(result.blob, result.mimeType);
        const objectUrl = URL.createObjectURL(file);
        setPreview({
          file,
          durationSeconds: Math.round(duration),
          objectUrl,
        });
        setVoicePhase("preview");
      } catch (error) {
        setErrorMsgLocal(
          error instanceof Error ? error.message : "Could not finish recording.",
        );
        setVoicePhase("failed");
      } finally {
        setFinishingVoice(false);
      }
    },
    [clearTimer, finishingVoice],
  );

  useEffect(() => {
    finishRecordingRef.current = finishRecording;
  }, [finishRecording]);

  const cancelRecording = useCallback(() => {
    sessionRef.current?.cancel();
    sessionRef.current = null;
    clearTimer();
    setVoicePhase("idle");
    setElapsedSeconds(0);
    recordingStartedAtRef.current = 0;
    setFinishingVoice(false);
  }, [clearTimer]);

  const cancelPreview = useCallback(() => {
    clearPreview();
    setVoicePhase("idle");
    setErrorMsgLocal(null);
  }, [clearPreview]);

  const sendPreview = useCallback(() => {
    if (!preview) return;

    setVoicePhase("uploading");
    onAudioRecorded(preview.file, preview.durationSeconds);
  }, [onAudioRecorded, preview]);

  const handleMicClick = () => {
    if (busy) return;

    if (voicePhase === "recording") {
      void finishRecording();
      return;
    }

    if (voicePhase === "idle" || voicePhase === "failed") {
      setErrorMsgLocal(null);
      void startRecording();
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onImageSelected(file);
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef?.current;
    if (!input) {
      onDraftChange(draft + emoji);
      return;
    }

    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    onDraftChange(next);

    requestAnimationFrame(() => {
      const caret = start + emoji.length;
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  };

  const uploadPlaceholder =
    mediaUploadKind === "audio"
      ? "Uploading voice…"
      : uploadingMedia
        ? "Uploading photo…"
        : "Message...";

  const imageToolbarActive = uploadingMedia && mediaUploadKind === "image";
  const statusMessage = uploadError || errorMsgLocal;

  return (
    <div
      className="box-border w-full max-w-full shrink-0 overflow-x-hidden border-t border-[#b4141e]/25 bg-[#050505]"
      style={{ paddingBottom: MESSAGE_COMPOSER_BOTTOM_OFFSET }}
    >
      <EmojiTray open={emojiOpen} onPick={insertEmoji} />

      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        className="hidden"
        onChange={handleImageChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageChange}
      />

      <div className="box-border w-full max-w-full px-4">
        {showVoiceUnsupported ? (
          <VoiceUnsupportedNotice onDismiss={() => setShowVoiceUnsupported(false)} />
        ) : null}

        {statusMessage ? (
          <p className="mb-2 text-center text-[12px] text-[#e87a82]">{statusMessage}</p>
        ) : null}

        {displayPhase === "uploading" ? (
          <div className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-[#141414] px-4 py-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#b4141e] border-t-transparent" />
            <span className="text-sm text-zinc-300">Sending voice message…</span>
          </div>
        ) : showPreview && preview ? (
          <VoicePreviewBar
            objectUrl={preview.objectUrl}
            durationSeconds={preview.durationSeconds}
            onCancel={cancelPreview}
            onSend={sendPreview}
            sending={uploadingVoice}
          />
        ) : displayPhase === "recording" ? (
          <VoiceRecordingBar
            elapsedSeconds={elapsedSeconds}
            onCancel={cancelRecording}
            onDone={() => void finishRecording()}
            finishing={finishingVoice}
          />
        ) : (
          <div className="flex w-full min-w-0 max-w-full items-end gap-1">
            <div className="flex shrink-0 items-end gap-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => cameraRef.current?.click()}
                className={imageToolbarActive ? CS_TOOLBAR_BTN_ACTIVE : CS_TOOLBAR_BTN_INACTIVE}
                aria-label="Take photo"
              >
                <IconCamera />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => galleryRef.current?.click()}
                className={imageToolbarActive ? CS_TOOLBAR_BTN_ACTIVE : CS_TOOLBAR_BTN_INACTIVE}
                aria-label="Choose from gallery"
              >
                <IconGallery />
              </button>
              <VoiceMicButton
                active={voicePhase === "recording"}
                disabled={busy || voicePhase === "preview"}
                title={
                  voiceSupported
                    ? voicePhase === "recording"
                      ? "Tap to finish recording"
                      : "Tap to record a voice message"
                    : VOICE_UNSUPPORTED_MESSAGE
                }
                onClick={handleMicClick}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => setEmojiOpen((open) => !open)}
                className={emojiOpen ? CS_TOOLBAR_BTN_ACTIVE : CS_TOOLBAR_BTN_INACTIVE}
                aria-label="Insert emoji"
                aria-expanded={emojiOpen}
              >
                <span className="text-lg leading-none">☺</span>
              </button>
            </div>

            <div className="flex min-w-0 flex-1 items-center rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-2 focus-within:border-[#b4141e]/50 focus-within:ring-1 focus-within:ring-[#b4141e]/15">
              <input
                ref={inputRef}
                type="text"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                value={draft}
                disabled={busy}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
                placeholder={uploadPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40 disabled:opacity-60"
              />
            </div>

            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className={canSend ? CS_SEND_BTN : CS_SEND_BTN_DISABLED}
              aria-label="Send message"
            >
              <IconSend className="h-5 w-5 text-current" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Browser TTS for NEXUS admin voice. Uses speechSynthesis first;
 * structure allows swapping to OpenAI TTS or ElevenLabs later.
 */

export type NexusVoiceTtsProvider = "speech-synthesis" | "openai" | "elevenlabs";

export type NexusVoiceTtsAdapter = {
  readonly provider: NexusVoiceTtsProvider;
  isSupported(): boolean;
  speak(text: string): void;
  stop(): void;
};

function createNoopAdapter(): NexusVoiceTtsAdapter {
  return {
    provider: "speech-synthesis",
    isSupported: () => false,
    speak: () => undefined,
    stop: () => undefined,
  };
}

export function createBrowserSpeechSynthesisAdapter(
  onStart?: () => void,
  onEnd?: () => void,
): NexusVoiceTtsAdapter {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return createNoopAdapter();
  }

  return {
    provider: "speech-synthesis",
    isSupported: () => true,
    speak(text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.onstart = () => onStart?.();
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
    },
    stop() {
      window.speechSynthesis.cancel();
      onEnd?.();
    },
  };
}

/** Placeholder for a future paid TTS provider. */
export function createOpenAiTtsAdapter(): NexusVoiceTtsAdapter | null {
  return null;
}

/** Placeholder for a future paid TTS provider. */
export function createElevenLabsTtsAdapter(): NexusVoiceTtsAdapter | null {
  return null;
}

export function createNexusVoiceTtsAdapter(
  onStart?: () => void,
  onEnd?: () => void,
): NexusVoiceTtsAdapter {
  return (
    createBrowserSpeechSynthesisAdapter(onStart, onEnd) ??
    createOpenAiTtsAdapter() ??
    createElevenLabsTtsAdapter() ??
    createNoopAdapter()
  );
}

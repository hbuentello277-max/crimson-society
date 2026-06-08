/**
 * Voice guidance adapter contract — implementation deferred to a future phase.
 * Navigation UI and state machine should depend on this interface only.
 */

export type VoiceGuidanceEventType =
  | "approaching_maneuver"
  | "off_route"
  | "arrival"
  | "reroute"
  | "custom";

export type VoiceGuidanceEvent = {
  type: VoiceGuidanceEventType;
  instruction: string;
  distanceMiles?: number;
  maneuverId?: string;
};

export type VoiceGuidanceAdapter = {
  readonly kind: "speech-synthesis" | "native-tts" | "noop";
  isSupported(): boolean;
  speak(event: VoiceGuidanceEvent): void;
  stop(): void;
};

export type VoiceGuidanceController = {
  adapter: VoiceGuidanceAdapter | null;
  enabled: boolean;
  setEnabled(enabled: boolean): void;
  announce(event: VoiceGuidanceEvent): void;
  stop(): void;
};

function createNoopAdapter(): VoiceGuidanceAdapter {
  return {
    kind: "noop",
    isSupported: () => false,
    speak: () => undefined,
    stop: () => undefined,
  };
}

/** Future phases can swap in Web Speech API or native bridge implementations. */
export function createSpeechSynthesisAdapter(): VoiceGuidanceAdapter | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  return {
    kind: "speech-synthesis",
    isSupported: () => true,
    speak(event) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(event.instruction);
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
    },
    stop() {
      window.speechSynthesis.cancel();
    },
  };
}

export function createVoiceGuidanceController(
  adapter: VoiceGuidanceAdapter | null = null,
): VoiceGuidanceController {
  let enabled = false;
  const resolvedAdapter = adapter ?? createNoopAdapter();

  return {
    get adapter() {
      return resolvedAdapter;
    },
    get enabled() {
      return enabled;
    },
    setEnabled(next) {
      enabled = next;
      if (!next) resolvedAdapter.stop();
    },
    announce(event) {
      if (!enabled || !resolvedAdapter.isSupported()) return;
      resolvedAdapter.speak(event);
    },
    stop() {
      resolvedAdapter.stop();
    },
  };
}

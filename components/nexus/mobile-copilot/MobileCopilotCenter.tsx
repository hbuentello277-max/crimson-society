"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ApprovalInboxPanel } from "@/components/nexus/mobile-copilot/ApprovalInboxPanel";
import { CopilotConversationTimeline } from "@/components/nexus/mobile-copilot/CopilotConversationTimeline";
import { FounderSnapshotPanel } from "@/components/nexus/mobile-copilot/FounderSnapshotPanel";
import { MobileVoiceInterface } from "@/components/nexus/mobile-copilot/MobileVoiceInterface";
import { QuickActionChips } from "@/components/nexus/mobile-copilot/QuickActionChips";
import { TodaysFocusStrip } from "@/components/nexus/mobile-copilot/TodaysFocusStrip";
import { useExecutiveCommand } from "@/hooks/nexus/useExecutiveCommand";
import { useMobileCopilotConversation } from "@/hooks/nexus/useMobileCopilotConversation";
import type { MobileCopilotQuickAction } from "@/lib/mobile-copilot/types";

export function MobileCopilotCenter() {
  const router = useRouter();
  const { summary, loading, refresh } = useExecutiveCommand();
  const {
    conversation,
    typedInput,
    setTypedInput,
    submitTypedMessage,
    runQuickAction,
    displayStatus,
    statusLabel,
    voice,
  } = useMobileCopilotConversation();

  const handleQuickAction = useCallback(
    async (action: MobileCopilotQuickAction) => {
      if (action.kind === "navigation" && action.href) {
        router.push(action.href);
        return;
      }

      if (action.transcript) {
        await runQuickAction(action.transcript);
      }
    },
    [router, runQuickAction],
  );

  const handleListen = useCallback(() => {
    if (voice.isListening) {
      void voice.toggleListening();
      return;
    }
    void voice.toggleListening();
  }, [voice]);

  const handleStop = useCallback(() => {
    void voice.stopAll();
  }, [voice]);

  const busy =
    voice.isBusy ||
    displayStatus === "thinking" ||
    displayStatus === "transcribing" ||
    displayStatus === "speaking";

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3 pb-2">
      <header className="space-y-1 px-0.5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Mobile Copilot</p>
        <h1 className="font-serif text-2xl text-white">Founder copilot mode</h1>
        <p className="text-sm text-zinc-400">
          What matters now, what needs approval, and what NEXUS recommends — optimized for mobile.
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-[10px] uppercase tracking-[0.14em] text-zinc-500 underline-offset-2 hover:text-[#f1c3c7] hover:underline"
        >
          Refresh signals
        </button>
      </header>

      <TodaysFocusStrip summary={summary} loading={loading} />
      <ApprovalInboxPanel actionCenter={summary?.action_center} />
      <FounderSnapshotPanel memory={summary?.founder_memory} />

      <CopilotConversationTimeline entries={conversation} />

      <QuickActionChips disabled={busy || voice.conversationPaused} onAction={(t) => void handleQuickAction(t)} />

      <MobileVoiceInterface
        status={displayStatus}
        statusLabel={statusLabel}
        disabled={busy && !voice.isListening}
        isListening={voice.isListening}
        conversationPaused={voice.conversationPaused}
        onListen={handleListen}
        onStop={handleStop}
        onPause={voice.pauseConversation}
        onResume={voice.resumeConversation}
        typedInput={typedInput}
        onTypedInputChange={setTypedInput}
        onSubmitTyped={() => void submitTypedMessage()}
      />
    </div>
  );
}

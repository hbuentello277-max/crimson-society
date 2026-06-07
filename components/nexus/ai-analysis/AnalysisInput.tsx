"use client";

type AnalysisInputProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function AnalysisInput({ value, disabled, onChange, onSubmit }: AnalysisInputProps) {
  return (
    <form
      className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="min-w-0 flex-1">
        <span className="sr-only">Analysis question</span>
        <textarea
          value={value}
          disabled={disabled}
          rows={2}
          maxLength={500}
          placeholder="Ask Nexus to explain a trend, risk, forecast, or decision…"
          onChange={(event) => onChange(event.target.value)}
          className="w-full min-w-0 resize-none rounded-xl border border-[#b4141e]/30 bg-[#0a0608]/90 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-[#b4141e]/60 focus:outline-none focus:ring-1 focus:ring-[#b4141e]/40 disabled:opacity-60"
        />
      </label>
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-[#b4141e]/50 bg-[#b4141e]/20 px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Analyze
      </button>
    </form>
  );
}

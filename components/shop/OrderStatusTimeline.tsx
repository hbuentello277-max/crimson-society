import type { OrderTimelineStep } from "@/lib/shop/order-timeline";

export function OrderStatusTimeline({ steps }: { steps: OrderTimelineStep[] }) {
  return (
    <ol className="mt-6 space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5">
            {!isLast ? (
              <span
                className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-px ${
                  step.complete ? "bg-emerald-500/40" : "bg-white/10"
                }`}
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                step.current
                  ? "border-[#e87a82] bg-[#b4141e]/30 text-[#f1c3c7]"
                  : step.complete
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-white/15 bg-black/40 text-zinc-600"
              }`}
            >
              {step.complete ? "✓" : index + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={`text-sm ${
                  step.current || step.complete ? "text-white" : "text-zinc-500"
                }`}
              >
                {step.label}
              </p>
              {step.at ? (
                <p className="mt-0.5 text-xs text-zinc-500">
                  {new Date(step.at).toLocaleString()}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

import Link from "next/link";

type NavigationErrorScreenProps = {
  message: string;
};

export function NavigationErrorScreen({ message }: NavigationErrorScreenProps) {
  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050405] px-6 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.26em] text-[#d85f6c]">Navigation Unavailable</p>
        <h1 className="mt-3 font-serif text-3xl text-[#f4f0ea]">Could not open navigation</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{message}</p>
        <Link
          href="/meets"
          className="mt-5 inline-flex rounded-lg border border-[#b4141e]/70 bg-[#b4141e]/25 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#f4dadd]"
        >
          Back to Meets
        </Link>
      </div>
    </main>
  );
}

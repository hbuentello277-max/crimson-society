export function NavigationLoadingScreen() {
  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#050405] text-zinc-100">
      <div className="mx-auto max-w-sm px-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Meet Navigation</p>
        <h1 className="mt-3 font-serif text-3xl text-white">Loading route</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Fetching meet details and road geometry...
        </p>
      </div>
    </main>
  );
}

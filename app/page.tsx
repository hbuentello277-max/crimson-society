export default function Home() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div className="relative w-full max-w-md min-h-screen splash-fade">
        
        <img
          src="/splash.png"
          alt="Crimson Society Splash"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/30" />

        <div className="absolute bottom-10 left-0 right-0 px-6 flex flex-col gap-4">
          
          <a
            href="/login"
            className="w-full py-4 bg-red-700 hover:bg-red-800 rounded-2xl text-center font-semibold text-white text-lg transition-all duration-300 shadow-[0_0_20px_rgba(255,0,0,0.35)]"
          >
            Enter Society
          </a>

          <a
            href="/shop"
            className="w-full py-4 border border-zinc-300 hover:border-red-500 rounded-2xl text-center font-semibold text-white text-lg backdrop-blur-sm bg-black/20 transition-all duration-300"
          >
            Explore Drops
          </a>

        </div>
      </div>
    </main>
  );
}
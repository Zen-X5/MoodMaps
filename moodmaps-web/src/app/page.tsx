import Map from '@/components/Map';

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Map Component as Background */}
      <Map />

      {/* Floating UI Overlay */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <h1 className="text-4xl font-bold text-white drop-shadow-lg tracking-tighter">
          Mood<span className="text-pink-500">Maps</span>
        </h1>
        <p className="text-white/80 text-center mt-1 text-sm font-medium">
          How does the world feel?
        </p>
      </div>

      {/* Placeholder for future sidebar/filters */}
      <div className="absolute bottom-10 right-8 z-20 flex flex-col gap-4">
        {/* Buttons will go here */}
      </div>
    </main>
  );
}

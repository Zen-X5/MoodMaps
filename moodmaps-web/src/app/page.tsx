import Map from '@/components/Map';

export default function Home() {
  return (
    <main className="fullscreen-main">
      {/* Map Component as Background */}
      <Map />

      {/* Floating UI Overlay */}
      <div className="overlay-header">
        <h1 className="brand-title">
          Mood<span className="brand-pink">Maps</span>
        </h1>
        <p className="brand-tagline">
          How does the world feel?
        </p>
      </div>
    </main>
  );
}

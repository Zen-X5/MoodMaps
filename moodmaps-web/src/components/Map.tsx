'use client';

import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import MoodModal from './MoodModal';
import AuthOverlay from './AuthOverlay';
import api from '@/lib/api';

// Replace with your actual Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

const Map: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    // @ts-ignore
    const map = useRef<mapboxgl.Map | null>(null);
    const [lng, setLng] = useState(-70.9);
    const [lat, setLat] = useState(42.35);
    const [zoom, setZoom] = useState(9);

    // States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Load user from storage
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));

        if (map.current) return;

        if (mapContainer.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/dark-v11',
                center: [lng, lat],
                zoom: zoom,
            });

            map.current.on('move', () => {
                setLng(Number(map.current?.getCenter().lng.toFixed(4)));
                setLat(Number(map.current?.getCenter().lat.toFixed(4)));
                setZoom(Number(map.current?.getZoom().toFixed(2)));
            });

            map.current.on('click', (e: any) => {
                const { lng, lat } = e.lngLat;
                setSelectedCoords({ lat, lng });
                setIsModalOpen(true);
            });

            // Initial fetch of moods
            map.current.on('load', () => {
                fetchMoods();
            });
        }
    }, []);

    const fetchMoods = async () => {
        try {
            const { data } = await api.get('/moods');
            if (data.success) {
                renderMarkers(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch moods:', err);
        }
    };

    const renderMarkers = (moods: any[]) => {
        if (!map.current) return;

        // Clear existing markers (simplistic for MVP)
        const elements = document.getElementsByClassName('mapboxgl-marker');
        while (elements.length > 0) {
            elements[0].parentNode?.removeChild(elements[0]);
        }

        moods.forEach((m) => {
            const color = getMoodColor(m.mood);
            const marker = new mapboxgl.Marker({ color })
                .setLngLat(m.location.coordinates)
                .setPopup(new mapboxgl.Popup({ offset: 25 })
                    .setHTML(`
                  <div class="p-3 bg-zinc-900 text-white rounded-lg border border-zinc-800">
                    <h3 class="font-bold capitalize text-lg mb-1">${m.mood}</h3>
                    <p class="text-sm text-zinc-400 leading-tight">${m.description || 'No description available'}</p>
                    <div class="mt-2 text-[10px] text-zinc-600 uppercase tracking-tighter">
                      ${new Date(m.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                `))
                .addTo(map.current!);
        });
    };

    const getMoodColor = (mood: string) => {
        switch (mood) {
            case 'romantic': return '#ec4899';
            case 'lonely': return '#60a5fa';
            case 'chill': return '#2dd4bf';
            case 'nostalgic': return '#f59e0b';
            case 'unsafe': return '#ef4444';
            default: return '#ffffff';
        }
    };

    const handleMoodSubmit = async (mood: string, description: string) => {
        if (!user) {
            setIsAuthOpen(true);
            return;
        }

        if (!selectedCoords) return;

        try {
            const { data } = await api.post('/moods', {
                mood,
                description,
                location: {
                    type: 'Point',
                    coordinates: [selectedCoords.lng, selectedCoords.lat]
                }
            });

            if (data.success) {
                setIsModalOpen(false);
                fetchMoods(); // Refresh all markers
            }
        } catch (err: any) {
            console.error('Submission failed:', err);
            if (err.response?.status === 401) {
                setIsAuthOpen(true);
            }
        }
    };

    return (
        <div className="relative w-full h-full">
            <div
                ref={mapContainer}
                className="absolute inset-0 w-full h-full"
            />

            {/* Top Bar Overlay */}
            <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-start pointer-events-none">
                <div className="p-3 bg-black/60 text-white/70 rounded-2xl backdrop-blur-xl text-[10px] uppercase tracking-widest border border-white/10 flex items-center gap-4 pointer-events-auto">
                    <div className="flex flex-col">
                        <span className="text-white/40 mb-0.5">Coordinates</span>
                        <span className="font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                    </div>
                    <div className="h-6 w-[1px] bg-white/10" />
                    <div className="flex items-center gap-3">
                        {user ? (
                            <div className="flex flex-col">
                                <span className="text-white/40 mb-0.5">Explorer</span>
                                <span className="text-pink-500 font-black lowercase">@{user.username}</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAuthOpen(true)}
                                className="px-4 py-2 bg-white text-black text-[10px] font-black rounded-xl hover:bg-zinc-200 transition-all pointer-events-auto"
                            >
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <MoodModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleMoodSubmit}
                lat={selectedCoords?.lat || 0}
                lng={selectedCoords?.lng || 0}
            />

            <AuthOverlay
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onAuthSuccess={(token, user) => setUser(user)}
            />

            {/* CSS for Mapbox Popups */}
            <style jsx global>{`
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 12px !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          border-top-color: #18181b !important;
        }
      `}</style>
        </div>
    );
};

export default Map;

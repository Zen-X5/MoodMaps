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
                console.log('Map Clicked!', e.lngLat);
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

        // Clear existing markers
        const elements = document.getElementsByClassName('mapboxgl-marker');
        while (elements.length > 0) {
            elements[0].parentNode?.removeChild(elements[0]);
        }

        moods.forEach((m) => {
            const color = getMoodColor(m.mood);
            new mapboxgl.Marker({ color })
                .setLngLat(m.location.coordinates)
                .setPopup(new mapboxgl.Popup({ offset: 25, className: 'custom-popup' })
                    .setHTML(`
                  <div style="padding: 4px">
                    <h3 style="font-weight: 800; text-transform: capitalize; margin-bottom: 4px; color: white">${m.mood}</h3>
                    <p style="font-size: 12px; color: #a1a1aa; line-height: 1.2">${m.description || 'No description'}</p>
                    <p style="font-size: 8px; margin-top: 8px; color: #52525b; text-transform: uppercase; font-weight: 700">${new Date(m.createdAt).toLocaleDateString()}</p>
                  </div>
                `))
                .addTo(map.current!);
        });
    };

    const getMoodColor = (mood: string) => {
        switch (mood) {
            case 'romantic': return '#ec4899';
            case 'lonely': return '#3b82f6';
            case 'chill': return '#14b8a6';
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
                fetchMoods();
            }
        } catch (err: any) {
            console.error('Submission failed:', err);
            if (err.response?.status === 401) setIsAuthOpen(true);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div
                ref={mapContainer}
                style={{ position: 'absolute', inset: 0 }}
            />

            {/* Top Bar Overlay */}
            <div className="stats-bar">
                <div>{lat.toFixed(4)}, {lng.toFixed(4)}</div>
                {user ? (
                    <div className="user-tag">@{user.username}</div>
                ) : (
                    <button onClick={() => setIsAuthOpen(true)} className="auth-btn-small">Sign In</button>
                )}
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
        </div>
    );
};

export default Map;

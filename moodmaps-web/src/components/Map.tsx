'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import Atmosphere from './Atmosphere';
import MoodModal from './MoodModal';
import AuthOverlay from './AuthOverlay';
import api from '@/lib/api';
import { io } from 'socket.io-client';

// Replace with your actual Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

const Map: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    // @ts-ignore
    const map = useRef<mapboxgl.Map | null>(null);
    const socketRef = useRef<any>(null);

    const [lng, setLng] = useState(-70.9);
    const [lat, setLat] = useState(42.35);
    const [zoom, setZoom] = useState(9);

    // States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [user, setUser] = useState<any>(null);
    const [dominantMood, setDominantMood] = useState<any>(null);
    const [moods, setMoods] = useState<any[]>([]);
    const [filterMood, setFilterMood] = useState<string | null>(null);
    const [showHeatmap, setShowHeatmap] = useState(false);

    // Socket Initialization
    useEffect(() => {
        socketRef.current = io(SOCKET_URL);

        socketRef.current.on('connect', () => {
            console.log('Connected to socket server');
        });

        socketRef.current.on('new_mood', (newMood: any) => {
            console.log('Real-time mood received:', newMood);
            fetchMoods();
            fetchDominantMood();
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    // Mapbox Heatmap Source & Layer Update
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        const source = map.current.getSource('mood-heatmap') as any;
        if (source) {
            source.setData(convertMoodsToGeoJSON(moods, filterMood));
        }

        // Toggle visibility
        if (map.current.getLayer('mood-heat')) {
            map.current.setLayoutProperty('mood-heat', 'visibility', showHeatmap ? 'visible' : 'none');
        }
    }, [moods, filterMood, showHeatmap]);

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

            map.current.on('style.load', () => {
                if (map.current) setupMapLayers();
            });

            map.current.on('move', () => {
                if (map.current) {
                    setLng(Number(map.current.getCenter().lng.toFixed(4)));
                    setLat(Number(map.current.getCenter().lat.toFixed(4)));
                    setZoom(Number(map.current.getZoom().toFixed(2)));
                }
            });

            map.current.on('moveend', () => {
                if (map.current) fetchDominantMood();
            });

            map.current.on('click', (e: any) => {
                const { lng, lat } = e.lngLat;
                setSelectedCoords({ lat, lng });
                setIsModalOpen(true);
            });

            map.current.on('load', () => {
                if (map.current) {
                    fetchMoods();
                    fetchDominantMood();
                }
            });
        }
    }, [filterMood]);

    const setupMapLayers = () => {
        if (!map.current) return;

        map.current.addSource('mood-source', {
            type: 'geojson',
            data: convertMoodsToGeoJSON([], null),
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
            clusterProperties: {
                'romantic': ['+', ['case', ['==', ['get', 'mood'], 'romantic'], 1, 0]],
                'lonely': ['+', ['case', ['==', ['get', 'mood'], 'lonely'], 1, 0]],
                'chill': ['+', ['case', ['==', ['get', 'mood'], 'chill'], 1, 0]],
                'nostalgic': ['+', ['case', ['==', ['get', 'mood'], 'nostalgic'], 1, 0]],
                'unsafe': ['+', ['case', ['==', ['get', 'mood'], 'unsafe'], 1, 0]],
            }
        });

        // Heatmap Layer (behind markers)
        map.current.addLayer({
            id: 'mood-heat',
            type: 'heatmap',
            source: 'mood-source',
            layout: { visibility: 'none' },
            paint: {
                'heatmap-weight': 1,
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
                'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(33,102,172,0)',
                    0.2, 'rgb(103,169,207)',
                    0.4, 'rgb(209,229,240)',
                    0.6, 'rgb(253,219,199)',
                    0.8, 'rgb(239,138,98)',
                    1, 'rgb(178,24,43)'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
                'heatmap-opacity': 0.8
            }
        }, 'waterway-label');

        map.current.on('render', () => {
            if (!map.current?.isSourceLoaded('mood-source')) return;
            updateMarkers();
        });
    };

    const markersRef = useRef<{ [key: string]: any }>({});

    const updateMarkers = () => {
        if (!map.current) return;

        const newMarkers: { [key: string]: any } = {};
        const features = map.current.querySourceFeatures('mood-source');

        // Note: querySourceFeatures might return duplicates across tiles,
        // but for HTML markers we'll keep it simple for now. 
        // A better way is queryRenderedFeatures but that requires a dummy layer.

        features.forEach((f: any) => {
            const coords = f.geometry.coordinates as [number, number];
            const props = f.properties;
            const id = props.cluster ? `cluster-${props.cluster_id}` : `mood-${props.id}`;

            if (newMarkers[id]) return;

            let marker = markersRef.current[id];

            if (!marker) {
                const el = document.createElement('div');
                if (props.cluster) {
                    el.className = 'cluster-marker';
                    const counts = {
                        romantic: props.romantic,
                        lonely: props.lonely,
                        chill: props.chill,
                        nostalgic: props.nostalgic,
                        unsafe: props.unsafe
                    };
                    const dominantMood = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
                    const emoji = getMoodEmoji(dominantMood);
                    const color = getMoodColor(dominantMood);

                    el.innerHTML = `
                        <div class="cluster-inner" style="border: 3px solid ${color}">
                            <span class="cluster-emoji">${emoji}</span>
                            <span class="cluster-count">${props.point_count}</span>
                        </div>
                    `;
                    el.onclick = () => {
                        const source = map.current?.getSource('mood-source') as any;
                        source.getClusterExpansionZoom(props.cluster_id, (err: any, zoom: number) => {
                            if (err) return;
                            map.current?.easeTo({
                                center: coords,
                                zoom: zoom
                            });
                        });
                    };
                } else {
                    el.className = 'custom-marker-container';
                    const color = getMoodColor(props.mood);
                    const emoji = getMoodEmoji(props.mood);
                    el.innerHTML = `
                        <div class="marker-sticker" style="background: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px ${color}66; border: 2px solid ${color}; cursor: pointer;">
                            ${emoji}
                        </div>
                    `;
                }

                marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map.current!);
            }

            newMarkers[id] = marker;
        });

        // Remove old markers
        for (const id in markersRef.current) {
            if (!newMarkers[id]) {
                markersRef.current[id].remove();
            }
        }
        markersRef.current = newMarkers;
    };

    const convertMoodsToGeoJSON = (moodsList: any[], filter: string | null): any => {
        const filtered = filter ? moodsList.filter(m => m.mood === filter) : moodsList;
        return {
            type: 'FeatureCollection',
            features: filtered.map(m => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: m.location.coordinates
                },
                properties: {
                    mood: m.mood,
                    id: m._id
                }
            }))
        };
    };

    const fetchDominantMood = async () => {
        if (!map.current) return;
        const center = map.current.getCenter();
        try {
            const { data } = await api.get(`/moods/dominant?lat=${center.lat}&lng=${center.lng}&radius=2000`);
            if (data.success) {
                setDominantMood(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch dominant mood:', err);
        }
    };

    const fetchMoods = async () => {
        try {
            const { data } = await api.get('/moods');
            if (data.success) {
                setMoods(data.data);
                if (map.current?.getSource('mood-source')) {
                    (map.current.getSource('mood-source') as any).setData(convertMoodsToGeoJSON(data.data, filterMood));
                }
            }
        } catch (err) {
            console.error('Failed to fetch moods:', err);
        }
    };

    // Helper to get Lucide icon paths/dots (simplifying for static HTML markers)
    const getMoodEmoji = (mood: string) => {
        switch (mood) {
            case 'romantic': return '💖';
            case 'lonely': return '💧';
            case 'chill': return '☕';
            case 'nostalgic': return '⏳';
            case 'unsafe': return '⚠️';
            default: return '📍';
        }
    };

    const renderMarkers = (moodsList: any[], filter: string | null) => {
        if (!map.current) return;

        // Clear existing markers
        const elements = document.getElementsByClassName('mapboxgl-marker');
        while (elements.length > 0) {
            elements[0].parentNode?.removeChild(elements[0]);
        }

        const filtered = filter ? moodsList.filter(m => m.mood === filter) : moodsList;

        filtered.forEach((m) => {
            if (!m.location?.coordinates || m.location.coordinates[0] === 0) return;

            const color = getMoodColor(m.mood);
            const emoji = getMoodEmoji(m.mood);

            // Mapbox Marker Container (handled by Mapbox)
            const el = document.createElement('div');
            el.className = 'custom-marker-container';

            // Inner Sticker (where we apply animations)
            const sticker = document.createElement('div');
            sticker.className = 'marker-sticker';
            sticker.innerHTML = emoji;
            sticker.style.background = 'white';
            sticker.style.width = '32px';
            sticker.style.height = '32px';
            sticker.style.borderRadius = '50%';
            sticker.style.display = 'flex';
            sticker.style.alignItems = 'center';
            sticker.style.justifyContent = 'center';
            sticker.style.fontSize = '18px';
            sticker.style.boxShadow = `0 4px 12px ${color}66`;
            sticker.style.border = `2px solid ${color}`;
            sticker.style.cursor = 'pointer';

            el.appendChild(sticker);

            new mapboxgl.Marker({ element: el })
                .setLngLat(m.location.coordinates)
                .setPopup(new mapboxgl.Popup({ offset: 25, className: 'custom-popup' })
                    .setHTML(`
                  <div style="padding: 4px; color: black">
                    <h3 style="font-weight: 800; text-transform: capitalize; margin-bottom: 4px;">${m.mood} ${emoji}</h3>
                    <p style="font-size: 12px; color: #52525b; line-height: 1.2">${m.description || 'No description'}</p>
                    <p style="font-size: 8px; margin-top: 8px; color: #a1a1aa; text-transform: uppercase; font-weight: 700">${new Date(m.createdAt).toLocaleDateString()}</p>
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
                fetchDominantMood();
            }
        } catch (err: any) {
            console.error('Submission failed:', err);
            if (err.response?.status === 401) setIsAuthOpen(true);
        }
    };

    const moodOptions = ['romantic', 'lonely', 'chill', 'nostalgic', 'unsafe'];

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Background Glow Effect */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: dominantMood ? `radial-gradient(circle at 50% 50%, ${getMoodColor(dominantMood._id)}15 0%, transparent 70%)` : 'transparent',
                    zIndex: 5,
                    pointerEvents: 'none',
                    transition: 'background 2s ease'
                }}
            />

            <div
                ref={mapContainer}
                style={{ position: 'absolute', inset: 0 }}
            />

            {/* Filter Bar */}
            <div className="filter-bar">
                <button
                    className={`filter-item ${showHeatmap ? 'active' : ''}`}
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    title="Toggle Heatmap"
                >
                    🔥
                </button>
                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                <button
                    className={`filter-item ${!filterMood ? 'active' : ''}`}
                    onClick={() => { setFilterMood(null); renderMarkers(moods, null); }}
                >
                    All
                </button>
                {moodOptions.map(mood => (
                    <button
                        key={mood}
                        className={`filter-item ${filterMood === mood ? 'active' : ''}`}
                        onClick={() => { setFilterMood(mood); renderMarkers(moods, mood); }}
                    >
                        {getMoodEmoji(mood)}
                    </button>
                ))}
            </div>

            {/* Top Bar Overlay */}
            <div className="stats-bar">
                <div>{lat.toFixed(4)}, {lng.toFixed(4)}</div>
                {user ? (
                    <div className="user-tag">@{user.username}</div>
                ) : (
                    <button onClick={() => setIsAuthOpen(true)} className="auth-btn-small">Sign In</button>
                )}
            </div>

            {/* Dominant Mood Center Overlay */}
            <AnimatePresence>
                {dominantMood && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 40, x: '-50%' }}
                        className="vibe-overlay"
                        style={{
                            position: 'absolute',
                            bottom: '32px',
                            left: '50%',
                            zIndex: 30,
                            padding: '16px 32px',
                            background: 'rgba(9, 9, 11, 0.8)',
                            backdropFilter: 'blur(24px)',
                            borderRadius: '24px',
                            border: `1px solid ${getMoodColor(dominantMood._id)}44`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            boxShadow: `0 24px 48px rgba(0,0,0,0.5), 0 0 20px ${getMoodColor(dominantMood._id)}22`,
                            pointerEvents: 'auto'
                        }}
                    >
                        <span style={{ fontSize: '10px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 900, marginBottom: '6px' }}>Local Vibe</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '2rem' }}>{getMoodEmoji(dominantMood._id)}</span>
                            <span style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'lowercase', color: 'white', letterSpacing: '-0.02em' }}>{dominantMood._id}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#52525b', marginTop: '6px', fontWeight: 600 }}>Based on {dominantMood.count} unique entries</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <Atmosphere mood={dominantMood?._id} />

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

            {/* CSS for Mapbox Popups and Stickers */}
            <style jsx global>{`
                .mapboxgl-popup-content {
                    background: transparent !important;
                    padding: 0 !important;
                    border-radius: 12px !important;
                    box-shadow: none !important;
                }
                .mapboxgl-popup-tip {
                    border-top-color: #09090b !important;
                }
                .filter-bar {
                    position: absolute;
                    bottom: 120px;
                    right: 20px;
                    z-index: 100;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    background: rgba(9, 9, 11, 0.6);
                    backdrop-filter: blur(20px);
                    padding: 8px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .filter-item {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    border: 1px solid transparent;
                    background: rgba(255, 255, 255, 0.05);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 18px;
                    font-weight: 700;
                }
                .filter-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: scale(1.1);
                }
                .filter-item.active {
                    background: white;
                    color: black;
                    box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
                }
                .custom-marker-container {
                    cursor: pointer;
                    z-index: 10;
                }
                .marker-sticker {
                    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                    animation: marker-float 3s ease-in-out infinite;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
                }
                .marker-sticker:hover {
                    transform: scale(1.4) rotate(8deg) !important;
                    z-index: 100 !important;
                    animation-play-state: paused;
                }
                .cluster-marker {
                    cursor: pointer;
                    z-index: 20;
                }
                .cluster-inner {
                    background: rgba(9, 9, 11, 0.9);
                    backdrop-filter: blur(8px);
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                }
                .cluster-inner:hover {
                    transform: scale(1.2);
                    background: rgba(255, 255, 255, 0.1);
                }
                .cluster-emoji {
                    font-size: 24px;
                }
                .cluster-count {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: white;
                    color: black;
                    font-size: 10px;
                    font-weight: 900;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #09090b;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }
                @keyframes marker-float {
                    0%, 100% { transform: translateY(0) rotate(0); }
                    50% { transform: translateY(-8px) rotate(4deg); }
                }
            `}</style>
        </div>
    );
};

export default Map;

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
// @ts-ignore
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import Atmosphere from './Atmosphere';
import MoodModal from './MoodModal';
import MoodDetailModal from '@/components/MoodDetailModal';
import AuthOverlay from './AuthOverlay';
import api from '@/lib/api';
import { io } from 'socket.io-client';

// Replace with your actual Mapbox token yesss
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5005';
const MIN_DOMINANT_MOOD_RADIUS_METERS = 80;
const MAX_DOMINANT_MOOD_RADIUS_METERS = 500;
const DOMINANT_RADIUS_VIEWPORT_FACTOR = 0.9;
const FORCED_MARKER_REFRESH_MS = 30000;

const Map: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    // @ts-ignore
    const map = useRef<mapboxgl.Map | null>(null);
    const socketRef = useRef<any>(null);
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const watchId = useRef<number | null>(null);
    const isFollowingRef = useRef<boolean>(false);
    const isFlyingRef = useRef<boolean>(false);

    const [lng, setLng] = useState(-70.9);
    const [lat, setLat] = useState(42.35);
    const [zoom, setZoom] = useState(9);

    // States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [spotMoods, setSpotMoods] = useState<any[]>([]);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [dominantMood, setDominantMood] = useState<any>(null);
    const [moods, setMoods] = useState<any[]>([]);
    const [filterMood, setFilterMood] = useState<string | null>(null);
    const [clusterEnabled, setClusterEnabled] = useState(true);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const moodsRef = useRef<any[]>([]);
    const filterMoodRef = useRef<string | null>(null);

    useEffect(() => {
        moodsRef.current = moods;
        filterMoodRef.current = filterMood;
    }, [moods, filterMood]);

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

    // Mapbox Source Update
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        const source = map.current.getSource('mood-source') as any;
        if (source) {
            source.setData(convertMoodsToGeoJSON(moods, filterMood));
        }
    }, [moods, filterMood]);

    // Handle User Location Marker
    useEffect(() => {
        if (!map.current || !userLocation) return;

        if (!userMarkerRef.current) {
            const el = document.createElement('div');
            el.className = 'user-location-container';
            el.innerHTML = `
                <div class="pulse-ring"></div>
                <div class="user-location-marker"></div>
            `;

            userMarkerRef.current = new mapboxgl.Marker({ element: el })
                .setLngLat(userLocation)
                .addTo(map.current);
        } else {
            userMarkerRef.current.setLngLat(userLocation);
        }
    }, [userLocation]);

    // Re-initialize source when clustering is toggled
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        const currentMap = map.current;
        if (currentMap.getSource('mood-source')) {
            // Remove layers first
            if (currentMap.getLayer('mood-dummy')) currentMap.removeLayer('mood-dummy');
            currentMap.removeSource('mood-source');

            setupMapLayers();
            fetchMoods();
        }
    }, [clusterEnabled]);

    useEffect(() => {
        // Load user from storage
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));

        if (map.current || !mapContainer.current) return;

        // Try to get initial location for the map startup
        const startPos: [number, number] = [lng, lat];

        const m = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: startPos,
            zoom: zoom,
            pitch: 39, // <--- 3D Tilt: Change this value to adjust the angle (0-85)
            bearing: 0
        });
        map.current = m;

        // Auto-detect and fly to user location on start
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { longitude, latitude } = position.coords;
                    setUserLocation([longitude, latitude]);
                    m.flyTo({
                        center: [longitude, latitude],
                        zoom: 13,
                        pitch: 45, // Maintain 3D tilt during auto-center
                        duration: 3000,
                        essential: true
                    });
                },
                (err) => console.log('Initial geolocation skipped:', err),
                { timeout: 5000, enableHighAccuracy: false }
            );
        }

        m.on('style.load', () => {
            setupMapLayers();
            // Initial data load
            fetchMoods();
            fetchDominantMood();
        });

        m.on('move', () => {
            setLng(Number(m.getCenter().lng.toFixed(4)));
            setLat(Number(m.getCenter().lat.toFixed(4)));
            setZoom(Number(m.getZoom().toFixed(2)));

            // If user manually drags while following, break follow
            if (isFollowingRef.current && !isFlyingRef.current) {
                setIsFollowing(false);
                isFollowingRef.current = false;
            }
        });

        m.on('moveend', () => {
            fetchDominantMood();
            isFlyingRef.current = false; // Reset flying flag
        });

        m.on('click', (e: any) => {
            const { lng, lat } = e.lngLat;
            setSelectedCoords({ lat, lng });
            setSelectedPlaceName(null);
            resolveAndSetPlaceName(lat, lng);
            setIsModalOpen(true);
        });

        // Remove map.current.on('load') as style.load + manual fetch is more reliable
    }, [filterMood]);

    const setupMapLayers = () => {
        if (!map.current) return;

        map.current.addSource('mood-source', {
            type: 'geojson',
            data: convertMoodsToGeoJSON(moods, filterMood),
            cluster: clusterEnabled,
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

        // Dummy Layer to force source loading
        map.current.addLayer({
            id: 'mood-dummy',
            type: 'circle',
            source: 'mood-source',
            paint: { 'circle-radius': 0, 'circle-opacity': 0 }
        });
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

        features.forEach((f: any, index: number) => {
            const coords = f.geometry.coordinates as [number, number];
            const props = f.properties;
            const isCluster = Boolean(props.cluster);
            const spotState = !isCluster ? getSpotStateFromId(String(props.id || '')) : null;
            const spotMood = spotState?.dominantMood || props.mood;
            const spotCount = spotState?.count ?? Number(props.count || 0);

            const id = isCluster
                ? `cluster-${props.cluster_id}-${props.point_count}`
                : `mood-${props.id}-${spotMood}-${spotCount}`;

            if (newMarkers[id]) return;

            let marker = markersRef.current[id];

            if (!marker) {
                const el = document.createElement('div');
                // Stagger effect for "seeable" splitting
                el.style.animationDelay = `${(index % 20) * 30}ms`;

                if (isCluster) {
                    el.className = 'cluster-marker';
                    const counts = {
                        romantic: Number(props.romantic) || 0,
                        lonely: Number(props.lonely) || 0,
                        chill: Number(props.chill) || 0,
                        nostalgic: Number(props.nostalgic) || 0,
                        unsafe: Number(props.unsafe) || 0
                    };
                    const dominantMood = Object.entries(counts).reduce((a, b: any) => a[1] > b[1] ? a : b)[0];
                    const emoji = getMoodEmoji(dominantMood);
                    const color = getMoodColor(dominantMood);

                    el.innerHTML = `
                        <div class="cluster-inner" style="border: 3px solid ${color}; pointer-events: auto;">
                            <span class="cluster-emoji" style="display: block; pointer-events: none;">${emoji}</span>
                            <span class="cluster-count" style="pointer-events: none;">${props.point_count}</span>
                        </div>
                    `;
                    el.style.pointerEvents = 'auto';
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const source = map.current?.getSource('mood-source') as any;
                        source.getClusterExpansionZoom(props.cluster_id, (err: any, zoom: number) => {
                            if (err) return;
                            map.current?.easeTo({
                                center: coords,
                                zoom: zoom + 0.5,
                                duration: 1000
                            });
                        });
                    });
                } else {
                    el.className = 'custom-marker-container';
                    const color = getMoodColor(spotMood);
                    const emoji = getMoodEmoji(spotMood);
                    const countBadge = spotCount > 1 ? `
                        <div style="position: absolute; top: -6px; right: -6px; background: white; color: black; font-size: 8px; font-weight: 900; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1.5px solid ${color}; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                            ${spotCount}
                        </div>
                    ` : '';

                    el.innerHTML = `
                        <div class="marker-sticker" style="background: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px ${color}66; border: 2px solid ${color}; cursor: pointer; position: relative; pointer-events: auto;">
                            ${emoji}
                            ${countBadge}
                        </div>
                    `;
                    el.style.pointerEvents = 'auto';
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        fetchSpotDetails(coords[1], coords[0]);
                    });
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

    const moodPriority: Record<string, number> = {
        chill: 5,
        romantic: 4,
        nostalgic: 3,
        lonely: 2,
        unsafe: 1,
    };

    const getDominantMoodForSpot = (spotMoods: any[]) => {
        const counts: Record<string, { count: number; latest: number }> = {};

        spotMoods.forEach((entry) => {
            const mood = entry.mood;
            if (!counts[mood]) {
                counts[mood] = { count: 0, latest: 0 };
            }

            const createdAt = entry.createdAt ? new Date(entry.createdAt).getTime() : 0;
            const safeCreatedAt = Number.isNaN(createdAt) ? 0 : createdAt;

            counts[mood].count += 1;
            counts[mood].latest = Math.max(counts[mood].latest, safeCreatedAt);
        });

        const [dominantMood] = Object.entries(counts)
            .sort((a, b) => {
                const [moodA, dataA] = a;
                const [moodB, dataB] = b;

                return (
                    dataB.count - dataA.count ||
                    (moodPriority[moodB] || 0) - (moodPriority[moodA] || 0) ||
                    dataB.latest - dataA.latest
                );
            })[0] || [];

        return dominantMood || 'chill';
    };

    const toSpotKey = (coordinates: [number, number] | number[]) => {
        const lng = Number(coordinates[0]);
        const lat = Number(coordinates[1]);
        return `${lng.toFixed(5)},${lat.toFixed(5)}`;
    };

    const getSpotStateFromId = (spotId: string) => {
        const spotKey = spotId.startsWith('spot-') ? spotId.slice(5) : spotId;
        const spotMoods = moodsRef.current.filter(
            (m: any) => toSpotKey(m.location.coordinates) === spotKey
        );

        if (!spotMoods.length) return null;

        return {
            dominantMood: getDominantMoodForSpot(spotMoods),
            count: spotMoods.length,
        };
    };

    const convertMoodsToGeoJSON = (moodsList: any[], filter: string | null): any => {
        // Group moods by location key
        const spots: { [key: string]: { moods: any[], coordinates: [number, number] } } = {};

        moodsList.forEach(m => {
            const key = toSpotKey(m.location.coordinates);
            if (!spots[key]) {
                spots[key] = { moods: [], coordinates: m.location.coordinates };
            }
            spots[key].moods.push(m);
        });

        return {
            type: 'FeatureCollection',
            features: Object.entries(spots).reduce((acc: any[], [key, spot]) => {
                const dominantMood = getDominantMoodForSpot(spot.moods);

                if (filter && dominantMood !== filter) {
                    return acc;
                }

                acc.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: spot.coordinates
                    },
                    properties: {
                        mood: dominantMood,
                        id: `spot-${key}`,
                        count: spot.moods.length
                    }
                });

                return acc;
            }, [])
        };
    };

    const fetchSpotDetails = async (lat: number, lng: number) => {
        try {
            setSelectedCoords({ lat, lng });
            setSelectedPlaceName(null);
            resolveAndSetPlaceName(lat, lng);

            const { data } = await api.get(`/moods/spot?lat=${lat}&lng=${lng}`);
            if (data.success) {
                setSpotMoods(data.data);
                setIsDetailOpen(true);
            }
        } catch (err) {
            console.error('Failed to fetch spot details:', err);
        }
    };

    const handleCommentSubmit = async (moodId: string, text: string) => {
        if (!user) {
            setIsAuthOpen(true);
            return;
        }

        try {
            const { data } = await api.post(`/moods/${moodId}/comments`, { text });
            if (data.success) {
                // Update local spotMoods state
                setSpotMoods(prev => prev.map(m => m._id === moodId ? data.data : m));
            }
        } catch (err) {
            console.error('Failed to post comment:', err);
        }
    };

    const fetchPlaceNameFromCoords = async (lat: number, lng: number): Promise<string | null> => {
        if (!mapboxgl.accessToken) return null;

        try {
            const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&limit=1`;
            const response = await fetch(endpoint);

            if (!response.ok) return null;

            const payload = await response.json();
            const top = payload?.features?.[0];
            return top?.place_name || top?.text || null;
        } catch (error) {
            console.error('Failed to resolve place name:', error);
            return null;
        }
    };

    const resolveAndSetPlaceName = async (lat: number, lng: number) => {
        const placeName = await fetchPlaceNameFromCoords(lat, lng);
        setSelectedPlaceName(placeName);
    };

    const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const earthRadius = 6371000;

        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    };

    const getAdaptiveDominantRadiusMeters = (currentMap: mapboxgl.Map) => {
        const center = currentMap.getCenter();
        const bounds = currentMap.getBounds();

        if (!bounds) {
            return MAX_DOMINANT_MOOD_RADIUS_METERS;
        }

        const northDistance = getDistanceMeters(center.lat, center.lng, bounds.getNorth(), center.lng);
        const southDistance = getDistanceMeters(center.lat, center.lng, bounds.getSouth(), center.lng);
        const eastDistance = getDistanceMeters(center.lat, center.lng, center.lat, bounds.getEast());
        const westDistance = getDistanceMeters(center.lat, center.lng, center.lat, bounds.getWest());

        const nearestEdgeDistance = Math.min(northDistance, southDistance, eastDistance, westDistance);
        const adaptiveRadius = Math.round(nearestEdgeDistance * DOMINANT_RADIUS_VIEWPORT_FACTOR);

        return Math.max(
            MIN_DOMINANT_MOOD_RADIUS_METERS,
            Math.min(MAX_DOMINANT_MOOD_RADIUS_METERS, adaptiveRadius)
        );
    };

    const fetchDominantMood = async () => {
        if (!map.current) return;
        const center = map.current.getCenter();
        const radius = getAdaptiveDominantRadiusMeters(map.current);

        try {
            const { data } = await api.get(`/moods/dominant?lat=${center.lat}&lng=${center.lng}&radius=${radius}`);
            if (data.success && data.data) {
                setDominantMood(data.data);
            } else {
                setDominantMood(null);
            }
        } catch (err) {
            console.error('Failed to fetch dominant mood:', err);
            setDominantMood(null);
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

    const forceRerenderMarkers = () => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        const source = map.current.getSource('mood-source') as any;
        if (!source) return;

        for (const id in markersRef.current) {
            markersRef.current[id]?.remove?.();
        }
        markersRef.current = {};

        source.setData(convertMoodsToGeoJSON(moodsRef.current, filterMoodRef.current));
        updateMarkers();
    };

    useEffect(() => {
        const timerId = window.setInterval(() => {
            forceRerenderMarkers();
            fetchMoods();
            fetchDominantMood();
        }, FORCED_MARKER_REFRESH_MS);

        return () => {
            window.clearInterval(timerId);
        };
    }, []);

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


    const handleGoToLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        // If already locating, toggle Follow Mode
        if (isLocating) {
            const nextFollow = !isFollowing;
            setIsFollowing(nextFollow);
            isFollowingRef.current = nextFollow;

            if (nextFollow && userLocation && map.current) {
                isFlyingRef.current = true;
                map.current.flyTo({
                    center: userLocation,
                    zoom: 14,
                    pitch: 45, // Maintain 3D tilt during lock-on
                    duration: 1000,
                    essential: true
                });
            }
            return;
        }

        setIsLocating(true);
        setIsFollowing(true);
        isFollowingRef.current = true;

        const success = (position: GeolocationPosition) => {
            const { longitude, latitude } = position.coords;
            const newCoords: [number, number] = [longitude, latitude];
            setUserLocation(newCoords);

            if (map.current && isFollowingRef.current) {
                isFlyingRef.current = true;
                map.current.flyTo({
                    center: newCoords,
                    zoom: 14,
                    pitch: 45, // Maintain 3D tilt during real-time following
                    duration: 1200, // Slightly slower for more natural follow
                    essential: true
                });
            }
        };

        const error = (err: GeolocationPositionError) => {
            console.error('Error getting location:', err);
            setIsLocating(false);
            setIsFollowing(false);
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
            alert('Unable to retrieve your location');
        };

        watchId.current = navigator.geolocation.watchPosition(success, error, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        });
    };

    // Cleanup watch on unmount
    useEffect(() => {
        return () => {
            if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
        };
    }, []);

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

    const handleMoodSubmit = async (mood: string, description: string, rating: number, imageFiles: File[]) => {
        if (!user) {
            setIsAuthOpen(true);
            return;
        }

        if (!selectedCoords) return;

        try {
            const formData = new FormData();
            formData.append('mood', mood);
            formData.append('description', description);
            formData.append('rating', rating.toString());
            formData.append('location', JSON.stringify({
                type: 'Point',
                coordinates: [selectedCoords.lng, selectedCoords.lat]
            }));

            imageFiles.forEach(file => {
                formData.append('images', file);
            });

            const { data } = await api.post('/moods', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (data.success) {
                setIsModalOpen(false);
                fetchMoods();
                fetchDominantMood();
                if (isDetailOpen) {
                    fetchSpotDetails(selectedCoords.lat, selectedCoords.lng);
                }
            }
        } catch (err: any) {
            console.error('Submission failed:', err);
            const errorMsg = err.response?.data?.error || 'Failed to share vibe. Please try again.';
            alert(errorMsg);
            if (err.response?.status === 401) {
                setIsAuthOpen(true);
                handleLogout(); // Clear the bad session
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = io(SOCKET_URL); // Re-init as guest
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
                    className={`filter-item ${clusterEnabled ? 'active' : ''}`}
                    onClick={() => setClusterEnabled(!clusterEnabled)}
                    title="Toggle Clustering"
                >
                    🎯
                </button>
                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                <button
                    className={`filter-item ${!filterMood ? 'active' : ''}`}
                    onClick={() => setFilterMood(null)}
                >
                    All
                </button>
                {moodOptions.map(mood => (
                    <button
                        key={mood}
                        className={`filter-item ${filterMood === mood ? 'active' : ''}`}
                        onClick={() => setFilterMood(mood)}
                    >
                        {getMoodEmoji(mood)}
                    </button>
                ))}
            </div>

            {/* GPS Button */}
            <button
                className={`gps-button ${isLocating ? 'active' : ''} ${isFollowing ? 'following' : ''}`}
                onClick={handleGoToLocation}
                title={isFollowing ? "Stop following" : "Go to current location"}
            >
                <div className="gps-dot-container">
                    <div className="gps-dot-core"></div>
                    <div className="gps-dot-pulse"></div>
                </div>
            </button>

            {/* Top Bar Overlay */}
            <div className="stats-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                </div>
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="user-tag">@{user.username}</div>
                        <button onClick={handleLogout} className="logout-btn" title="Logout">
                            <LogOut size={14} />
                        </button>
                    </div>
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
                placeName={selectedPlaceName}
            />

            <MoodDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                moods={spotMoods}
                placeName={selectedPlaceName}
                onAddMood={() => {
                    setIsDetailOpen(false);
                    setIsModalOpen(true);
                }}
                onAddComment={handleCommentSubmit}
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
                    backdrop-filter: blur(12px);
                    width: 52px;
                    height: 52px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-color 1s ease;
                    box-shadow: 0 12px 32px rgba(0,0,0,0.5);
                    animation: cluster-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                .cluster-inner:hover {
                    transform: scale(1.15) translateY(-4px);
                    background: rgba(255, 255, 255, 0.1);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                }
                .cluster-emoji {
                    font-size: 26px;
                    transition: transform 0.3s ease;
                }
                .cluster-inner:hover .cluster-emoji {
                    transform: scale(1.2);
                }
                .cluster-count {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: white;
                    color: black;
                    font-size: 11px;
                    font-weight: 900;
                    min-width: 22px;
                    height: 22px;
                    padding: 0 4px;
                    border-radius: 11px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #09090b;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                    transition: all 0.3s ease;
                }
                @keyframes marker-float {
                    0%, 100% { transform: translateY(0) rotate(0); }
                    50% { transform: translateY(-8px) rotate(4deg); }
                }
                @keyframes cluster-pop {
                    0% { transform: scale(0.3) rotate(-15deg); opacity: 0; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                .cluster-marker, .custom-marker-container {
                    transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .gps-button {
                    position: absolute;
                    bottom: 32px;
                    left: 20px;
                    z-index: 100;
                    width: 50px;
                    height: 50px;
                    background: rgba(9, 9, 11, 0.6);
                    backdrop-filter: blur(20px);
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .gps-button:hover {
                    transform: scale(1.1) translateY(-2px);
                    background: rgba(255, 255, 255, 0.1);
                    border-color: #3b82f6;
                }
                .gps-button:active {
                    transform: scale(0.95);
                }
                .gps-button.active {
                    border-color: #3b82f6;
                    color: #3b82f6;
                }
                .gps-button.following {
                    background: rgba(59, 130, 246, 0.2);
                    border-color: #3b82f6;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
                }
                .gps-button:active .gps-icon {
                    transform: scale(0.8);
                }
                .gps-dot-container {
                    position: relative;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .gps-dot-core {
                    width: 12px;
                    height: 12px;
                    background: #3b82f6;
                    border-radius: 50%;
                    z-index: 2;
                }
                .gps-dot-pulse {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border: 2px solid #3b82f6;
                    border-radius: 50%;
                    animation: gps-dot-ripple 2s infinite;
                    opacity: 0;
                }
                @keyframes gps-dot-ripple {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                .gps-button.following .gps-dot-core {
                    background: #fff;
                    box-shadow: 0 0 10px #fff;
                }
                .gps-button.following .gps-dot-pulse {
                    border-color: #fff;
                }
                .user-location-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                }
                .user-location-marker {
                    width: 20px;
                    height: 20px;
                    background: #3b82f6;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.8);
                }
                .pulse-ring {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    border: 2px solid #3b82f6;
                    border-radius: 50%;
                    animation: ring-pulse 2s infinite;
                    opacity: 0;
                }
                @keyframes ring-pulse {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(2); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default Map;

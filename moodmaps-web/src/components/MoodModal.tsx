'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, CloudRain, Coffee, History, ShieldAlert } from 'lucide-react';

interface MoodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (mood: string, description: string) => void;
    lat: number;
    lng: number;
}

const moods = [
    { id: 'romantic', label: 'Romantic', icon: Heart, color: '#ec4899' },
    { id: 'lonely', label: 'Lonely', icon: CloudRain, color: '#60a5fa' },
    { id: 'chill', label: 'Chill', icon: Coffee, color: '#2dd4bf' },
    { id: 'nostalgic', label: 'Nostalgic', icon: History, color: '#f59e0b' },
    { id: 'unsafe', label: 'Unsafe', icon: ShieldAlert, color: '#ef4444' },
];

const MoodModal: React.FC<MoodModalProps> = ({ isOpen, onClose, onSubmit, lat, lng }) => {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="modal-backdrop" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="mood-card"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>How's the vibe?</h3>
                            <p style={{ fontSize: '10px', color: '#a1a1aa' }}>{lat.toFixed(4)}, {lng.toFixed(4)}</p>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mood-grid">
                        {moods.map((m) => {
                            const Icon = m.icon;
                            const isSelected = selectedMood === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMood(m.id)}
                                    className={`mood-btn ${isSelected ? 'selected' : ''}`}
                                >
                                    <Icon color={m.color} size={24} />
                                    <span>{m.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', marginBottom: '8px' }}>Description</p>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mood-textarea"
                        placeholder="What makes it feel this way?"
                    />

                    <button
                        disabled={!selectedMood}
                        onClick={() => selectedMood && onSubmit(selectedMood, description)}
                        className="submit-btn"
                        style={{ opacity: selectedMood ? 1 : 0.5 }}
                    >
                        Tag location
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoodModal;

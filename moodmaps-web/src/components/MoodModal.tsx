'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, CloudRain, Coffee, History, ShieldAlert, Star, Plus } from 'lucide-react';

interface MoodModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (mood: string, description: string, rating: number, images: File[]) => void;
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
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [rating, setRating] = useState(5);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...files]);

            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const handleAddImage = () => {
        fileInputRef.current?.click();
    };

    const removeImage = (index: number) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 3000 }}>
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

                    <div style={{ marginBottom: '16px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', marginBottom: '8px' }}>Rating</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    <Star
                                        size={24}
                                        fill={star <= rating ? '#f59e0b' : 'none'}
                                        stroke={star <= rating ? '#f59e0b' : '#3f3f46'}
                                        style={{ transition: 'all 0.2s ease' }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', marginBottom: '8px' }}>Photos</p>
                    <div className="image-upload-grid" style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                        <input
                            type="file"
                            multiple
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={handleAddImage}
                            disabled={isUploading}
                            className="add-image-btn"
                            style={{
                                minWidth: '80px',
                                height: '80px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px dashed rgba(255,255,255,0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                            }}
                        >
                            <Plus size={18} color="#a1a1aa" />
                            <span style={{ fontSize: '10px', color: '#a1a1aa' }}>Add Photo</span>
                        </button>
                        {previews.map((img, idx) => (
                            <div
                                key={idx}
                                style={{
                                    minWidth: '80px',
                                    height: '80px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    flexShrink: 0,
                                    position: 'relative'
                                }}
                            >
                                <img src={img} alt="mood" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                    onClick={() => removeImage(idx)}
                                    style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        background: 'rgba(0,0,0,0.5)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        color: 'white',
                                        width: '18px',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', marginBottom: '8px' }}>Description</p>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="mood-textarea"
                        placeholder="What makes it feel this way?"
                        style={{ marginBottom: '20px' }}
                    />

                    <button
                        disabled={!selectedMood || isUploading}
                        onClick={() => selectedMood && onSubmit(selectedMood, description, rating, imageFiles)}
                        className="submit-btn"
                        style={{ opacity: (selectedMood && !isUploading) ? 1 : 0.5 }}
                    >
                        Share Vibe
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoodModal;

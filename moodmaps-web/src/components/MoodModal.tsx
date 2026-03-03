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
    { id: 'romantic', label: 'Romantic', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/20' },
    { id: 'lonely', label: 'Lonely', icon: CloudRain, color: 'text-blue-400', bg: 'bg-blue-400/20' },
    { id: 'chill', label: 'Chill', icon: Coffee, color: 'text-teal-400', bg: 'bg-teal-400/20' },
    { id: 'nostalgic', label: 'Nostalgic', icon: History, color: 'text-amber-500', bg: 'bg-amber-500/20' },
    { id: 'unsafe', label: 'Unsafe', icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/20' },
];

const MoodModal: React.FC<MoodModalProps> = ({ isOpen, onClose, onSubmit, lat, lng }) => {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white">How's the vibe here?</h3>
                            <p className="text-xs text-zinc-400">
                                {lat.toFixed(4)}, {lng.toFixed(4)}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {moods.map((m) => {
                            const Icon = m.icon;
                            const isSelected = selectedMood === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMood(m.id)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${isSelected
                                            ? `border-zinc-100 ${m.bg}`
                                            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/50'
                                        }`}
                                >
                                    <Icon className={`${m.color} ${isSelected ? 'scale-110' : ''} transition-transform`} size={24} />
                                    <span className="text-[10px] font-medium text-zinc-300">{m.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                            Optional Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell us more about the atmosphere..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none h-24"
                        />
                    </div>

                    <button
                        disabled={!selectedMood}
                        onClick={() => selectedMood && onSubmit(selectedMood, description)}
                        className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        Tag this location
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoodModal;

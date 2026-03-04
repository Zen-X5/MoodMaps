'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, CloudRain, Coffee, History, ShieldAlert, Star, MessageSquare, Plus, ChevronLeft, ChevronRight, User } from 'lucide-react';

interface Comment {
    _id: string;
    userId: {
        _id: string;
        username: string;
    };
    text: string;
    createdAt: string;
}

interface MoodEntry {
    _id: string;
    userId: {
        _id: string;
        username: string;
    };
    mood: string;
    description: string;
    rating: number;
    images: string[];
    comments: Comment[];
    createdAt: string;
}

interface MoodDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    moods: MoodEntry[];
    onAddMood: () => void;
    onAddComment: (moodId: string, text: string) => void;
}

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

const MoodDetailModal: React.FC<MoodDetailModalProps> = ({ isOpen, onClose, moods, onAddMood, onAddComment }) => {
    const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
    const [activeImageIdx, setActiveImageIdx] = useState(0);

    if (!isOpen || moods.length === 0) return null;

    // Aggregate all images
    const allImages = moods.reduce((acc, curr) => [...acc, ...curr.images], [] as string[]);

    const handleCommentSubmit = (moodId: string) => {
        if (!commentText[moodId]?.trim()) return;
        onAddComment(moodId, commentText[moodId]);
        setCommentText({ ...commentText, [moodId]: '' });
    };

    return (
        <AnimatePresence>
            <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 2000 }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    className="mood-detail-card"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header Image / Carousel */}
                    <div className="detail-header-gallery">
                        {allImages.length > 0 ? (
                            <div className="gallery-main">
                                <img src={allImages[activeImageIdx]} alt="Spot" className="gallery-img" />
                                {allImages.length > 1 && (
                                    <>
                                        <button
                                            className="gallery-nav prev"
                                            onClick={() => setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            className="gallery-nav next"
                                            onClick={() => setActiveImageIdx((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                        <div className="gallery-dots">
                                            {allImages.map((_, i) => (
                                                <div key={i} className={`dot ${i === activeImageIdx ? 'active' : ''}`} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="gallery-placeholder">
                                <Plus size={48} color="rgba(255,255,255,0.1)" />
                                <p>No photos yet. Be the first!</p>
                            </div>
                        )}
                        <button className="detail-close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="detail-content">
                        <div className="detail-info-row">
                            <h2 className="detail-title">Spot Vibe</h2>
                            <button className="detail-add-btn" onClick={onAddMood}>
                                <Plus size={16} /> Contribute
                            </button>
                        </div>

                        {/* List of Contributions */}
                        <div className="contributions-list">
                            {moods.map((entry) => (
                                <div key={entry._id} className="entry-card">
                                    <div className="entry-header">
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                <User size={14} />
                                            </div>
                                            <div>
                                                <p className="user-name">{entry.userId.username}</p>
                                                <p className="entry-date">{new Date(entry.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="entry-badge" style={{ background: `${getMoodColor(entry.mood)}22`, color: getMoodColor(entry.mood) }}>
                                            {getMoodEmoji(entry.mood)} {entry.mood}
                                        </div>
                                    </div>

                                    <div className="entry-body">
                                        <div className="entry-rating">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star key={s} size={12} fill={s <= entry.rating ? '#f59e0b' : 'none'} stroke={s <= entry.rating ? '#f59e0b' : '#3f3f46'} />
                                            ))}
                                        </div>
                                        <p className="entry-desc">{entry.description}</p>

                                        {/* Individual Images if they exist */}
                                        {entry.images.length > 0 && (
                                            <div className="entry-images">
                                                {entry.images.map((img, i) => (
                                                    <img key={i} src={img} alt="contributed" className="entry-mini-img" />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Comments Section */}
                                    <div className="comments-section">
                                        {entry.comments?.map((c) => (
                                            <div key={c._id} className="comment-item">
                                                <span className="comment-user">{c.userId.username}:</span>
                                                <span className="comment-text">{c.text}</span>
                                            </div>
                                        ))}
                                        <div className="comment-input-row">
                                            <input
                                                type="text"
                                                placeholder="Ask about this mood..."
                                                className="comment-input"
                                                value={commentText[entry._id] || ''}
                                                onChange={(e) => setCommentText({ ...commentText, [entry._id]: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(entry._id)}
                                            />
                                            <button className="comment-send" onClick={() => handleCommentSubmit(entry._id)}>
                                                <MessageSquare size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <style jsx>{`
                        .mood-detail-card {
                            width: 100%;
                            max-width: 480px;
                            background: rgba(9, 9, 11, 0.9);
                            backdrop-filter: blur(24px);
                            border-radius: 32px;
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            overflow: hidden;
                            max-height: 85vh;
                            display: flex;
                            flex-direction: column;
                            box-shadow: 0 24px 80px rgba(0,0,0,0.8);
                        }
                        .detail-header-gallery {
                            height: 240px;
                            position: relative;
                            background: #000;
                        }
                        .gallery-main {
                            width: 100%;
                            height: 100%;
                            position: relative;
                        }
                        .gallery-img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }
                        .gallery-placeholder {
                            width: 100%;
                            height: 100%;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            color: #52525b;
                            font-size: 14px;
                        }
                        .gallery-nav {
                            position: absolute;
                            top: 50%;
                            transform: translateY(-50%);
                            background: rgba(0,0,0,0.5);
                            border: none;
                            color: white;
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            backdrop-filter: blur(4px);
                        }
                        .gallery-nav.prev { left: 12px; }
                        .gallery-nav.next { right: 12px; }
                        .gallery-dots {
                            position: absolute;
                            bottom: 12px;
                            left: 50%;
                            transform: translateX(-50%);
                            display: flex;
                            gap: 6px;
                        }
                        .dot {
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            background: rgba(255,255,255,0.3);
                        }
                        .dot.active { background: #3b82f6; width: 12px; border-radius: 3px; }
                        .detail-close-btn {
                            position: absolute;
                            top: 16px;
                            right: 16px;
                            background: rgba(0,0,0,0.5);
                            border: none;
                            color: white;
                            width: 32px;
                            height: 32px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                        }
                        .detail-content {
                            padding: 24px;
                            overflow-y: auto;
                            flex: 1;
                        }
                        .detail-info-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 24px;
                        }
                        .detail-title {
                            font-size: 24px;
                            font-weight: 800;
                            color: white;
                        }
                        .detail-add-btn {
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 20px;
                            font-size: 13px;
                            font-weight: 700;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            cursor: pointer;
                        }
                        .contributions-list {
                            display: flex;
                            flex-direction: column;
                            gap: 16px;
                        }
                        .entry-card {
                            background: rgba(255,255,255,0.03);
                            border: 1px solid rgba(255,255,255,0.05);
                            border-radius: 20px;
                            padding: 16px;
                        }
                        .entry-header {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 12px;
                        }
                        .user-info {
                            display: flex;
                            gap: 10px;
                            align-items: center;
                        }
                        .user-avatar {
                            width: 28px;
                            height: 28px;
                            background: #27272a;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #a1a1aa;
                        }
                        .user-name {
                            font-size: 13px;
                            font-weight: 700;
                            color: white;
                        }
                        .entry-date {
                            font-size: 10px;
                            color: #71717a;
                        }
                        .entry-badge {
                            padding: 4px 10px;
                            border-radius: 12px;
                            font-size: 11px;
                            font-weight: 800;
                            text-transform: capitalize;
                        }
                        .entry-body {
                            margin-bottom: 16px;
                        }
                        .entry-rating {
                            display: flex;
                            gap: 2px;
                            margin-bottom: 6px;
                        }
                        .entry-desc {
                            color: #d1d1d6;
                            font-size: 14px;
                            line-height: 1.5;
                        }
                        .entry-images {
                            display: flex;
                            gap: 8px;
                            margin-top: 12px;
                        }
                        .entry-mini-img {
                            width: 60px;
                            height: 60px;
                            border-radius: 8px;
                            object-fit: cover;
                        }
                        .comments-section {
                            border-top: 1px solid rgba(255,255,255,0.05);
                            padding-top: 12px;
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                        }
                        .comment-item {
                            font-size: 12px;
                        }
                        .comment-user {
                            font-weight: 700;
                            color: #3b82f6;
                            margin-right: 6px;
                        }
                        .comment-text {
                            color: #a1a1aa;
                        }
                        .comment-input-row {
                            display: flex;
                            gap: 8px;
                            background: rgba(255,255,255,0.05);
                            border-radius: 20px;
                            padding: 4px 12px;
                            margin-top: 8px;
                        }
                        .comment-input {
                            background: none;
                            border: none;
                            color: white;
                            font-size: 12px;
                            flex: 1;
                            outline: none;
                        }
                        .comment-send {
                            background: none;
                            border: none;
                            color: #3b82f6;
                            cursor: pointer;
                        }
                    `}</style>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoodDetailModal;

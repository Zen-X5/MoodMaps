'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, CloudRain, Coffee, History, ShieldAlert, Star, MessageSquare, Plus, ChevronLeft, ChevronRight, User, TrendingUp } from 'lucide-react';

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

    // Calculate Statistics
    const stats = useMemo(() => {
        if (!moods.length) return null;

        const counts: { [key: string]: number } = {};
        let totalRating = 0;

        moods.forEach(m => {
            counts[m.mood] = (counts[m.mood] || 0) + 1;
            totalRating += m.rating;
        });

        const totalEntries = moods.length;
        const dominant = Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        const avgRating = totalRating / totalEntries;

        return {
            counts,
            totalEntries,
            dominant,
            avgRating
        };
    }, [moods]);

    if (!isOpen || moods.length === 0 || !stats) return null;

    // Aggregate all images
    const allImages = moods.reduce((acc, curr) => [...acc, ...curr.images], [] as string[]);

    const handleCommentSubmit = (moodId: string) => {
        if (!commentText[moodId]?.trim()) return;
        onAddComment(moodId, commentText[moodId]);
        setCommentText({ ...commentText, [moodId]: '' });
    };

    const moodOptions = ['romantic', 'lonely', 'chill', 'nostalgic', 'unsafe'];

    return (
        <AnimatePresence>
            <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 3000 }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    className="mood-detail-card"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Centered Dominant Mood Header */}
                    <div className="new-modal-header">
                        <div className="header-vibe-center">
                            <div className="dominant-sticker pulse" style={{ background: getMoodColor(stats.dominant) }}>
                                {getMoodEmoji(stats.dominant)}
                            </div>
                            <h2 className="dominant-title" style={{ color: getMoodColor(stats.dominant) }}>
                                {stats.dominant.toUpperCase()}
                            </h2>
                            <span className="stats-label">Dominant Vibe</span>
                        </div>
                        <button className="detail-close-btn" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="detail-scroll-container">
                        {/* Gallery Section */}
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
                                    <div className="placeholder-content">
                                        <p>Vibe Check</p>
                                        <span style={{ color: '#71717a', fontSize: '10px' }}>No photos captured yet</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Distribution Section */}
                        <div className="stats-section-compact">
                            <div className="distribution-container">
                                <div className="distribution-bar">
                                    {moodOptions.map(mood => {
                                        const count = stats.counts[mood] || 0;
                                        if (count === 0) return null;
                                        const width = (count / stats.totalEntries) * 100;
                                        return (
                                            <div
                                                key={mood}
                                                className="dist-segment"
                                                style={{ width: `${width}%`, backgroundColor: getMoodColor(mood) }}
                                                title={`${mood}: ${count} votes`}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="distribution-legend-row">
                                    {moodOptions.map(mood => {
                                        const count = stats.counts[mood] || 0;
                                        if (count === 0) return null;
                                        return (
                                            <div key={mood} className="legend-item-pill" style={{ border: `1px solid ${getMoodColor(mood)}33` }}>
                                                <span className="pill-emoji">{getMoodEmoji(mood)}</span>
                                                <span className="pill-count">{count}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="total-pill">
                                        {stats.totalEntries} Total
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Separate Div for Timeline/Comments */}
                        <div className="timeline-section-wrapper">
                            <div className="detail-info-row">
                                <h3 className="section-title">Timeline</h3>
                                <button className="detail-add-btn" onClick={onAddMood}>
                                    <Plus size={14} /> Share Vibe
                                </button>
                            </div>

                            <div className="contributions-list">
                                {moods.map((entry) => (
                                    <div key={entry._id} className="entry-card">
                                        <div className="entry-header">
                                            <div className="user-info">
                                                <div className="user-avatar" style={{ border: `1px solid ${getMoodColor(entry.mood)}44` }}>
                                                    <User size={14} />
                                                </div>
                                                <div>
                                                    <p className="user-name">@{entry.userId.username}</p>
                                                    <p className="entry-date">{new Date(entry.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="entry-badge" style={{ background: `${getMoodColor(entry.mood)}15`, border: `1px solid ${getMoodColor(entry.mood)}33`, color: getMoodColor(entry.mood) }}>
                                                {getMoodEmoji(entry.mood)} {entry.mood}
                                            </div>
                                        </div>

                                        <div className="entry-body">
                                            <div className="entry-rating">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} size={10} fill={s <= entry.rating ? '#f59e0b' : 'none'} stroke={s <= entry.rating ? '#f59e0b' : '#3f3f46'} />
                                                ))}
                                            </div>
                                            <p className="entry-desc">{entry.description}</p>

                                            {entry.images.length > 0 && (
                                                <div className="entry-images">
                                                    {entry.images.map((img, i) => (
                                                        <img key={i} src={img} alt="contributed" className="entry-mini-img" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="comments-section">
                                            <div className="comments-scroll-area">
                                                {entry.comments?.map((c) => (
                                                    <div key={c._id} className="comment-item">
                                                        <span className="comment-user">{c.userId.username}</span>
                                                        <span className="comment-text">{c.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="comment-input-row">
                                                <input
                                                    type="text"
                                                    placeholder="Ask about this vibe..."
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
                    </div>

                    <style jsx>{`
                        .mood-detail-card {
                            width: 100%;
                            max-width: 500px;
                            height: 300px;
                            background: #121214;
                            border-radius: 28px;
                            border: 1px solid rgba(255, 255, 255, 0.08);
                            overflow: hidden;
                            display: flex;
                            flex-direction: column;
                            box-shadow: 0 40px 120px rgba(0,0,0,1);
                        }
                        
                        /* New Header Style */
                        .new-modal-header {
                            padding: 16px 24px 12px;
                            position: relative;
                            display: flex;
                            justify-content: center;
                            background: linear-gradient(to bottom, rgba(255,255,255,0.02), transparent);
                        }
                        .header-vibe-center {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 6px;
                        }
                        .dominant-title {
                            font-size: 24px;
                            font-weight: 900;
                            letter-spacing: -1px;
                        }
                        .stats-label {
                            font-size: 8px;
                            color: #71717a;
                            text-transform: uppercase;
                            letter-spacing: 1.5px;
                            font-weight: 800;
                        }
                        .detail-close-btn {
                            position: absolute;
                            top: 20px;
                            right: 24px;
                            background: rgba(255,255,255,0.03);
                            border: 1px solid rgba(255,255,255,0.05);
                            color: #52525b;
                            width: 32px;
                            height: 32px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            transition: all 0.2s;
                        }
                        .detail-close-btn:hover {
                            background: rgba(255,255,255,0.08);
                            color: white;
                        }

                        /* Content Scrolling */
                        .detail-scroll-container {
                            flex: 1;
                            overflow-y: auto;
                            padding: 0 24px 24px;
                        }
                        .detail-scroll-container::-webkit-scrollbar {
                            width: 6px;
                        }
                        .detail-scroll-container::-webkit-scrollbar-thumb {
                            background: rgba(255, 255, 255, 0.05);
                            border-radius: 3px;
                        }

                        /* Gallery */
                        .detail-header-gallery {
                            height: 120px;
                            border-radius: 20px;
                            overflow: hidden;
                            background: #000;
                            margin-bottom: 16px;
                            border: 1px solid rgba(255,255,255,0.05);
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
                            align-items: center;
                            justify-content: center;
                            background: #09090b;
                        }
                        .placeholder-content {
                            text-align: center;
                            color: #3f3f46;
                            font-weight: 800;
                        }
                        .gallery-nav {
                            position: absolute;
                            top: 50%;
                            transform: translateY(-50%);
                            background: rgba(0,0,0,0.4);
                            border: none;
                            color: white;
                            width: 32px;
                            height: 32px;
                            border-radius: 50%;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            backdrop-filter: blur(8px);
                        }
                        .gallery-nav.prev { left: 12px; }
                        .gallery-nav.next { right: 12px; }
                        .gallery-dots {
                            position: absolute;
                            bottom: 12px;
                            left: 50%;
                            transform: translateX(-50%);
                            display: flex;
                            gap: 4px;
                        }
                        .dot {
                            width: 4px;
                            height: 4px;
                            border-radius: 50%;
                            background: rgba(255,255,255,0.2);
                        }
                        .dot.active { background: #fff; width: 12px; border-radius: 2px; }

                        /* Stats Section */
                        .stats-section-compact {
                            margin-bottom: 16px;
                        }
                        .distribution-bar {
                            height: 6px;
                            width: 100%;
                            border-radius: 3px;
                            overflow: hidden;
                            display: flex;
                            background: #18181b;
                            margin-bottom: 12px;
                        }
                        .dist-segment {
                            height: 100%;
                            transition: width 1s;
                        }
                        .distribution-legend-row {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 8px;
                            align-items: center;
                        }
                        .legend-item-pill {
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            background: rgba(255,255,255,0.02);
                            padding: 4px 10px;
                            border-radius: 100px;
                        }
                        .pill-emoji { font-size: 14px; }
                        .pill-count { font-size: 11px; font-weight: 800; color: white; }
                        .total-pill {
                            font-size: 10px;
                            font-weight: 800;
                            color: #52525b;
                            text-transform: uppercase;
                            margin-left: auto;
                        }

                        /* Wrapped Timeline Section */
                        .timeline-section-wrapper {
                            background: rgba(255,255,255,0.02);
                            border: 1px solid rgba(255,255,255,0.05);
                            border-radius: 24px;
                            padding: 20px;
                        }
                        .detail-info-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 16px;
                        }
                        .section-title {
                            font-size: 12px;
                            font-weight: 900;
                            color: #a1a1aa;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        .detail-add-btn {
                            background: white;
                            color: black;
                            border: none;
                            padding: 6px 14px;
                            border-radius: 100px;
                            font-size: 11px;
                            font-weight: 900;
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
                            background: rgba(0,0,0,0.2);
                            border: 1px solid rgba(255,255,255,0.03);
                            border-radius: 16px;
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
                            background: #18181b;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #a1a1aa;
                        }
                        .user-name { font-size: 12px; font-weight: 800; color: white; }
                        .entry-date { font-size: 9px; color: #52525b; }
                        .entry-badge {
                            padding: 4px 10px;
                            border-radius: 10px;
                            font-size: 10px;
                            font-weight: 900;
                        }
                        .entry-body { margin-bottom: 16px; }
                        .entry-rating { display: flex; gap: 2px; margin-bottom: 6px; }
                        .entry-desc { color: #a1a1aa; font-size: 13px; line-height: 1.5; }
                        .entry-images {
                            display: flex;
                            gap: 8px;
                            margin-top: 12px;
                        }
                        .entry-mini-img {
                            width: 48px;
                            height: 48px;
                            border-radius: 8px;
                            object-fit: cover;
                        }

                        .comments-section {
                            border-top: 1px solid rgba(255,255,255,0.05);
                            padding-top: 12px;
                        }
                        .comments-scroll-area {
                            max-height: 100px;
                            overflow-y: auto;
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                        }
                        .comment-item { font-size: 11px; }
                        .comment-user { font-weight: 800; color: #a1a1aa; margin-right: 8px; }
                        .comment-text { color: #71717a; }
                        .comment-input-row {
                            display: flex;
                            gap: 10px;
                            background: rgba(0,0,0,0.3);
                            border-radius: 12px;
                            padding: 8px 14px;
                            margin-top: 12px;
                            border: 1px solid rgba(255,255,255,0.03);
                        }
                        .comment-input {
                            background: none;
                            border: none;
                            color: white;
                            font-size: 12px;
                            flex: 1;
                            outline: none;
                        }
                        .comment-send { background: none; border: none; color: #3b82f6; cursor: pointer; }
                        
                        .dominant-sticker {
                            width: 48px;
                            height: 48px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 24px;
                            box-shadow: 0 0 20px rgba(255,255,255,0.1);
                        }
                        .pulse {
                            animation: pulse-glow 2s infinite;
                        }
                        @keyframes pulse-glow {
                            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.1); }
                            70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255,255,255,0); }
                            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
                        }
                    `}</style>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoodDetailModal;

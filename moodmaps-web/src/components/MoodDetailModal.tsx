'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, MessageSquare, Plus, ChevronLeft, ChevronRight, User } from 'lucide-react';

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
    placeName?: string | null;
    onAddMood: () => void;
    onAddComment: (moodId: string, text: string) => void;
}

const moodOrder = ['romantic', 'lonely', 'chill', 'nostalgic', 'unsafe'];

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

const MoodDetailModal: React.FC<MoodDetailModalProps> = ({ isOpen, onClose, moods, placeName, onAddMood, onAddComment }) => {
    const [commentText, setCommentText] = useState<Record<string, string>>({});
    const [activeImageIdx, setActiveImageIdx] = useState(0);

    const stats = useMemo(() => {
        if (!moods.length) return null;

        const counts = moods.reduce<Record<string, number>>((acc, mood) => {
            acc[mood.mood] = (acc[mood.mood] || 0) + 1;
            return acc;
        }, {});

        const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || moods[0].mood;
        const totalEntries = moods.length;
        const avgRating = moods.reduce((sum, mood) => sum + mood.rating, 0) / totalEntries;

        return { counts, dominant, totalEntries, avgRating };
    }, [moods]);

    const allImages = useMemo(() => moods.flatMap((mood) => mood.images || []), [moods]);

    useEffect(() => {
        if (allImages.length === 0) {
            setActiveImageIdx(0);
            return;
        }

        if (activeImageIdx > allImages.length - 1) {
            setActiveImageIdx(0);
        }
    }, [activeImageIdx, allImages.length]);

    if (!isOpen || !moods.length || !stats) return null;

    const handleCommentSubmit = (moodId: string) => {
        const text = (commentText[moodId] || '').trim();
        if (!text) return;
        onAddComment(moodId, text);
        setCommentText((prev) => ({ ...prev, [moodId]: '' }));
    };

    const goPrevImage = () => {
        setActiveImageIdx((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
    };

    const goNextImage = () => {
        setActiveImageIdx((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
    };

    return (
        <AnimatePresence>
            <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 3000 }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.22 }}
                    className="mood-detail-card-v3"
                    onClick={(event) => event.stopPropagation()}
                >
                    <header className="modal-header-v3">
                        <div className="dominant-wrap">
                            <div className="dominant-emoji" style={{ background: getMoodColor(stats.dominant) }}>
                                {getMoodEmoji(stats.dominant)}
                            </div>
                            <div>
                                <p className="dominant-label">Dominant Mood</p>
                                <h2 className="dominant-title" style={{ color: getMoodColor(stats.dominant) }}>
                                    {stats.dominant}
                                </h2>
                                {placeName && <p className="dominant-place">{placeName}</p>}
                            </div>
                        </div>

                        <button className="close-btn" onClick={onClose} aria-label="Close mood details modal">
                            <X size={18} />
                        </button>
                    </header>

                    <div className="modal-body-v3">
                        <section className="gallery-section-v3">
                            {allImages.length > 0 ? (
                                <div className="gallery-shell-v3">
                                    <img
                                        src={allImages[activeImageIdx]}
                                        alt={`Mood image ${activeImageIdx + 1}`}
                                        className="gallery-image-v3"
                                    />

                                    {allImages.length > 1 && (
                                        <>
                                            <button className="gallery-nav prev" onClick={goPrevImage} aria-label="Previous image">
                                                <ChevronLeft size={18} />
                                            </button>
                                            <button className="gallery-nav next" onClick={goNextImage} aria-label="Next image">
                                                <ChevronRight size={18} />
                                            </button>

                                            <div className="gallery-dots">
                                                {allImages.map((_, index) => (
                                                    <button
                                                        key={index}
                                                        className={`dot ${index === activeImageIdx ? 'active' : ''}`}
                                                        onClick={() => setActiveImageIdx(index)}
                                                        aria-label={`Go to image ${index + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="gallery-empty-v3">No photos for this spot yet</div>
                            )}
                        </section>

                        <section className="counts-section-v3">
                            <div className="counts-grid-v3">
                                {moodOrder.map((mood) => (
                                    <div key={mood} className="count-chip-v3" style={{ borderColor: `${getMoodColor(mood)}44` }}>
                                        <span className="count-chip-emoji">{getMoodEmoji(mood)}</span>
                                        <span className="count-chip-name">{mood}</span>
                                        <span className="count-chip-value">{stats.counts[mood] || 0}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="count-summary-v3">
                                <span>{stats.totalEntries} total entries</span>
                                <span>★ {stats.avgRating.toFixed(1)} avg rating</span>
                            </div>
                        </section>

                        <section className="action-section-v3">
                            <button className="add-edit-btn-v3" onClick={onAddMood}>
                                <Plus size={14} /> Add / Edit Mood
                            </button>
                        </section>

                        <section className="thread-shell-v3">
                            <div className="thread-header-v3">
                                <h3>Timeline • Replies • Ratings</h3>
                            </div>

                            <div className="thread-scroll-v3">
                                {moods.map((entry) => (
                                    <article key={entry._id} className="entry-card-v3">
                                        <div className="entry-top-v3">
                                            <div className="user-wrap-v3">
                                                <div className="avatar-v3" style={{ borderColor: `${getMoodColor(entry.mood)}55` }}>
                                                    <User size={13} />
                                                </div>
                                                <div>
                                                    <p className="username-v3">@{entry.userId.username}</p>
                                                    <p className="entry-date-v3">{new Date(entry.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            <div className="mood-pill-v3" style={{ color: getMoodColor(entry.mood), borderColor: `${getMoodColor(entry.mood)}55` }}>
                                                {getMoodEmoji(entry.mood)} {entry.mood}
                                            </div>
                                        </div>

                                        <div className="rating-row-v3">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={11}
                                                    fill={star <= entry.rating ? '#f59e0b' : 'none'}
                                                    stroke={star <= entry.rating ? '#f59e0b' : '#3f3f46'}
                                                />
                                            ))}
                                        </div>

                                        <p className="entry-desc-v3">{entry.description || 'No description provided.'}</p>

                                        {entry.images.length > 0 && (
                                            <div className="entry-images-v3">
                                                {entry.images.map((image, index) => (
                                                    <img key={index} src={image} alt={`Entry image ${index + 1}`} className="entry-image-v3" />
                                                ))}
                                            </div>
                                        )}

                                        <div className="comments-shell-v3">
                                            <div className="comments-list-v3">
                                                {(entry.comments || []).map((comment) => (
                                                    <div key={comment._id} className="comment-item-v3">
                                                        <span className="comment-user-v3">{comment.userId.username}</span>
                                                        <span className="comment-text-v3">{comment.text}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="comment-input-row-v3">
                                                <input
                                                    type="text"
                                                    className="comment-input-v3"
                                                    placeholder="Ask about this vibe..."
                                                    value={commentText[entry._id] || ''}
                                                    onChange={(event) => {
                                                        const value = event.target.value;
                                                        setCommentText((prev) => ({ ...prev, [entry._id]: value }));
                                                    }}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') {
                                                            event.preventDefault();
                                                            handleCommentSubmit(entry._id);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    className="comment-send-v3"
                                                    onClick={() => handleCommentSubmit(entry._id)}
                                                    aria-label="Send comment"
                                                >
                                                    <MessageSquare size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>

                    <style jsx>{`
                        .mood-detail-card-v3 {
                            width: min(98vw, 1200px);
                            height: 675px;
                            max-height: calc(100vh - 32px);
                            background: #121214;
                            border-radius: 24px;
                            border: 1px solid rgba(255, 255, 255, 0.08);
                            box-shadow: 0 40px 120px rgba(0, 0, 0, 1);
                            overflow: hidden;
                            display: flex;
                            flex-direction: column;
                        }

                        .modal-header-v3 {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 10px 14px;
                            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                            background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%);
                        }

                        .dominant-wrap {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }

                        .dominant-emoji {
                            width: 34px;
                            height: 34px;
                            border-radius: 999px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 18px;
                            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
                        }

                        .dominant-label {
                            font-size: 9px;
                            text-transform: uppercase;
                            letter-spacing: 0.14em;
                            color: #71717a;
                            font-weight: 800;
                        }

                        .dominant-title {
                            font-size: 18px;
                            font-weight: 900;
                            text-transform: capitalize;
                            letter-spacing: -0.02em;
                        }

                        .dominant-place {
                            font-size: 10px;
                            color: #71717a;
                            margin-top: 2px;
                            max-width: 540px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }

                        .close-btn {
                            width: 30px;
                            height: 30px;
                            border-radius: 999px;
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            background: rgba(255, 255, 255, 0.03);
                            color: #a1a1aa;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        }

                        .close-btn:hover {
                            color: #ffffff;
                            background: rgba(255, 255, 255, 0.08);
                        }

                        .modal-body-v3 {
                            flex: 1;
                            min-height: 0;
                            padding: 8px 14px 12px;
                            display: flex;
                            flex-direction: column;
                            gap: 8px;
                        }

                        .gallery-section-v3 {
                            flex-shrink: 0;
                        }

                        .gallery-shell-v3 {
                            position: relative;
                            height: 150px;
                            border-radius: 16px;
                            overflow: hidden;
                            border: 1px solid rgba(255, 255, 255, 0.08);
                            background: #0b0b0f;
                        }

                        .gallery-image-v3 {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }

                        .gallery-empty-v3 {
                            height: 120px;
                            border-radius: 16px;
                            border: 1px dashed rgba(255, 255, 255, 0.15);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #71717a;
                            font-weight: 700;
                            font-size: 12px;
                        }

                        .gallery-nav {
                            position: absolute;
                            top: 50%;
                            transform: translateY(-50%);
                            width: 32px;
                            height: 32px;
                            border-radius: 999px;
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            background: rgba(0, 0, 0, 0.45);
                            color: #fff;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                        }

                        .gallery-nav.prev {
                            left: 10px;
                        }

                        .gallery-nav.next {
                            right: 10px;
                        }

                        .gallery-dots {
                            position: absolute;
                            bottom: 10px;
                            left: 50%;
                            transform: translateX(-50%);
                            display: flex;
                            gap: 6px;
                        }

                        .dot {
                            width: 6px;
                            height: 6px;
                            border-radius: 999px;
                            border: none;
                            background: rgba(255, 255, 255, 0.35);
                            padding: 0;
                            cursor: pointer;
                        }

                        .dot.active {
                            width: 14px;
                            background: #ffffff;
                        }

                        .counts-section-v3 {
                            flex-shrink: 0;
                            border: 1px solid rgba(255, 255, 255, 0.06);
                            border-radius: 14px;
                            padding: 6px;
                            background: rgba(255, 255, 255, 0.02);
                        }

                        .counts-grid-v3 {
                            display: grid;
                            grid-template-columns: repeat(5, minmax(0, 1fr));
                            gap: 6px;
                        }

                        .count-chip-v3 {
                            border: 1px solid;
                            border-radius: 12px;
                            padding: 5px;
                            display: flex;
                            align-items: center;
                            gap: 4px;
                            background: rgba(0, 0, 0, 0.2);
                        }

                        .count-chip-emoji {
                            font-size: 14px;
                        }

                        .count-chip-name {
                            font-size: 9px;
                            text-transform: capitalize;
                            color: #a1a1aa;
                            font-weight: 700;
                            flex: 1;
                            min-width: 0;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                        }

                        .count-chip-value {
                            font-size: 11px;
                            font-weight: 900;
                            color: #ffffff;
                        }

                        .count-summary-v3 {
                            margin-top: 6px;
                            display: flex;
                            justify-content: space-between;
                            font-size: 10px;
                            color: #a1a1aa;
                            text-transform: uppercase;
                            font-weight: 700;
                        }

                        .action-section-v3 {
                            flex-shrink: 0;
                        }

                        .add-edit-btn-v3 {
                            border: none;
                            border-radius: 999px;
                            padding: 7px 12px;
                            background: #ffffff;
                            color: #000000;
                            font-size: 11px;
                            font-weight: 900;
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            cursor: pointer;
                        }

                        .thread-shell-v3 {
                            flex: 0 0 300px;
                            height: 300px;
                            min-height: 300px;
                            border: 1px solid rgba(255, 255, 255, 0.06);
                            border-radius: 16px;
                            background: rgba(255, 255, 255, 0.02);
                            padding: 8px;
                            display: flex;
                            flex-direction: column;
                        }

                        .thread-header-v3 {
                            margin-bottom: 8px;
                            flex-shrink: 0;
                        }

                        .thread-header-v3 h3 {
                            font-size: 11px;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                            color: #a1a1aa;
                            font-weight: 900;
                        }

                        .thread-scroll-v3 {
                            flex: 1;
                            min-height: 0;
                            overflow-y: scroll;
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                            padding-right: 4px;
                            scrollbar-gutter: stable;
                        }

                        .thread-scroll-v3::-webkit-scrollbar {
                            width: 6px;
                        }

                        .thread-scroll-v3::-webkit-scrollbar-thumb {
                            background: rgba(255, 255, 255, 0.12);
                            border-radius: 999px;
                        }

                        .entry-card-v3 {
                            border-radius: 14px;
                            border: 1px solid rgba(255, 255, 255, 0.06);
                            background: rgba(0, 0, 0, 0.28);
                            padding: 10px;
                        }

                        .entry-top-v3 {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 8px;
                        }

                        .user-wrap-v3 {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            min-width: 0;
                        }

                        .avatar-v3 {
                            width: 28px;
                            height: 28px;
                            border-radius: 999px;
                            border: 1px solid;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #a1a1aa;
                            background: rgba(255, 255, 255, 0.03);
                            flex-shrink: 0;
                        }

                        .username-v3 {
                            font-size: 12px;
                            color: #ffffff;
                            font-weight: 800;
                        }

                        .entry-date-v3 {
                            font-size: 10px;
                            color: #71717a;
                        }

                        .mood-pill-v3 {
                            border: 1px solid;
                            border-radius: 999px;
                            padding: 4px 9px;
                            font-size: 10px;
                            font-weight: 900;
                            text-transform: capitalize;
                            white-space: nowrap;
                        }

                        .rating-row-v3 {
                            margin-top: 6px;
                            display: flex;
                            gap: 2px;
                        }

                        .entry-desc-v3 {
                            margin-top: 5px;
                            font-size: 12px;
                            color: #d4d4d8;
                            line-height: 1.4;
                            word-break: break-word;
                        }

                        .entry-images-v3 {
                            margin-top: 8px;
                            display: flex;
                            gap: 6px;
                            overflow-x: auto;
                            padding-bottom: 2px;
                        }

                        .entry-image-v3 {
                            width: 46px;
                            height: 46px;
                            border-radius: 8px;
                            object-fit: cover;
                            flex-shrink: 0;
                        }

                        .comments-shell-v3 {
                            margin-top: 8px;
                            padding-top: 8px;
                            border-top: 1px solid rgba(255, 255, 255, 0.06);
                        }

                        .comments-list-v3 {
                            max-height: 64px;
                            overflow-y: auto;
                            display: flex;
                            flex-direction: column;
                            gap: 6px;
                            padding-right: 2px;
                        }

                        .comment-item-v3 {
                            font-size: 11px;
                            line-height: 1.35;
                        }

                        .comment-user-v3 {
                            color: #ffffff;
                            font-weight: 800;
                            margin-right: 7px;
                        }

                        .comment-text-v3 {
                            color: #a1a1aa;
                        }

                        .comment-input-row-v3 {
                            margin-top: 6px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            border-radius: 12px;
                            border: 1px solid rgba(255, 255, 255, 0.08);
                            background: rgba(0, 0, 0, 0.25);
                            padding: 6px 9px;
                        }

                        .comment-input-v3 {
                            flex: 1;
                            min-width: 0;
                            border: none;
                            background: transparent;
                            color: #ffffff;
                            font-size: 11px;
                            outline: none;
                        }

                        .comment-send-v3 {
                            border: none;
                            background: transparent;
                            color: #3b82f6;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            padding: 0;
                        }

                        @media (max-width: 900px) {
                            .counts-grid-v3 {
                                grid-template-columns: repeat(3, minmax(0, 1fr));
                            }
                        }

                        @media (max-width: 768px) {
                            .mood-detail-card-v3 {
                                width: min(96vw, 720px);
                                height: 675px;
                                max-height: calc(100vh - 24px);
                            }

                            .modal-body-v3 {
                                padding: 10px 14px 14px;
                                gap: 10px;
                            }

                            .gallery-shell-v3 {
                                height: 160px;
                            }

                            .thread-shell-v3 {
                                flex: 0 0 280px;
                                height: 280px;
                                min-height: 280px;
                            }

                            .counts-grid-v3 {
                                grid-template-columns: repeat(2, minmax(0, 1fr));
                            }

                            .count-summary-v3 {
                                flex-direction: column;
                                gap: 4px;
                            }
                        }
                    `}</style>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default MoodDetailModal;

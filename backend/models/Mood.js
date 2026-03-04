const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const moodSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
        },
        coordinates: {
            type: [Number],
            required: true,
        },
    },
    mood: {
        type: String,
        required: [true, 'Please select a mood'],
        enum: ['romantic', 'lonely', 'chill', 'nostalgic', 'unsafe'],
    },
    description: {
        type: String,
        maxLength: [500, 'Description cannot be more than 500 characters'],
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
    },
    images: {
        type: [String], // Array of image URLs/paths
        default: []
    },
    comments: [commentSchema],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for geo-spatial queries
moodSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Mood', moodSchema);

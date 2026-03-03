const mongoose = require('mongoose');

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
        maxLength: [200, 'Description cannot be more than 200 characters'],
    },
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

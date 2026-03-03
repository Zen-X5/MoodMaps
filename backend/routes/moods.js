const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get all moods
// @route   GET /api/moods
// @access  Public
router.get('/', async (req, res) => {
    try {
        const moods = await Mood.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: moods.length, data: moods });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @desc    Submit a mood
// @route   POST /api/moods
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { location, mood, description } = req.body;
        const userId = req.user.id;

        if (!location || !mood) {
            return res.status(400).json({ success: false, error: 'Please provide all required fields' });
        }

        // One mood per user per location
        const existingMood = await Mood.findOne({
            userId,
            'location.coordinates': location.coordinates,
        });

        if (existingMood) {
            // Update existing mood instead of creating new one
            existingMood.mood = mood;
            existingMood.description = description;
            existingMood.updatedAt = Date.now();
            await existingMood.save();
            return res.status(200).json({ success: true, data: existingMood, updated: true });
        }

        const newMood = await Mood.create({
            userId,
            location,
            mood,
            description,
        });

        res.status(201).json({ success: true, data: newMood });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;

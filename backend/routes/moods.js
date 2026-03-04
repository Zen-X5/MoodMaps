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

            // Emit socket event
            req.io.emit('new_mood', existingMood);

            return res.status(200).json({ success: true, data: existingMood, updated: true });
        }

        const newMood = await Mood.create({
            userId,
            location,
            mood,
            description,
        });

        // Emit socket event
        req.io.emit('new_mood', newMood);

        res.status(201).json({ success: true, data: newMood });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// @desc    Get dominant mood for a location
// @route   GET /api/moods/dominant
// @access  Public
router.get('/dominant', async (req, res) => {
    try {
        const { lat, lng, radius = 500 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, error: 'Please provide coordinates' });
        }

        const point = {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
        };

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        const moods = await Mood.aggregate([
            {
                $geoNear: {
                    near: point,
                    distanceField: "distance",
                    maxDistance: parseFloat(radius),
                    spherical: true
                }
            },
            {
                $addFields: {
                    weight: {
                        $cond: [
                            { $gt: ["$createdAt", oneDayAgo] },
                            2.0, // New moods = Double weight
                            {
                                $cond: [
                                    { $gt: ["$createdAt", sevenDaysAgo] },
                                    1.0, // Recent moods = Base weight
                                    0.5  // Old moods = Half weight
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$mood",
                    score: { $sum: "$weight" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { score: -1 } },
            { $limit: 1 }
        ]);

        res.status(200).json({
            success: true,
            data: moods.length > 0 ? moods[0] : null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Aggregation Error' });
    }
});

module.exports = router;

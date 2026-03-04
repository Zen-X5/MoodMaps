const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary');

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
router.post('/', protect, upload.array('images', 5), async (req, res) => {
    try {
        let { location, mood, description, rating } = req.body;
        const userId = req.user.id;

        // Since it's FormData, location might be a string
        if (typeof location === 'string') {
            location = JSON.parse(location);
        }

        if (!location || !mood) {
            return res.status(400).json({ success: false, error: 'Please provide all required fields' });
        }

        const uploadedImages = req.files ? req.files.map(file => file.path) : [];

        // Check if user already has a mood at this EXACT coordinate
        const existingMood = await Mood.findOne({
            userId,
            'location.coordinates': location.coordinates,
        });

        if (existingMood) {
            // Update existing mood with new data
            existingMood.mood = mood;
            existingMood.description = description;
            existingMood.rating = rating || existingMood.rating;
            if (uploadedImages.length > 0) {
                existingMood.images = [...new Set([...existingMood.images, ...uploadedImages])];
            }
            existingMood.updatedAt = Date.now();
            await existingMood.save();

            const populatedMood = await Mood.findById(existingMood._id).populate('userId', 'username');
            req.io.emit('new_mood', populatedMood);

            return res.status(200).json({ success: true, data: populatedMood, updated: true });
        }

        const newMood = await Mood.create({
            userId,
            location,
            mood,
            description,
            rating: rating || 5,
            images: uploadedImages
        });

        const populatedNewMood = await Mood.findById(newMood._id).populate('userId', 'username');
        req.io.emit('new_mood', populatedNewMood);

        res.status(201).json({ success: true, data: populatedNewMood });
    } catch (err) {
        console.error(err);
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
                $group: {
                    _id: "$mood",
                    count: { $sum: 1 },
                    latestAt: { $max: "$createdAt" }
                }
            },
            {
                $addFields: {
                    priority: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$_id", "chill"] }, then: 5 },
                                { case: { $eq: ["$_id", "romantic"] }, then: 4 },
                                { case: { $eq: ["$_id", "nostalgic"] }, then: 3 },
                                { case: { $eq: ["$_id", "lonely"] }, then: 2 },
                                { case: { $eq: ["$_id", "unsafe"] }, then: 1 },
                            ],
                            default: 0
                        }
                    }
                }
            },
            { $sort: { count: -1, priority: -1, latestAt: -1 } },
            {
                $project: {
                    _id: 1,
                    count: 1
                }
            },
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

// @desc    Get all moods at a specific "Spot" (coordinates)
// @route   GET /api/moods/spot
// @access  Public
router.get('/spot', async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, error: 'Please provide coordinates' });
        }

        const moods = await Mood.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: 2 // 2 meters to be safe with tile precision
                }
            }
        })
            .populate('userId', 'username')
            .populate('comments.userId', 'username')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: moods.length,
            data: moods
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @desc    Add a comment to a mood
// @route   POST /api/moods/:id/comments
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
    try {
        const mood = await Mood.findById(req.params.id);
        if (!mood) return res.status(404).json({ success: false, error: 'Mood not found' });

        const newComment = {
            userId: req.user.id,
            text: req.body.text
        };

        mood.comments.unshift(newComment);
        await mood.save();

        const populatedMood = await Mood.findById(mood._id)
            .populate('userId', 'username')
            .populate('comments.userId', 'username');

        req.io.emit('new_comment', { moodId: mood._id, comment: newComment });

        res.status(201).json({ success: true, data: populatedMood });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;

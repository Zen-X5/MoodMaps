const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const http = require('http');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Pass IO to request object so routes can use it
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Route files
const emotions = require('./routes/moods');
const auth = require('./routes/auth');

// Mount routers
app.use('/api/moods', emotions);
app.use('/api/auth', auth);

// Basic Route
app.get('/', (req, res) => {
    res.send('MoodMaps API is running with WebSockets...');
});

// Socket logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Database Connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });

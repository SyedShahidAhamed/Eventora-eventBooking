
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');

const app = express();

// Allowed frontend origins
const allowedOrigins = [
    'https://eventora-event-booking.vercel.app',
    process.env.CLIENT_URL,
    'http://localhost:5173'
].filter(Boolean);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
}));

app.use(express.json({ limit: '4mb' }));

// Health check
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Eventora backend is running!',
        database: mongoose.connection.readyState === 1
            ? 'connected'
            : 'not connected'
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        database: mongoose.connection.readyState === 1
            ? 'connected'
            : 'not connected'
    });
});

// MongoDB connection caching for Vercel
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = {
        conn: null,
        promise: null
    };
}

async function connectDB(req, res, next) {
    try {
        if (mongoose.connection.readyState === 1) {
            return next();
        }

        const mongoURI = process.env.MONGO_URI;

        if (!mongoURI) {
            throw new Error('MONGO_URI is missing in environment variables');
        }

        if (!cached.promise) {
            cached.promise = mongoose.connect(mongoURI, {
                serverSelectionTimeoutMS: 15000,
                connectTimeoutMS: 15000,
                socketTimeoutMS: 45000,
                maxPoolSize: 10
            })
            .then((connection) => {
                cached.conn = connection;
                console.log('MongoDB Connected Successfully');
                return connection;
            })
            .catch((error) => {
                cached.promise = null;
                cached.conn = null;
                throw error;
            });
        }

        await cached.promise;

        if (mongoose.connection.readyState !== 1) {
            cached.promise = null;
            throw new Error('MongoDB connection was lost');
        }

        next();

    } catch (error) {
        console.error(
            'MongoDB Connection Error:',
            error.name,
            error.message
        );

        return res.status(503).json({
            message: 'Database is temporarily unavailable. Please try again.'
        });
    }
}

// Connect database before API requests
app.use('/api', connectDB);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

// Unknown API route
app.use('/api', (req, res) => {
    res.status(404).json({
        message: 'API endpoint not found'
    });
});

// Local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Vercel export
module.exports = app;

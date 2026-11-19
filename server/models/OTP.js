
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },

    otp: {
        type: String,
        required: true
    },

    action: {
        type: String,
        enum: ['account_verification', 'event_booking'],
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    expiresAt: {
        type: Date,
        required: true
    }
});

// Set expiry based on OTP purpose
otpSchema.pre('validate', function () {
    if (!this.expiresAt) {
        const expiryDuration =
            this.action === 'event_booking'
                ? 10 * 60 * 1000
                : 5 * 60 * 1000;

        this.expiresAt = new Date(
            (this.createdAt || new Date()).getTime() + expiryDuration
        );
    }
});

// Automatically delete expired OTP documents
otpSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

module.exports = mongoose.model('OTP', otpSchema);

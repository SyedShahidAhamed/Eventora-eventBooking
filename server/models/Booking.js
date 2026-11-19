const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    status: { type: String, enum: ['confirmed', 'cancelled', 'pending'], default: 'pending' },
    paymentStatus: { type: String, enum: ['paid', 'not_paid'], default: 'not_paid' },
    quantity: { type: Number, min: 1, max: 5, default: 1, required: true },
    amount: { type: Number, required: true },
    paymentProof: { type: String, default: null },
    paymentProofUploadedAt: { type: Date, default: null },
    ticketCode: { type: String, unique: true, sparse: true, index: true },
    ticketStatus: { type: String, enum: ['not_issued', 'valid', 'used', 'revoked'], default: 'not_issued' },
    ticketIssuedAt: Date,
    ticketUsedAt: Date,
    bookedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);

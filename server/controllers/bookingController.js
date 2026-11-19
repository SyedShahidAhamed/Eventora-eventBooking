
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const OTP = require('../models/OTP');
const { sendBookingEmail, sendOTPEmail } = require('../utils/email');

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const MAX_TICKETS_PER_USER_PER_EVENT = 5;
const MAX_PROOF_LENGTH = 3_000_000;

// Send booking OTP
exports.sendBookingOTP = async (req, res) => {
    try {
        if (req.user?.role === 'admin') {
            return res.status(403).json({
                message: 'Admin accounts cannot request booking OTPs. Please use an attendee account.'
            });
        }

        const otp = generateOTP();

        await OTP.findOneAndDelete({
            email: req.user.email,
            action: 'event_booking'
        });

        await OTP.create({
            email: req.user.email,
            otp,
            action: 'event_booking'
        });

        await sendOTPEmail(
            req.user.email,
            otp,
            'event_booking'
        );

        res.json({
            message: 'OTP sent successfully. Valid for 10 minutes.'
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error sending OTP',
            error: error.message
        });
    }
};


// Submit event booking
exports.bookEvent = async (req, res) => {
    try {
        if (req.user?.role === 'admin') {
            return res.status(403).json({
                message: 'Admin accounts cannot book tickets. Please use an attendee account.'
            });
        }

        const { eventId, otp } = req.body;

        const quantity = Number(req.body.quantity || 1);

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > MAX_TICKETS_PER_USER_PER_EVENT
        ) {
            return res.status(400).json({
                message: 'You can book between 1 and 5 tickets per event.'
            });
        }

        // Verify booking OTP: expires after 10 minutes
        const validOTP = await OTP.findOne({
            email: req.user.email,
            otp,
            action: 'event_booking',
            expiresAt: { $gt: new Date() }
        });

        if (!validOTP) {
            return res.status(400).json({
                message: 'Invalid or expired OTP. Please request a new OTP.'
            });
        }

        const event = await Event.findById(eventId)
            .select('ticketPrice availableSeats');

        if (!event) {
            return res.status(404).json({
                message: 'Event not found'
            });
        }

        if (event.availableSeats < quantity) {
            return res.status(400).json({
                message: `Only ${event.availableSeats} seats are currently available.`
            });
        }

        // Check maximum tickets per user per event
        const previousBookings = await Booking.find({
            userId: req.user.id,
            eventId,
            status: { $ne: 'cancelled' }
        }).select('quantity').lean();

        const alreadyRequested = previousBookings.reduce(
            (sum, item) => sum + (item.quantity || 1),
            0
        );

        if (alreadyRequested + quantity > MAX_TICKETS_PER_USER_PER_EVENT) {
            return res.status(400).json({
                message: `Maximum 5 tickets per event. You already have ${alreadyRequested} active ticket(s).`
            });
        }

        const price = Number(event.ticketPrice || 0);

        let paymentProof = null;

        // Validate payment screenshot for paid events
        if (price > 0) {
            paymentProof = String(req.body.paymentProof || '');

            if (
                !/^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(paymentProof)
            ) {
                return res.status(400).json({
                    message: 'Please upload your UPI payment screenshot.'
                });
            }

            if (paymentProof.length > MAX_PROOF_LENGTH) {
                return res.status(413).json({
                    message: 'Payment screenshot is too large. Please upload a smaller image.'
                });
            }
        }

        // Create booking request
        const booking = await Booking.create({
            userId: req.user.id,
            eventId,
            status: 'pending',
            paymentStatus: 'not_paid',
            quantity,
            amount: price * quantity,
            paymentProof,
            paymentProofUploadedAt: paymentProof ? new Date() : null
        });

        // Delete OTP after successful booking
        await OTP.deleteOne({
            _id: validOTP._id
        });

        res.status(201).json({
            message: 'Booking request submitted. Admin will review your payment.',
            booking: {
                _id: booking._id,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
                quantity,
                amount: booking.amount
            }
        });

    } catch (error) {
        res.status(500).json({
            message: 'Server Error',
            error: error.message
        });
    }
};


// Admin confirms booking and generates digital ticket
exports.confirmBooking = async (req, res) => {
    let seatReserved = false;
    let reservedQuantity = 0;
    let eventIdForRollback = null;

    try {
        const { paymentStatus = 'not_paid' } = req.body;

        if (!['paid', 'not_paid'].includes(paymentStatus)) {
            return res.status(400).json({
                message: 'Invalid payment status'
            });
        }

        const current = await Booking.findById(req.params.id)
            .select('status eventId userId quantity paymentProof');

        if (!current) {
            return res.status(404).json({
                message: 'Booking not found'
            });
        }

        if (current.status !== 'pending') {
            return res.status(409).json({
                message: 'Only pending bookings can be approved'
            });
        }

        const event = await Event.findById(current.eventId)
            .select('ticketPrice');

        if (!event) {
            return res.status(404).json({
                message: 'Event not found'
            });
        }

        if (
            Number(event.ticketPrice) > 0 &&
            paymentStatus === 'paid' &&
            !current.paymentProof
        ) {
            return res.status(400).json({
                message: 'This paid booking has no payment screenshot to review.'
            });
        }

        reservedQuantity = current.quantity || 1;
        eventIdForRollback = current.eventId;

        const seatUpdate = await Event.updateOne(
            {
                _id: current.eventId,
                availableSeats: { $gte: reservedQuantity }
            },
            {
                $inc: { availableSeats: -reservedQuantity }
            }
        );

        if (seatUpdate.modifiedCount !== 1) {
            return res.status(400).json({
                message: 'Not enough seats remain to approve this booking.'
            });
        }

        seatReserved = true;

        // Generate unique ticket code
        const ticketCode = crypto.randomBytes(32).toString('hex');

        const booking = await Booking.findOneAndUpdate(
            {
                _id: req.params.id,
                status: 'pending'
            },
            {
                $set: {
                    status: 'confirmed',
                    paymentStatus,
                    ticketCode,
                    ticketStatus: 'valid',
                    ticketIssuedAt: new Date()
                }
            },
            {
                new: true,
                runValidators: true
            }
        )
            .select('-paymentProof')
            .populate('userId', 'name email')
            .populate('eventId', 'title date location');

        if (!booking) {
            await Event.updateOne(
                { _id: current.eventId },
                { $inc: { availableSeats: reservedQuantity } }
            );

            seatReserved = false;

            return res.status(409).json({
                message: 'Booking was already processed by another admin'
            });
        }

        seatReserved = false;

        res.json({
            message: 'Booking confirmed successfully. Digital ticket issued.',
            booking
        });

        // Send ticket email
        setImmediate(() => {
            sendBookingEmail(
                booking.userId.email,
                booking.userId.name,
                booking.eventId.title,
                {
                    date: booking.eventId.date,
                    location: booking.eventId.location,
                    quantity: booking.quantity || 1,
                    amount: booking.amount
                },
                booking.ticketCode
            ).catch(error =>
                console.error(
                    'Ticket email failed; ticket remains in dashboard:',
                    error
                )
            );
        });

    } catch (error) {
        if (seatReserved && eventIdForRollback) {
            try {
                await Event.updateOne(
                    { _id: eventIdForRollback },
                    { $inc: { availableSeats: reservedQuantity } }
                );
            } catch (rollbackError) {
                console.error('Seat rollback failed:', rollbackError);
            }
        }

        if (!res.headersSent) {
            res.status(500).json({
                message: 'Server Error',
                error: error.message
            });
        }
    }
};


// Get payment screenshot
exports.getPaymentProof = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .select('paymentProof');

        if (!booking || !booking.paymentProof) {
            return res.status(404).json({
                message: 'Payment screenshot not found.'
            });
        }

        const match = booking.paymentProof.match(
            /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/
        );

        if (!match) {
            return res.status(400).json({
                message: 'Stored payment screenshot is invalid.'
            });
        }

        res.set(
            'Content-Type',
            match[1] === 'image/jpg' ? 'image/jpeg' : match[1]
        );

        res.set('Cache-Control', 'private, no-store');

        return res.send(Buffer.from(match[2], 'base64'));

    } catch (error) {
        res.status(500).json({
            message: 'Unable to load payment screenshot.',
            error: error.message
        });
    }
};


// Scan and verify ticket
exports.scanTicket = async (req, res) => {
    try {
        const ticketCode = String(req.body.ticketCode || '').trim();

        if (!/^[a-f0-9]{64}$/i.test(ticketCode)) {
            return res.status(400).json({
                valid: false,
                message: 'Invalid QR ticket'
            });
        }

        const booking = await Booking.findOneAndUpdate(
            {
                ticketCode,
                status: 'confirmed',
                ticketStatus: 'valid'
            },
            {
                $set: {
                    ticketStatus: 'used',
                    ticketUsedAt: new Date()
                }
            },
            {
                new: true
            }
        )
            .populate('userId', 'name email')
            .populate('eventId', 'title date location');

        if (booking) {
            return res.json({
                valid: true,
                message: 'Ticket verified. Entry allowed.',
                attendee: booking.userId?.name,
                event: booking.eventId?.title,
                quantity: booking.quantity || 1,
                ticketStatus: booking.ticketStatus,
                usedAt: booking.ticketUsedAt
            });
        }

        const existing = await Booking.findOne({ ticketCode })
            .select('status ticketStatus');

        if (!existing) {
            return res.status(404).json({
                valid: false,
                message: 'Ticket not found. Entry denied.'
            });
        }

        if (existing.ticketStatus === 'used') {
            return res.status(409).json({
                valid: false,
                alreadyUsed: true,
                message: 'This ticket has already been used. Entry denied.'
            });
        }

        return res.status(400).json({
            valid: false,
            message: 'This ticket is not valid for entry.'
        });

    } catch (error) {
        res.status(500).json({
            valid: false,
            message: 'Server Error',
            error: error.message
        });
    }
};


// Get user bookings
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = req.user.role === 'admin'
            ? await Booking.find()
                .select('-paymentProof')
                .populate('eventId')
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .lean()
            : await Booking.find({ userId: req.user.id })
                .select('-paymentProof')
                .populate('eventId')
                .sort({ createdAt: -1 })
                .lean();

        res.json(bookings);

    } catch (error) {
        res.status(500).json({
            message: 'Server Error',
            error: error.message
        });
    }
};


// Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const filter = req.user.role === 'admin'
            ? {
                _id: req.params.id,
                status: { $in: ['pending', 'confirmed'] }
            }
            : {
                _id: req.params.id,
                userId: req.user.id,
                status: { $in: ['pending', 'confirmed'] },
                ticketStatus: { $ne: 'used' }
            };

        const booking = await Booking.findOne(filter)
            .select('status eventId ticketStatus quantity');

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found, already cancelled, or not eligible for cancellation'
            });
        }

        if (booking.ticketStatus === 'used') {
            return res.status(400).json({
                message: 'This ticket has already been used and cannot be cancelled'
            });
        }

        const wasConfirmed = booking.status === 'confirmed';

        const updated = await Booking.findOneAndUpdate(
            {
                _id: booking._id,
                status: booking.status
            },
            {
                $set: {
                    status: 'cancelled',
                    ...(booking.ticketStatus === 'valid'
                        ? { ticketStatus: 'revoked' }
                        : {})
                }
            },
            {
                new: true
            }
        );

        if (!updated) {
            return res.status(409).json({
                message: 'Booking was updated by another request. Refresh and try again.'
            });
        }

        if (wasConfirmed) {
            await Event.updateOne(
                { _id: booking.eventId },
                { $inc: { availableSeats: booking.quantity || 1 } }
            );
        }

        res.json({
            message: 'Booking cancelled successfully'
        });

    } catch (error) {
        res.status(500).json({
            message: 'Server Error',
            error: error.message
        });
    }
};

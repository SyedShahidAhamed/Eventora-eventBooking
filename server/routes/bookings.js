const express = require('express');
const router = express.Router();
const {
    bookEvent, confirmBooking, getMyBookings, cancelBooking,
    sendBookingOTP, scanTicket, getPaymentProof
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/auth');

router.post('/send-otp', protect, sendBookingOTP);
router.post('/', protect, bookEvent);
router.get('/my', protect, getMyBookings);
router.get('/:id/payment-proof', protect, admin, getPaymentProof);
router.put('/:id/confirm', protect, admin, confirmBooking);
router.post('/scan', protect, admin, scanTicket);
router.delete('/:id', protect, cancelBooking);
module.exports = router;

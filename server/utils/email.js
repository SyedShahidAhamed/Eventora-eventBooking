const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const QRCode = require('qrcode');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

// Send a branded confirmation email with the unique QR ticket embedded inline.
const sendBookingEmail = async (userEmail, userName, eventTitle, eventDetails = {}, ticketCode) => {
    const qrBuffer = await QRCode.toBuffer(ticketCode, {
        type: 'png', errorCorrectionLevel: 'H', width: 320, margin: 2
    });
    const dateText = eventDetails.date ? new Date(eventDetails.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'See event details in Eventora';
    const location = eventDetails.location || 'See event details in Eventora';
    const bannerPath = path.join(__dirname, '../assets/eventora-email-banner.jpg');

    const mailOptions = {
        from: `"Eventora" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `Booking Confirmed: ${eventTitle}`,
        attachments: [
            { filename: 'eventora-banner.jpg', path: bannerPath, cid: 'eventoraBanner' },
            { filename: `eventora-ticket-${ticketCode.slice(0, 8)}.png`, content: qrBuffer, contentType: 'image/png', cid: 'eventoraTicketQR' }
        ],
        html: `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#080b14;font-family:Arial,sans-serif;color:#e5e7eb">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#111827;border-radius:12px;overflow:hidden">
        <tr><td><img src="cid:eventoraBanner" alt="Eventora" width="600" style="display:block;width:100%;height:auto;border:0"></td></tr>
        <tr><td align="center" style="padding:22px 20px 8px"><div style="font-size:25px;font-weight:bold;letter-spacing:3px;color:#fff">EVENTORA</div>
        <h1 style="font-size:25px;color:#fff;margin:18px 0 8px">Booking Confirmed!</h1><p style="color:#cbd5e1;margin:0">Your next experience awaits.</p></td></tr>
        <tr><td style="padding:18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1f2937;border-radius:12px"><tr><td style="padding:22px">
        <span style="display:inline-block;background:#064e3b;color:#4ade80;padding:6px 10px;border-radius:20px;font-size:12px;font-weight:bold">✓ BOOKING CONFIRMED</span>
        <h2 style="color:#fff;font-size:21px;margin:18px 0 12px">${escapeHTML(eventTitle)}</h2>
        <p style="color:#d1d5db;line-height:1.6">Hi <strong>${escapeHTML(userName)}</strong>, your booking has been approved. We are excited to have you join us!</p>
        <p style="color:#e5e7eb;line-height:1.7;margin-bottom:4px"><strong>Event date:</strong> ${escapeHTML(dateText)}<br><strong>Location:</strong> ${escapeHTML(location)}<br><strong>Tickets:</strong> ${Number(eventDetails.quantity || 1)}<br><strong>Total amount:</strong> ₹${Number(eventDetails.amount || 0).toLocaleString('en-IN')}</p>
        <hr style="border:0;border-top:1px solid #374151;margin:20px 0">
        <h3 style="color:#fff;text-align:center;margin:0 0 8px">Your Digital Ticket</h3><p style="color:#cbd5e1;text-align:center;font-size:13px">Show this QR code at the event entrance. This QR represents all ${Number(eventDetails.quantity || 1)} ticket(s) in this booking.</p>
        <div style="text-align:center;background:#fff;padding:14px;border-radius:10px;margin:14px auto;max-width:340px"><img src="cid:eventoraTicketQR" width="280" height="280" alt="Eventora QR ticket" style="display:block;width:100%;max-width:280px;height:auto;margin:auto"></div>
        <p style="color:#cbd5e1;text-align:center;font-size:12px">Ticket ID: ${escapeHTML(ticketCode.slice(0, 12).toUpperCase())}</p>
        <p style="color:#cbd5e1;font-size:13px;text-align:center">The QR ticket is also attached as a PNG image.</p>
        </td></tr></table></td></tr>
        <tr><td align="center" style="padding:18px 20px 26px"><div style="color:#fff;font-weight:bold;letter-spacing:2px">EVENTORA</div><p style="color:#94a3b8;font-size:12px;margin:8px 0">Discover. Book. Experience.</p><p style="color:#64748b;font-size:11px">© ${new Date().getFullYear()} Eventora. All rights reserved.</p></td></tr>
        </table></td></tr></table></body></html>`
    };
    return transporter.sendMail(mailOptions);
};

// Keep existing OTP email behaviour and template.
const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const title = type === 'account_verification' ? 'Verify your Eventora Account' : 'Eventora Booking Verification';
        const msg = type === 'account_verification'
            ? 'Please use the following OTP to verify your new Eventora account.'
            : 'Please use the following OTP to verify and confirm your event booking.';
        await transporter.sendMail({
            from: `"Eventora" <${process.env.EMAIL_USER}>`, to: userEmail, subject: title,
            html: `<div style="font-family:Arial,sans-serif;text-align:center;padding:20px"><h2 style="color:#111">${escapeHTML(title)}</h2><p style="color:#555;font-size:16px">${escapeHTML(msg)}</p><div style="margin:20px auto;padding:15px;font-size:24px;font-weight:bold;background:#f4f4f4;width:max-content;letter-spacing:5px">${escapeHTML(otp)}</div><p style="color:#999;font-size:12px">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p><strong>EVENTORA</strong></div>`
        });
        console.log(`OTP sent to ${userEmail} for ${type}`);
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
};

module.exports = { sendBookingEmail, sendOTPEmail };

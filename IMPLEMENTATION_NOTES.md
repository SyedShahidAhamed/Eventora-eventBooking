# Eventora QR tickets, fast admin actions and sample events

## What changed
- `server/models/Booking.js`: stores a random 256-bit ticket token and ticket lifecycle status.
- `server/controllers/bookingController.js`: approval reserves a seat atomically, issues the token, responds without waiting for Gmail, and sends the branded ticket email after the response. Scanner verifies and atomically consumes a ticket. Rejection/cancellation restores a reserved seat only for confirmed bookings.
- `server/routes/bookings.js`: adds admin-only `POST /api/bookings/scan`.
- `server/utils/email.js`: preserves OTP email and sends a branded confirmation email with inline banner and QR image plus QR PNG attachment.
- `server/assets/eventora-email-banner.jpg`: banner used by the email.
- `client/src/components/DigitalTicket.jsx`: dashboard QR display/download.
- `client/src/components/TicketScanner.jsx`: admin camera scanner.
- `client/src/pages/UserDashboard.jsx`: shows tickets for confirmed bookings.
- `client/src/pages/AdminDashboard.jsx`: scanner, manual code entry, and quick UI updates while the dashboard refreshes in the background.
- `server/seedEvents.js`: adds eight extra events without deleting existing records.

## Install
From `server`: `npm install qrcode`
From `client`: `npm install qrcode html5-qrcode`

## Configure email
Keep `EMAIL_USER`, `EMAIL_PASS`, and `MONGO_URI` in server `.env`. The banner is bundled at `server/assets/eventora-email-banner.jpg`; no public image URL is required.

## Add more events safely
From `server`: `npm run seed:events`
This script does not run the original destructive `seed.js` and does not delete users, bookings or existing events.

## Important
- QR camera access requires HTTPS in production (localhost is allowed during development).
- Existing confirmed bookings do not automatically have ticket codes. New approvals issue tickets. A migration can be written if you need tickets for old confirmed bookings.
- The approval endpoint returns before SMTP sends the email. The email is attempted in the running Node process; for production reliability across restarts, use a persistent job queue (e.g. BullMQ/Redis) or an outbox worker.
- QR tokens are secrets; do not log or expose the full token except in the QR itself.


## Latest paid-booking and admin dashboard updates

- Paid event booking now generates a UPI intent QR using `VITE_UPI_ID` and the selected quantity total.
- Users upload a compressed payment screenshot with the existing email OTP-verified booking request.
- Booking records store `quantity`, `paymentProof`, and `paymentProofUploadedAt`.
- Server-side validation limits each user to 5 active (non-cancelled) tickets per event.
- Admin can view uploaded payment screenshots from the Booking Requests tab before approving as paid.
- Admin dashboard defaults to the All Events tab and switches to Booking Requests when selected.
- Approval reserves the full requested quantity in one atomic seat update; cancellation restores that quantity.
- A single digital QR represents the entire booking quantity and is scanned once for group entry.
- Payment screenshots are stored as compressed data URLs in MongoDB. For larger-scale production, move image storage to object storage such as Cloudinary or S3.
- UPI screenshot review is manual; this application does not independently verify bank settlement.


## Full-screen payment checkout update

- Event detail now sends the booking OTP and opens `/events/:id/payment` as a dedicated full-screen checkout route.
- Checkout shows the event and ticket summary, OTP field, compressed payment screenshot upload, and UPI QR panel.
- Payment-app wordmarks continuously scroll right-to-left above the QR scanner area; the animation pauses on hover and respects reduced-motion preferences.
- The close button returns to the event detail page.
- The checkout submits to the existing `POST /api/bookings` endpoint. Existing OTP validation, pending booking creation, screenshot storage, seat reservation on admin approval, and admin payment-proof review remain unchanged.
- UPI settlement is still not verified automatically: admins must review the uploaded screenshot, as before.

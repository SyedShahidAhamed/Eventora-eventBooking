
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const QRCode = require('qrcode');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Your uploaded GitHub banner
const bannerPath = path.join(
    __dirname,
    '../assets/Eventora.png.png'
);

const escapeHTML = (value = '') =>
    String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);

const emailFooter = `
<tr>
    <td align="center" style="padding:28px 20px;background:#080D19">
        <div style="font-size:19px;font-weight:800;letter-spacing:3px;color:#ffffff">
            EVENTORA
        </div>
        <p style="font-size:12px;color:#94a3b8;margin:10px 0 5px">
            Discover. Book. Experience.
        </p>
        <p style="font-size:11px;color:#64748b;margin:0">
            © ${new Date().getFullYear()} Eventora. All rights reserved.
        </p>
    </td>
</tr>
`;

const emailHeader = `
<tr>
    <td style="padding:0;margin:0">
        <img
            src="cid:eventoraBanner"
            alt="Eventora - Discover, Book, Experience"
            width="600"
            style="display:block;width:100%;max-width:600px;height:auto;border:0"
        />
    </td>
</tr>
`;

// Send a branded booking confirmation email with an embedded QR ticket.
const sendBookingEmail = async (
    userEmail,
    userName,
    eventTitle,
    eventDetails = {},
    ticketCode
) => {
    const quantity = Number(eventDetails.quantity || 1);
    const amount = Number(eventDetails.amount || 0);

    const qrBuffer = await QRCode.toBuffer(ticketCode, {
        type: 'png',
        errorCorrectionLevel: 'H',
        width: 320,
        margin: 2
    });

    const dateText = eventDetails.date
        ? new Date(eventDetails.date).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        })
        : 'See event details in Eventora';

    const location =
        eventDetails.location || 'See event details in Eventora';

    const mailOptions = {
        from: `"Eventora" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `Booking Confirmed: ${eventTitle}`,

        attachments: [
            {
                filename: 'Eventora-banner.png',
                path: bannerPath,
                cid: 'eventoraBanner'
            },
            {
                filename: `eventora-ticket-${ticketCode.slice(0, 8)}.png`,
                content: qrBuffer,
                contentType: 'image/png',
                cid: 'eventoraTicketQR'
            }
        ],

        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eventora Booking Confirmed</title>
</head>

<body style="
    margin:0;
    padding:20px 10px;
    background:#f1f3f7;
    font-family:Arial,Helvetica,sans-serif;
    color:#172033;
">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table
    role="presentation"
    width="600"
    cellpadding="0"
    cellspacing="0"
    style="
        width:100%;
        max-width:600px;
        background:#ffffff;
        border-radius:12px;
        overflow:hidden;
    "
>

${emailHeader}

<tr>
<td align="center" style="padding:32px 24px 15px">

    <div style="
        display:inline-block;
        padding:8px 15px;
        border-radius:30px;
        background:#e8f8ef;
        color:#16834a;
        font-size:11px;
        font-weight:bold;
        letter-spacing:1px;
    ">
        &#10003; BOOKING CONFIRMED
    </div>

    <h1 style="
        margin:20px 0 8px;
        color:#101828;
        font-size:27px;
        line-height:1.3;
    ">
        You're officially going!
    </h1>

    <p style="
        margin:0;
        color:#667085;
        font-size:15px;
        line-height:1.7;
    ">
        Hi ${escapeHTML(userName)}, your booking has been approved.
        Get ready for an unforgettable experience.
    </p>

</td>
</tr>

<tr>
<td style="padding:18px 22px">

<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
        background:#f8f9fc;
        border:1px solid #e7eaf0;
        border-radius:12px;
    "
>
<tr>
<td style="padding:24px">

    <p style="
        margin:0 0 9px;
        color:#7c3aed;
        font-size:11px;
        font-weight:bold;
        letter-spacing:1.5px;
    ">
        YOUR EVENT
    </p>

    <h2 style="
        color:#101828;
        font-size:22px;
        line-height:1.4;
        margin:0 0 22px;
    ">
        ${escapeHTML(eventTitle)}
    </h2>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb">
                <span style="font-size:13px;color:#667085">Event date</span>
            </td>
            <td align="right" style="padding:10px 0;border-bottom:1px solid #e5e7eb">
                <strong style="font-size:13px;color:#172033">
                    ${escapeHTML(dateText)}
                </strong>
            </td>
        </tr>

        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb">
                <span style="font-size:13px;color:#667085">Location</span>
            </td>
            <td align="right" style="padding:10px 0;border-bottom:1px solid #e5e7eb">
                <strong style="font-size:13px;color:#172033">
                    ${escapeHTML(location)}
                </strong>
            </td>
        </tr>

        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e5e7eb">
                <span style="font-size:13px;color:#667085">Tickets</span>
            </td>
            <td align="right" style="padding:10px 0;border-bottom:1px solid #e5e7eb">
                <strong style="font-size:13px;color:#172033">
                    ${quantity}
                </strong>
            </td>
        </tr>

        <tr>
            <td style="padding:13px 0 0">
                <strong style="font-size:14px;color:#172033">
                    Total amount
                </strong>
            </td>
            <td align="right" style="padding:13px 0 0">
                <strong style="font-size:17px;color:#111827">
                    &#8377;${amount.toLocaleString('en-IN')}
                </strong>
            </td>
        </tr>

    </table>

</td>
</tr>
</table>

</td>
</tr>

<tr>
<td align="center" style="padding:20px 22px 8px">

    <h2 style="
        margin:0 0 9px;
        font-size:21px;
        color:#101828;
    ">
        Your Digital Ticket
    </h2>

    <p style="
        color:#667085;
        font-size:13px;
        line-height:1.7;
        margin:0;
    ">
        Present this QR code at the event entrance.
        This QR represents all ${quantity} ticket(s) in your booking.
    </p>

</td>
</tr>

<tr>
<td align="center" style="padding:16px 22px">

    <table
        role="presentation"
        cellpadding="0"
        cellspacing="0"
        style="
            background:#ffffff;
            border:1px solid #e5e7eb;
            border-radius:12px;
        "
    >
    <tr>
    <td style="padding:15px">

        <img
            src="cid:eventoraTicketQR"
            width="280"
            height="280"
            alt="Eventora Digital Ticket QR Code"
            style="
                display:block;
                width:100%;
                max-width:280px;
                height:auto;
                border:0;
            "
        />

    </td>
    </tr>
    </table>

    <p style="
        margin:15px 0 5px;
        font-size:11px;
        color:#667085;
        letter-spacing:1px;
    ">
        TICKET REFERENCE
    </p>

    <p style="
        margin:0;
        font-size:15px;
        font-weight:bold;
        letter-spacing:2px;
        color:#101828;
    ">
        ${escapeHTML(ticketCode.slice(0, 12).toUpperCase())}
    </p>

    <p style="
        color:#667085;
        font-size:12px;
        line-height:1.6;
    ">
        Your QR ticket is also attached as a PNG image.
        Keep it ready when you arrive.
    </p>

</td>
</tr>

<tr>
<td align="center" style="padding:12px 25px 30px">

    <p style="
        color:#475467;
        font-size:13px;
        line-height:1.7;
        margin:0;
    ">
        Thank you for choosing Eventora.
        We look forward to seeing you there!
    </p>

</td>
</tr>

${emailFooter}

</table>

</td>
</tr>
</table>

</body>
</html>
`
    };

    return transporter.sendMail(mailOptions);
};


// Send branded OTP verification email.
const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const isAccountVerification =
            type === 'account_verification';

        const title = isAccountVerification
            ? 'Verify your email address'
            : 'Confirm your event booking';

        const message = isAccountVerification
            ? 'Use the verification code below to complete your Eventora account registration.'
            : 'Use the verification code below to verify and confirm your event booking.';

        const mailOptions = {
            from: `"Eventora" <${process.env.EMAIL_USER}>`,
            to: userEmail,

            subject: isAccountVerification
                ? 'Your Eventora verification code'
                : 'Your Eventora booking verification code',

            attachments: [
                {
                    filename: 'Eventora-banner.png',
                    path: bannerPath,
                    cid: 'eventoraBanner'
                }
            ],

            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eventora Verification</title>
</head>

<body style="
    margin:0;
    padding:20px 10px;
    background:#f1f3f7;
    font-family:Arial,Helvetica,sans-serif;
    color:#172033;
">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table
    role="presentation"
    width="600"
    cellpadding="0"
    cellspacing="0"
    style="
        width:100%;
        max-width:600px;
        background:#ffffff;
        border-radius:12px;
        overflow:hidden;
    "
>

${emailHeader}

<tr>
<td align="center" style="padding:35px 25px 12px">

    <div style="
        color:#7c3aed;
        font-size:11px;
        font-weight:bold;
        letter-spacing:2px;
        margin-bottom:15px;
    ">
        ACCOUNT SECURITY
    </div>

    <h1 style="
        color:#101828;
        font-size:26px;
        line-height:1.3;
        margin:0 0 12px;
    ">
        ${title}
    </h1>

    <p style="
        color:#667085;
        font-size:14px;
        line-height:1.8;
        margin:0;
    ">
        ${message}
    </p>

</td>
</tr>

<tr>
<td style="padding:25px 24px">

<table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="
        background:#f8f9fc;
        border:1px solid #e7eaf0;
        border-radius:12px;
    "
>
<tr>
<td align="center" style="padding:30px 15px">

    <p style="
        color:#667085;
        font-size:11px;
        font-weight:bold;
        letter-spacing:2px;
        margin:0 0 17px;
    ">
        YOUR ONE-TIME PASSWORD
    </p>

    <div style="
        display:inline-block;
        background:#ffffff;
        border:1px solid #e5e7eb;
        border-radius:10px;
        padding:18px 24px;
        color:#111827;
        font-size:34px;
        font-weight:bold;
        letter-spacing:9px;
        line-height:1.2;
        font-family:Arial,Helvetica,sans-serif;
    ">
        ${escapeHTML(otp)}
    </div>

    <p style="
        color:#7c3aed;
        font-size:12px;
        font-weight:bold;
        margin:17px 0 5px;
    ">
        SELECT AND COPY YOUR CODE
    </p>

    <p style="
        color:#667085;
        font-size:12px;
        line-height:1.6;
        margin:0;
    ">
        Tap and hold the code on your phone, or select it
        with your mouse to copy.
    </p>

    <div style="
        margin-top:22px;
        padding:10px 15px;
        display:inline-block;
        background:#fff7ed;
        border-radius:6px;
        color:#c2410c;
        font-size:12px;
        font-weight:bold;
    ">
        &#9201; Valid for 10 minutes
    </div>

</td>
</tr>
</table>

</td>
</tr>

<tr>
<td style="padding:0 28px 28px">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
    <td style="
        background:#f8fafc;
        border-left:3px solid #7c3aed;
        padding:14px 16px;
    ">
        <p style="
            color:#475467;
            font-size:12px;
            line-height:1.7;
            margin:0;
        ">
            <strong>Security reminder:</strong>
            Never share this verification code with anyone.
            Eventora will never ask you to disclose your OTP.
        </p>
    </td>
    </tr>
    </table>

    <p style="
        color:#98a2b3;
        font-size:12px;
        line-height:1.7;
        text-align:center;
        margin:20px 0 0;
    ">
        If you did not request this code, you can safely
        ignore this email.
    </p>

</td>
</tr>

${emailFooter}

</table>

</td>
</tr>
</table>

</body>
</html>
`
        };

        await transporter.sendMail(mailOptions);

        console.log(`OTP sent to ${userEmail} for ${type}`);

    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
};

module.exports = {
    sendBookingEmail,
    sendOTPEmail
};

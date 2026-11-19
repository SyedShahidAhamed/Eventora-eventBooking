
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaTicketAlt,
    FaUpload,
    FaQrcode,
    FaLock,
    FaTimes,
    FaShieldAlt,
    FaCheckCircle,
    FaCreditCard
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../utils/axios';

const UPI_ID = import.meta.env.VITE_UPI_ID || '';
const UPI_NAME = import.meta.env.VITE_UPI_NAME || 'Eventora';

const compressImage = file => new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;

    reader.onload = () => {
        const image = new Image();

        image.onerror = reject;

        image.onload = () => {
            const scale = Math.min(
                1,
                1400 / Math.max(image.width, image.height)
            );

            const canvas = document.createElement('canvas');

            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);

            canvas.getContext('2d').drawImage(
                image,
                0,
                0,
                canvas.width,
                canvas.height
            );

            resolve(canvas.toDataURL('image/jpeg', 0.76));
        };

        image.src = reader.result;
    };

    reader.readAsDataURL(file);
});

const PaymentPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const event = location.state?.event;
    const quantity = Number(location.state?.quantity || 1);
    const amount = Number(event?.ticketPrice || 0) * quantity;
    const isPaid = amount > 0;

    const [qr, setQr] = useState('');
    const [otp, setOtp] = useState('');
    const [proof, setProof] = useState('');
    const [proofName, setProofName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!event || event._id !== id) {
            navigate(`/events/${id}`, { replace: true });
        }
    }, [event, id, navigate]);

    // Generate actual UPI payment QR
    useEffect(() => {
        let active = true;

        if (!isPaid || !UPI_ID) {
            setQr('');
            return () => {
                active = false;
            };
        }

        const params = new URLSearchParams({
            pa: UPI_ID,
            pn: UPI_NAME,
            am: amount.toFixed(2),
            cu: 'INR',
            tn: `Eventora ${event?.title || 'Booking'}`.slice(0, 80)
        });

        QRCode.toDataURL(
            `upi://pay?${params.toString()}`,
            {
                width: 360,
                margin: 2,
                errorCorrectionLevel: 'H'
            }
        )
            .then(value => {
                if (active) setQr(value);
            })
            .catch(() => {
                if (active) {
                    setError('Unable to generate the UPI QR code.');
                    toast.error('Unable to generate payment QR code.');
                }
            });

        return () => {
            active = false;
        };
    }, [event, isPaid, amount]);

    const handleFile = async file => {
        setError('');

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            const msg = 'Please select a valid payment screenshot.';
            setError(msg);
            toast.error(msg);
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            const msg = 'Screenshot must be smaller than 8 MB.';
            setError(msg);
            toast.error(msg);
            return;
        }

        try {
            setProof(await compressImage(file));
            setProofName(file.name);
            toast.success('Payment screenshot uploaded!');
        } catch {
            const msg = 'Could not read this image. Please try another screenshot.';
            setError(msg);
            toast.error(msg);
        }
    };

    const submit = async e => {
        e.preventDefault();

        if (!/^\d{6}$/.test(otp)) {
            const msg = 'Enter the 6-digit OTP sent to your email.';
            setError(msg);
            toast.error(msg);
            return;
        }

        if (isPaid && (!UPI_ID || !proof)) {
            const msg = !UPI_ID
                ? 'UPI ID is not configured by the event organizer.'
                : 'Upload your payment screenshot to continue.';

            setError(msg);
            toast.error(msg);
            return;
        }

        setBusy(true);
        setError('');
        setMessage('');

        try {
            const { data } = await api.post('/bookings', {
                eventId: id,
                otp,
                quantity,
                paymentProof: proof || undefined
            });

            const successMessage =
                data.message || 'Booking request submitted for admin review.';

            setMessage(successMessage);
            toast.success(successMessage);

            setTimeout(() => navigate('/dashboard'), 1300);

        } catch (err) {
            const msg =
                err.response?.data?.message ||
                'Booking request failed. Please try again.';

            setError(msg);
            toast.error(msg);
        } finally {
            setBusy(false);
        }
    };

    if (!event) {
        return (
            <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-600">
                Opening secure checkout...
            </div>
        );
    }

    return (
        <main className="payment-screen min-h-screen bg-gray-50 text-gray-900">

            {/* Header */}
            <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-7">

                    <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gray-900 text-xl font-black text-white shadow-md">
                            E
                        </div>

                        <div>
                            <p className="text-sm font-black tracking-[.16em] text-gray-900">
                                EVENTORA
                            </p>
                            <p className="text-[11px] font-semibold tracking-[.18em] text-gray-500">
                                SECURE CHECKOUT
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate(`/events/${id}`)}
                        aria-label="Close checkout"
                        className="grid h-10 w-10 place-items-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-100"
                    >
                        <FaTimes />
                    </button>

                </div>
            </header>

            <div className="payment-content mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-10">

                {/* Page Heading */}
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                    <div>
                        <p className="text-sm font-bold uppercase tracking-[.2em] text-gray-500">
                            Booking confirmation
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                            Complete your booking
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
                            Review your booking, complete your payment and verify your details.
                        </p>
                    </div>

                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                        <FaShieldAlt />
                        Secure checkout
                    </div>

                </div>

                {/* Progress Steps */}
                <div className="mb-7 grid grid-cols-3 gap-2 sm:gap-4">

                    {[
                        { number: '01', title: 'Booking details' },
                        { number: '02', title: 'Payment' },
                        { number: '03', title: 'Verification' }
                    ].map((step, index) => (
                        <div
                            key={step.number}
                            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:gap-3 sm:p-4"
                        >
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gray-900 text-xs font-bold text-white">
                                {step.number}
                            </div>

                            <span className="text-xs font-bold text-gray-700 sm:text-sm">
                                {step.title}
                            </span>
                        </div>
                    ))}

                </div>

                <form
                    onSubmit={submit}
                    className="payment-form grid items-start gap-6 lg:grid-cols-[1.04fr_.96fr]"
                >

                    {/* LEFT SIDE */}
                    <section className="payment-booking-panel overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                        <div className="border-b border-gray-200 px-5 py-5 sm:px-7">
                            <p className="text-sm font-bold uppercase tracking-[.16em] text-gray-500">
                                Your booking
                            </p>

                            <h2 className="mt-1 text-xl font-extrabold">
                                Booking summary & verification
                            </h2>
                        </div>

                        <div className="p-5 sm:p-7">

                            {/* Event Card */}
                            <div className="payment-event-card flex min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">

                                {event.image && (
                                    <img
                                        src={event.image}
                                        alt={event.title}
                                        className="h-28 w-28 shrink-0 object-cover sm:h-32 sm:w-36"
                                    />
                                )}

                                <div className="min-w-0 p-4">
                                    <p className="break-words text-base font-extrabold text-gray-900 sm:text-lg">
                                        {event.title}
                                    </p>

                                    <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                        <FaCalendarAlt className="shrink-0" />
                                        {new Date(event.date).toLocaleDateString()}
                                    </p>

                                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                                        <FaMapMarkerAlt className="shrink-0" />
                                        {event.location}
                                    </p>
                                </div>

                            </div>

                            {/* Booking Summary */}
                            <div className="my-5 grid grid-cols-2 gap-3">

                                <div className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
                                    <p className="text-sm font-medium text-gray-500">
                                        Tickets
                                    </p>

                                    <p className="mt-2 flex items-center gap-2 text-xl font-black">
                                        <FaTicketAlt className="text-gray-600" />
                                        {quantity}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
                                    <p className="text-sm font-medium text-gray-500">
                                        Total payable
                                    </p>

                                    <p className="mt-2 text-xl font-black">
                                        ₹{amount.toLocaleString('en-IN')}
                                    </p>
                                </div>

                            </div>

                            {/* Payment app guidance */}
                            {isPaid && (
                                <div className="mb-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <FaQrcode className="shrink-0 text-2xl text-gray-700" />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">
                                            Ready to pay?
                                        </p>
                                        <p className="mt-1 text-sm leading-relaxed text-gray-600">
                                            Scan the secure UPI QR code on the right using your preferred payment app.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Verification and Upload */}
                            <div className="space-y-5">

                                <div>
                                    <label
                                        htmlFor="checkout-otp"
                                        className="mb-2 block text-sm font-bold text-gray-800"
                                    >
                                        Email verification OTP
                                    </label>

                                    <input
                                        id="checkout-otp"
                                        value={otp}
                                        onChange={e =>
                                            setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                                        }
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        placeholder="Enter 6-digit OTP"
                                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-[.5em] text-gray-900 outline-none transition placeholder:tracking-normal placeholder:font-normal focus:border-gray-700 focus:ring-2 focus:ring-gray-200"
                                    />

                                    <p className="mt-2 text-sm text-gray-500">
                                        Enter the one-time password sent to your registered email.
                                    </p>
                                </div>

                                {/* Screenshot Upload */}
                                {isPaid && (
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-gray-800">
                                            Payment confirmation screenshot
                                        </label>

                                        <label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition hover:border-gray-700 hover:bg-gray-100">

                                            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gray-900 text-white">
                                                <FaUpload />
                                            </span>

                                            <span className="mt-3 text-sm font-bold text-gray-800">
                                                {proofName
                                                    ? 'Screenshot selected'
                                                    : 'Upload payment screenshot'}
                                            </span>

                                            <span className="mt-1 text-sm text-gray-500">
                                                PNG, JPG or WEBP · Maximum 8 MB
                                            </span>

                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                className="sr-only"
                                                onChange={e => handleFile(e.target.files?.[0])}
                                            />

                                            {proofName && (
                                                <span className="mt-3 max-w-full break-all rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700">
                                                    <FaCheckCircle className="mr-1 inline text-green-600" />
                                                    {proofName}
                                                </span>
                                            )}

                                        </label>

                                        {proof && (
                                            <img
                                                src={proof}
                                                alt="Payment proof preview"
                                                className="mt-3 max-h-48 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain p-2"
                                            />
                                        )}
                                    </div>
                                )}

                                {error && (
                                    <p
                                        role="alert"
                                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
                                    >
                                        {error}
                                    </p>
                                )}

                                {message && (
                                    <p
                                        role="status"
                                        className="rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm font-semibold text-gray-800"
                                    >
                                        {message}
                                    </p>
                                )}

                                <button
                                    disabled={busy}
                                    className="payment-submit w-full rounded-xl border border-gray-900 bg-gray-950 px-5 py-4 text-sm font-extrabold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:border-gray-700 hover:bg-black hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    {busy
                                        ? 'Submitting booking...'
                                        : 'Confirm & submit booking'}
                                </button>

                                <p className="flex items-center justify-center gap-2 text-center text-sm text-gray-500">
                                    <FaLock />
                                    Your booking stays pending until admin verification.
                                </p>

                            </div>
                        </div>
                    </section>

                    {/* RIGHT SIDE - PAYMENT */}
                    <section className="payment-method-panel overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                        <div className="border-b border-gray-200 px-5 py-5 sm:px-7">
                            <p className="text-sm font-bold uppercase tracking-[.16em] text-gray-500">
                                Payment
                            </p>

                            <h2 className="mt-1 text-xl font-extrabold">
                                Scan & pay with UPI
                            </h2>
                        </div>

                        {isPaid ? (

                            <div className="p-5 sm:p-7">

                                {/* UPI Brand Names - continuous left-to-right scrolling */}
                                <div className="upi-marquee border-b border-gray-100 pb-5" aria-label="Supported UPI payment apps">
                                    <div className="upi-marquee-track">
                                        <div className="upi-marquee-group">
                                            <span>PhonePe</span>
                                            <span>Google Pay</span>
                                            <span>Paytm</span>
                                            <span>super.money</span>
                                        </div>
                                        <div className="upi-marquee-group" aria-hidden="true">
                                            <span>PhonePe</span>
                                            <span>Google Pay</span>
                                            <span>Paytm</span>
                                            <span>super.money</span>
                                        </div>
                                    </div>
                                </div>

                                {/* QR Payment Card */}
                                <div className="payment-qr-card mx-auto mt-6 flex max-w-md flex-col items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-7 shadow-sm sm:px-6">

                                    <div className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-gray-900 animate-pulse" />
                                        <p className="text-sm font-bold uppercase tracking-[.16em] text-gray-600">
                                            Scan to make payment
                                        </p>
                                    </div>

                                    {/* Actual UPI QR with premium gold scanning animation */}
                                    {qr ? (
                                        <div className="qr-scan-container relative mt-5 overflow-hidden rounded-xl border border-gray-300 bg-white p-3 shadow-sm">

                                            <img
                                                src={qr}
                                                alt="UPI payment QR code"
                                                className="relative z-0 h-60 w-60 object-contain sm:h-64 sm:w-64"
                                            />

                                            {/* Scanning Frame */}
                                            <div className="qr-scan-frame pointer-events-none absolute inset-3 z-10 overflow-hidden rounded-lg">

                                                <div className="qr-scan-line" />

                                            </div>

                                        </div>
                                    ) : (
                                        <div className="mt-5 grid h-60 w-60 place-items-center rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-600 sm:h-64 sm:w-64">
                                            {UPI_ID
                                                ? 'Preparing your payment QR...'
                                                : 'Organizer UPI ID is not configured. Please contact the event organizer.'}
                                        </div>
                                    )}

                                    {/* Amount */}
                                    <p className="mt-6 text-3xl font-black tracking-tight text-gray-950">
                                        ₹{amount.toLocaleString('en-IN')}
                                    </p>

                                    <p className="mt-1 text-sm font-semibold text-gray-800">
                                        Pay to {UPI_NAME}
                                    </p>

                                    <p className="mt-1 break-all text-sm text-gray-500">
                                        {UPI_ID}
                                    </p>

                                    <div className="mt-4 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600">
                                        <FaLock className="text-gray-900" />
                                        Secure UPI payment
                                    </div>

                                </div>

                                {/* Instructions */}
                                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">

                                    <div className="flex items-center gap-2">
                                        <FaCreditCard className="text-gray-900" />
                                        <p className="text-sm font-bold text-gray-900">
                                            Payment instructions
                                        </p>
                                    </div>

                                    <ol className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">

                                        <li className="flex gap-3">
                                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gray-900 text-xs font-bold text-white">
                                                1
                                            </span>
                                            Open your preferred UPI app.
                                        </li>

                                        <li className="flex gap-3">
                                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gray-900 text-xs font-bold text-white">
                                                2
                                            </span>
                                            Scan the QR code and complete the payment.
                                        </li>

                                        <li className="flex gap-3">
                                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gray-900 text-xs font-bold text-white">
                                                3
                                            </span>
                                            Upload your payment screenshot.
                                        </li>

                                        <li className="flex gap-3">
                                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gray-900 text-xs font-bold text-white">
                                                4
                                            </span>
                                            Submit your booking for admin verification.
                                        </li>

                                    </ol>

                                </div>

                            </div>

                        ) : (

                            <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">

                                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gray-900 text-2xl text-white">
                                    <FaCheckCircle />
                                </div>

                                <h3 className="mt-5 text-xl font-extrabold">
                                    No payment required
                                </h3>

                                <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-600">
                                    This is a free event. Enter your email OTP and submit your booking to reserve your tickets.
                                </p>

                            </div>

                        )}

                    </section>

                </form>

                {/* Footer */}
                <div className="mt-7 rounded-xl border border-gray-200 bg-white p-4">
                    <p className="flex items-center justify-center gap-2 text-center text-sm font-medium text-gray-500">
                        <FaShieldAlt className="text-gray-900" />
                        Payments are manually reviewed by the Eventora admin before booking approval.
                    </p>
                </div>

            </div>

            {/* Premium gold QR scanning animation */}
            <style>{`
                @keyframes qrScan {
                    0% {
                        top: 0%;
                        opacity: 0;
                    }

                    8% {
                        opacity: 1;
                    }

                    92% {
                        opacity: 1;
                    }

                    100% {
                        top: 100%;
                        opacity: 0;
                    }
                }

                .upi-marquee {
                    width: 100%;
                    overflow: hidden;
                    white-space: nowrap;
                    mask-image: linear-gradient(
                        90deg,
                        transparent 0,
                        #000 7%,
                        #000 93%,
                        transparent 100%
                    );
                }

                .upi-marquee-track {
                    display: flex;
                    width: max-content;
                    animation: upiMarqueeRight 16s linear infinite;
                    will-change: transform;
                }

                .upi-marquee-group {
                    display: flex;
                    flex-shrink: 0;
                    align-items: center;
                    justify-content: space-around;
                    gap: 2.5rem;
                    padding: 0 1.25rem;
                }

                .upi-marquee-group span {
                    color: #4b5563;
                    font-size: 0.875rem;
                    font-weight: 700;
                }

                @keyframes upiMarqueeRight {
                    from {
                        transform: translateX(-50%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }

                .upi-marquee:hover .upi-marquee-track {
                    animation-play-state: paused;
                }

                /* Mobile checkout layout */
                @media (max-width: 640px) {
                    .payment-screen {
                        overflow-x: hidden;
                    }

                    .payment-screen header > div {
                        padding-top: 0.65rem;
                        padding-bottom: 0.65rem;
                    }

                    .payment-screen header .h-11 {
                        width: 2.35rem;
                        height: 2.35rem;
                        border-radius: 0.7rem;
                        font-size: 1.1rem;
                    }

                    .payment-screen header button {
                        width: 2.25rem;
                        height: 2.25rem;
                    }

                    .payment-content {
                        padding: 1.1rem 0.85rem 1.5rem;
                    }

                    .payment-content > div:first-child {
                        margin-bottom: 1.15rem;
                        gap: 0.65rem;
                    }

                    .payment-content h1 {
                        font-size: clamp(1.65rem, 7vw, 2rem);
                        line-height: 1.12;
                    }

                    .payment-form {
                        gap: 1rem;
                    }

                    /* Show the QR/payment panel before OTP and screenshot fields on phones. */
                    .payment-method-panel {
                        order: 1;
                    }

                    .payment-booking-panel {
                        order: 2;
                    }

                    .payment-method-panel > div:first-child,
                    .payment-booking-panel > div:first-child {
                        padding: 1rem 1.1rem;
                    }

                    .payment-method-panel > div:first-child h2,
                    .payment-booking-panel > div:first-child h2 {
                        font-size: 1.05rem;
                        line-height: 1.35;
                    }

                    .payment-method-panel > div:nth-child(2),
                    .payment-booking-panel > div:nth-child(2) {
                        padding: 1rem;
                    }

                    .payment-event-card {
                        align-items: stretch;
                    }

                    .payment-event-card img {
                        width: 6rem;
                        min-height: 6.25rem;
                        height: auto;
                        object-fit: cover;
                    }

                    .payment-event-card > div {
                        padding: 0.75rem;
                    }

                    .payment-event-card p:first-child {
                        font-size: 0.9rem;
                        line-height: 1.3;
                    }

                    .payment-event-card p:not(:first-child) {
                        font-size: 0.75rem;
                        line-height: 1.35;
                    }

                    .payment-qr-card {
                        margin-top: 1rem;
                        padding: 1.25rem 0.85rem;
                    }

                    .payment-qr-card .qr-scan-container {
                        padding: 0.55rem;
                    }

                    .payment-qr-card .qr-scan-container img {
                        width: min(68vw, 16rem);
                        height: min(68vw, 16rem);
                    }

                    .payment-qr-card > p:nth-last-of-type(2) {
                        font-size: 1.7rem;
                    }

                    .upi-marquee-group {
                        gap: 1.6rem;
                        padding-right: 0.8rem;
                        padding-left: 0.8rem;
                    }

                    .upi-marquee-group span {
                        font-size: 0.8rem;
                    }

                    .payment-booking-panel .payment-submit {
                        position: sticky;
                        bottom: 0.5rem;
                        z-index: 5;
                        box-shadow: 0 8px 22px rgba(17, 24, 39, 0.18);
                    }

                    .payment-screen > div:last-of-type {
                        margin-top: 1rem;
                        padding: 0.85rem;
                    }
                }

                @media (min-width: 641px) and (max-width: 1023px) {
                    .payment-method-panel {
                        order: 1;
                    }

                    .payment-booking-panel {
                        order: 2;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .upi-marquee-track {
                        animation: none;
                        transform: none;
                    }
                }

                .qr-scan-container {
                    isolation: isolate;
                }

                .qr-scan-frame {
                    box-shadow:
                        inset 0 0 0 1px rgba(0, 0, 0, 0.12);
                }

                .qr-scan-line {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(212, 175, 55, 0.4) 12%,
                        #D4AF37 50%,
                        rgba(212, 175, 55, 0.4) 88%,
                        transparent 100%
                    );
                    box-shadow:
                        0 0 5px rgba(212, 175, 55, 0.7),
                        0 0 12px rgba(212, 175, 55, 0.45),
                        0 0 20px rgba(212, 175, 55, 0.2);
                    animation: qrScan 2.8s ease-in-out infinite;
                }

                @media (prefers-reduced-motion: reduce) {
                    .qr-scan-line {
                        animation: none;
                        top: 50%;
                    }
                }
            `}</style>

        </main>
    );
};

export default PaymentPage;

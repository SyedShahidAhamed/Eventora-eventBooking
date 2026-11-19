import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaUpload, FaQrcode, FaLock, FaTimes, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
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
            const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
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
        if (!event || event._id !== id) navigate(`/events/${id}`, { replace: true });
    }, [event, id, navigate]);

    useEffect(() => {
        let active = true;
        if (!isPaid || !UPI_ID) return () => { active = false; };
        const params = new URLSearchParams({ pa: UPI_ID, pn: UPI_NAME, am: amount.toFixed(2), cu: 'INR', tn: `Eventora ${event?.title || 'Booking'}`.slice(0, 80) });
        QRCode.toDataURL(`upi://pay?${params.toString()}`, { width: 360, margin: 2, errorCorrectionLevel: 'H' })
            .then(value => { if (active) setQr(value); })
            .catch(() => { if (active) setError('Unable to generate the UPI QR code.'); });
        return () => { active = false; };
    }, [event, isPaid, amount]);

    const handleFile = async file => {
        setError('');
        if (!file) return;
        if (!file.type.startsWith('image/')) return setError('Please select a valid payment screenshot.');
        if (file.size > 8 * 1024 * 1024) return setError('Screenshot must be smaller than 8 MB.');
        try { setProof(await compressImage(file)); setProofName(file.name); }
        catch { setError('Could not read this image. Please try another screenshot.'); }
    };

    const submit = async e => {
        e.preventDefault();
        if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit OTP sent to your email.');
        if (isPaid && (!UPI_ID || !proof)) return setError(!UPI_ID ? 'UPI ID is not configured by the event organizer.' : 'Upload your payment screenshot to continue.');
        setBusy(true); setError(''); setMessage('');
        try {
            const { data } = await api.post('/bookings', { eventId: id, otp, quantity, paymentProof: proof || undefined });
            setMessage(data.message || 'Booking request submitted for admin review.');
            setTimeout(() => navigate('/dashboard'), 1300);
        } catch (err) {
            setError(err.response?.data?.message || 'Booking request failed. Please try again.');
        } finally { setBusy(false); }
    };

    if (!event) return <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-600">Opening secure checkout...</div>;

    return (
        <main className="payment-screen min-h-screen bg-gray-50 text-gray-900">
            <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-7">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-900 text-xl font-black text-white">E</div>
                        <div><p className="text-sm font-black tracking-[.16em] text-gray-900">EVENTORA</p><p className="text-[10px] font-semibold tracking-[.2em] text-gray-500">SECURE CHECKOUT</p></div>
                    </div>
                    <button type="button" onClick={() => navigate(`/events/${id}`)} aria-label="Close checkout" className="grid h-10 w-10 place-items-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"><FaTimes /></button>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-10">
                <div className="mb-7 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div><p className="text-xs font-bold uppercase tracking-[.24em] text-gray-500">Booking confirmation</p><h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Complete your booking</h1><p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">Review your booking, make your payment and verify your details — all in one place.</p></div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600"><FaShieldAlt /> Secure checkout</div>
                </div>

                <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[1.04fr_.96fr]">
                    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 px-5 py-5 sm:px-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-gray-500">Your booking</p><h2 className="mt-1 text-xl font-extrabold">Booking summary & verification</h2></div>
                        <div className="p-5 sm:p-7">
                            <div className="flex min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                                {event.image && <img src={event.image} alt={event.title} className="h-28 w-28 shrink-0 object-cover sm:h-32 sm:w-36" />}
                                <div className="min-w-0 p-4"><p className="break-words text-base font-extrabold text-gray-900 sm:text-lg">{event.title}</p><p className="mt-2 flex items-center gap-2 text-sm text-gray-600"><FaCalendarAlt className="shrink-0 text-gray-500" />{new Date(event.date).toLocaleDateString()}</p><p className="mt-1 flex items-center gap-2 text-sm text-gray-600"><FaMapMarkerAlt className="shrink-0 text-gray-500" />{event.location}</p></div>
                            </div>
                            <div className="my-5 grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs font-medium text-gray-500">Tickets</p><p className="mt-1 flex items-center gap-2 text-xl font-black"><FaTicketAlt className="text-gray-600" />{quantity}</p></div>
                                <div className="rounded-xl border border-gray-200 p-4"><p className="text-xs font-medium text-gray-500">Total payable</p><p className="mt-1 text-xl font-black">₹{amount.toLocaleString('en-IN')}</p></div>
                            </div>

                            {isPaid && <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">Pay using any UPI app</p><p className="mt-1 text-xs text-gray-500">Scan the secure QR code shown alongside.</p></div><FaQrcode className="text-2xl text-gray-700" /></div>
                                <div className="payment-marquee mt-4" aria-label="Supported UPI payment apps"><div className="payment-marquee-track">{['PhonePe','Google Pay','Paytm','super.money','PhonePe','Google Pay','Paytm','super.money'].map((name, i) => <span key={i} className="payment-brand">{name}</span>)}</div></div>
                            </div>}

                            <div className="space-y-4">
                                <div><label htmlFor="checkout-otp" className="mb-2 block text-sm font-bold text-gray-800">Email verification OTP</label><input id="checkout-otp" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter 6-digit OTP" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-[.5em] text-gray-900 outline-none transition placeholder:tracking-normal placeholder:font-normal focus:border-gray-700 focus:ring-2 focus:ring-gray-200" /><p className="mt-2 text-xs text-gray-500">Enter the one-time password sent to your registered email.</p></div>
                                {isPaid && <div><label className="mb-2 block text-sm font-bold text-gray-800">Payment confirmation screenshot</label><label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center transition hover:border-gray-500 hover:bg-gray-100"><span className="grid h-10 w-10 place-items-center rounded-full bg-gray-200 text-gray-700"><FaUpload /></span><span className="mt-2 text-sm font-bold text-gray-800">{proofName ? 'Screenshot selected' : 'Choose payment screenshot'}</span><span className="mt-1 text-xs text-gray-500">PNG, JPG or WEBP · maximum 8 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e => handleFile(e.target.files?.[0])} />{proofName && <span className="mt-2 max-w-full break-all text-xs font-semibold text-gray-700">{proofName}</span>}</label>{proof && <img src={proof} alt="Payment proof preview" className="mt-3 max-h-44 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain p-2" />}</div>}
                                {error && <p role="alert" className="rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm font-medium text-gray-800">{error}</p>}
                                {message && <p role="status" className="rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm font-semibold text-gray-800">{message}</p>}
                                <button disabled={busy} className="w-full rounded-xl bg-gray-900 px-5 py-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Submitting booking...' : 'Confirm & submit booking'}</button>
                                <p className="flex items-center justify-center gap-2 text-center text-xs text-gray-500"><FaLock /> Your booking stays pending until admin verification.</p>
                            </div>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 px-5 py-5 sm:px-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-gray-500">Payment</p><h2 className="mt-1 text-xl font-extrabold">Scan & pay with UPI</h2></div>
                        {isPaid ? <div className="p-5 sm:p-7">
                            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-b border-gray-100 pb-5 text-xs font-bold tracking-tight text-gray-600 sm:text-sm"><span>PhonePe</span><span>Google Pay</span><span>Paytm</span><span>super.money</span></div>
                            <div className="mx-auto mt-6 flex max-w-md flex-col items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 sm:px-6">
                                <p className="text-xs font-bold uppercase tracking-[.18em] text-gray-500">Scan this QR code</p>
                                {qr ? <img src={qr} alt="UPI payment QR code" className="qr-reveal mt-4 h-60 w-60 rounded-xl border border-gray-200 bg-white p-3 sm:h-64 sm:w-64" /> : <div className="mt-4 grid h-60 w-60 place-items-center rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-600 sm:h-64 sm:w-64">{UPI_ID ? 'Preparing your payment QR...' : 'Organizer UPI ID is not configured. Please contact the event organizer.'}</div>}
                                <p className="mt-5 text-3xl font-black tracking-tight text-gray-950">₹{amount.toLocaleString('en-IN')}</p><p className="mt-1 text-sm font-semibold text-gray-700">Pay to {UPI_NAME}</p><p className="mt-1 break-all text-xs text-gray-500">{UPI_ID}</p>
                            </div>
                            <div className="mt-5 rounded-xl border border-gray-200 p-4"><p className="text-sm font-bold text-gray-800">Payment instructions</p><ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-gray-600"><li>Open your preferred UPI app.</li><li>Scan the QR code and complete the payment.</li><li>Upload the payment screenshot in the booking details.</li><li>Submit your booking for admin verification.</li></ol></div>
                        </div> : <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center"><div className="grid h-16 w-16 place-items-center rounded-full bg-gray-100 text-2xl text-gray-700"><FaCheckCircle /></div><h3 className="mt-5 text-xl font-extrabold">No payment required</h3><p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-600">This is a free event. Enter your email OTP and submit your booking to reserve your tickets.</p></div>}
                    </section>
                </form>
                <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-gray-500"><FaShieldAlt /> Payments are manually reviewed by the Eventora admin before booking approval.</p>
            </div>
        </main>
    );
};

export default PaymentPage;

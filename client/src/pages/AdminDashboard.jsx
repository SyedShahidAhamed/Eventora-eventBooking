import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { useNavigate } from 'react-router-dom';
import TicketScanner from '../components/TicketScanner';
import toast from 'react-hot-toast';
import { FaRupeeSign, FaUsers, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaTrashAlt, FaCheck, FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt } from 'react-icons/fa';

const AdminDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTicketScanner, setShowTicketScanner] = useState(false);
    const [manualTicketCode, setManualTicketCode] = useState('');
    const [scanResult, setScanResult] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [processingBooking, setProcessingBooking] = useState('');
    const [activeTab, setActiveTab] = useState('events');
    const [proofPreview, setProofPreview] = useState('');
    const [proofLoading, setProofLoading] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);

    const [showEventForm, setShowEventForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '', description: '', date: '', location: '', category: '', totalSeats: '', ticketPrice: '', image: ''
    });

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
            return;
        }
        fetchData();
    }, [user, navigate]);

    const fetchData = async () => {
        try {
            const [eventsRes, bookingsRes] = await Promise.all([
                api.get('/events'),
                api.get('/bookings/my') // Admin gets all bookings
            ]);
            setEvents(eventsRes.data);
            setBookings(bookingsRes.data);
        } catch (error) {
            console.error('Error fetching admin data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/events', formData);
            toast.success('Event published successfully.');
            setShowEventForm(false);
            setFormData({ title: '', description: '', date: '', location: '', category: '', totalSeats: '', ticketPrice: '', image: '' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error creating event');
        }
    };

    const handleDeleteEvent = async (id) => {
        setConfirmAction({
            title: 'Delete this event?',
            description: 'This action cannot be undone. The event will be removed from the published events list.',
            confirmLabel: 'Delete event',
            danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`/events/${id}`);
                    toast.success('Event deleted successfully.');
                    fetchData();
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Error deleting event');
                }
            }
        });
    };

    const handleConfirmBooking = async (id, paymentStatus) => {
        if (processingBooking) return;
        setProcessingBooking(id);
        try {
            const { data } = await api.put(`/bookings/${id}/confirm`, { paymentStatus });
            // Reflect the approval immediately; refresh the complete dashboard in the background.
            setBookings(current => current.map(b => b._id === id ? { ...b, ...data.booking } : b));
            toast.success('Booking updated successfully.');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error confirming booking');
        } finally { setProcessingBooking(''); }
    };

    const handleViewPaymentProof = async (bookingId) => {
        setProofLoading(bookingId);
        try {
            const { data } = await api.get(`/bookings/${bookingId}/payment-proof`, { responseType: 'blob' });
            setProofPreview(URL.createObjectURL(data));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Unable to load payment screenshot');
        } finally {
            setProofLoading('');
        }
    };

    const handleScanTicket = async (ticketCode) => {
        if (!ticketCode || scanning) return;
        setScanning(true); setScanResult(null);
        try {
            const { data } = await api.post('/bookings/scan', { ticketCode: ticketCode.trim() });
            setScanResult({ success: true, ...data });
            fetchData();
        } catch (error) {
            setScanResult({ success: false, message: error.response?.data?.message || 'Unable to verify ticket.' });
        } finally { setScanning(false); setShowTicketScanner(false); setManualTicketCode(''); }
    };


    const handleCancelBooking = async (id) => {
        setConfirmAction({
            title: 'Reject this booking request?',
            description: 'The booking will be cancelled and any valid ticket associated with it will be revoked.',
            confirmLabel: 'Reject booking',
            danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`/bookings/${id}`);
                    setBookings(current => current.map(b =>
                        b._id === id
                            ? { ...b, status: 'cancelled', ticketStatus: b.ticketStatus === 'valid' ? 'revoked' : b.ticketStatus }
                            : b
                    ));
                    toast.success('Booking request rejected.');
                    fetchData();
                } catch (error) {
                    toast.error(error.response?.data?.message || 'Error cancelling booking');
                }
            }
        });
    };

    if (loading) return (
        <div className="min-h-[60vh] grid place-items-center bg-gray-50">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                <span className="text-sm font-semibold text-gray-700">Loading your admin dashboard...</span>
            </div>
        </div>
    );

    return (
        <div className="admin-dashboard mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 sm:py-8 lg:px-7">
            <div className="relative mb-6 flex flex-col items-start justify-between gap-5 overflow-hidden rounded-2xl bg-gray-950 px-5 py-6 text-left text-white shadow-lg sm:px-8 sm:py-8 md:flex-row md:items-center">
                <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[.22em] text-gray-400">EVENTORA MANAGEMENT</p><h1 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Admin Dashboard</h1>
                    <p className="max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">Manage your events, review booking requests and verify tickets at the entrance.</p>
                </div>
                <button
                    onClick={() => setShowEventForm(!showEventForm)}
                    className="w-full rounded-xl bg-white px-6 py-3 text-sm font-bold text-gray-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-950 md:w-auto"
                >
                    {showEventForm ? 'Cancel Creation' : '+ Create New Event'}
                </button>
            </div>

            {/* Admin Stats Row */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.14em] text-gray-500">Total Revenue</p>
                        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-green-600 sm:text-3xl">₹{bookings.reduce((sum, b) => b.paymentStatus === 'paid' && b.status === 'confirmed' ? sum + b.amount : sum, 0)}</h3>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-green-50 text-green-700"><FaRupeeSign className="text-lg" /></div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.14em] text-gray-500">Paid Clients</p>
                        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-blue-600 sm:text-3xl">{new Set(bookings.filter(b => b.paymentStatus === 'paid' && b.status === 'confirmed').map(b => b.userId?._id)).size}</h3>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-700"><FaUsers className="text-lg" /></div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.14em] text-gray-500">Pending Requests</p>
                        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-amber-600 sm:text-3xl">{bookings.filter(b => b.status === 'pending').length}</h3>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-50 text-amber-700"><FaHourglassHalf className="text-lg" /></div>
                </div>
            </div>

            <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div><h2 className="text-lg font-extrabold tracking-tight text-gray-950 sm:text-xl">Event Entry Scanner</h2><p className="mt-1 text-sm leading-relaxed text-gray-500">Scan each confirmed ticket once at the entrance.</p></div>
                    <button onClick={() => { setScanResult(null); setShowTicketScanner(true); }} className="w-full rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-400 sm:w-auto">Open QR Scanner</button>
                </div>
                <form className="mt-4 flex flex-col sm:flex-row gap-2" onSubmit={e => { e.preventDefault(); handleScanTicket(manualTicketCode); }}>
                    <input value={manualTicketCode} onChange={e => setManualTicketCode(e.target.value)} placeholder="Or enter ticket code manually" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100" />
                    <button disabled={!manualTicketCode.trim() || scanning} className="rounded-xl border border-gray-200 bg-gray-100 px-5 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50">{scanning ? 'Verifying...' : 'Verify Ticket'}</button>
                </form>
                {scanResult && <div className={`mt-4 rounded-lg p-4 border ${scanResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}><strong>{scanResult.success ? '✓ Entry approved' : '✕ Entry denied'}</strong><p className="text-sm mt-1">{scanResult.message}</p>{scanResult.success && <p className="text-sm mt-1">Attendee: <b>{scanResult.attendee}</b> · Event: <b>{scanResult.event}</b></p>}</div>}
            </section>

            {showEventForm && (
                <div className="animation-slideDown mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-gray-500">Event setup</p><h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-950 sm:text-2xl">Create New Event</h2><p className="mt-1 text-sm text-gray-500">Add the details below to publish a new event.</p></div>
                    <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input required type="text" placeholder="Event Title" className="min-w-0 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        <input required type="text" placeholder="Category (e.g., Tech, Music)" className="min-w-0 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                        <input required type="date" className="min-w-0 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        <input required type="text" placeholder="Location" className="min-w-0 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                        <input required type="number" placeholder="Total Seats" className="min-w-0 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100" value={formData.totalSeats} onChange={e => setFormData({ ...formData, totalSeats: e.target.value })} />
                        <input required type="number" placeholder="Ticket Price (0 for free)" className="min-w-0 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100" value={formData.ticketPrice} onChange={e => setFormData({ ...formData, ticketPrice: e.target.value })} />

                        <div className="md:col-span-2">
                            <input type="text" placeholder="Image URL (Provide any direct link to an image)" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} />
                        </div>

                        <textarea required placeholder="Event Description" className="h-32 min-w-0 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100 md:col-span-2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        <button type="submit" className="mt-2 rounded-xl bg-gray-950 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 md:col-span-2">Publish Event</button>
                    </form>
                </div>
            )}

            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
                <button onClick={() => setActiveTab('events')} className={`min-w-0 rounded-lg px-3 py-3 text-xs font-extrabold transition sm:px-5 sm:text-sm ${activeTab === 'events' ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                    ALL EVENTS <span className="ml-2 text-xs opacity-75">{events.length}</span>
                </button>
                <button onClick={() => setActiveTab('bookings')} className={`min-w-0 rounded-lg px-3 py-3 text-xs font-extrabold transition sm:px-5 sm:text-sm ${activeTab === 'bookings' ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                    BOOKING REQUESTS <span className="ml-2 text-xs opacity-75">{bookings.filter(b => b.status === 'pending').length}</span>
                </button>
            </div>

            {activeTab === 'events' ? (
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-gray-500">Event portfolio</p>
                            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-950">All Events</h2>
                            <p className="mt-1 text-sm text-gray-500">Manage published events, ticket availability and pricing.</p>
                        </div>
                        <div className="flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 sm:self-center">
                            <span className="grid h-7 w-7 place-items-center rounded-md bg-gray-900 text-xs font-bold text-white">{events.length}</span>
                            <span className="text-xs font-semibold text-gray-600">Published events</span>
                        </div>
                    </div>

                    {events.length === 0 ? (
                        <div className="px-5 py-14 text-center">
                            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-100 text-gray-500">
                                <FaCalendarAlt className="text-xl" />
                            </div>
                            <h3 className="mt-4 text-base font-bold text-gray-900">No events published yet</h3>
                            <p className="mt-1 text-sm text-gray-500">Create your first event to start accepting bookings.</p>
                            <button
                                type="button"
                                onClick={() => setShowEventForm(true)}
                                className="mt-4 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black"
                            >
                                Create your first event
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 bg-gray-50/70 p-3 sm:space-y-4 sm:p-5">
                            {events.map(event => {
                                const totalSeats = Math.max(0, Number(event.totalSeats) || 0);
                                const availableSeats = Math.max(0, Number(event.availableSeats) || 0);
                                const bookedSeats = Math.max(0, totalSeats - availableSeats);
                                const occupancy = totalSeats > 0
                                    ? Math.min(100, Math.max(0, (bookedSeats / totalSeats) * 100))
                                    : 0;
                                const isSoldOut = totalSeats > 0 && availableSeats === 0;
                                const isLowAvailability = availableSeats > 0 && totalSeats > 0 && availableSeats / totalSeats <= 0.2;

                                return (
                                    <article
                                        key={event._id}
                                        className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md sm:p-5 lg:flex-row lg:items-center lg:justify-between"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-700">
                                                    {event.category || 'General'}
                                                </span>
                                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                                    isSoldOut
                                                        ? 'bg-red-50 text-red-700'
                                                        : isLowAvailability
                                                            ? 'bg-amber-50 text-amber-800'
                                                            : 'bg-green-50 text-green-700'
                                                }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                                        isSoldOut ? 'bg-red-600' : isLowAvailability ? 'bg-amber-500' : 'bg-green-600'
                                                    }`} />
                                                    {isSoldOut ? 'Sold out' : isLowAvailability ? 'Limited seats' : 'Available'}
                                                </span>
                                            </div>

                                            <h3 className="mt-2 break-words text-base font-extrabold leading-snug text-gray-950 sm:text-lg">
                                                {event.title}
                                            </h3>

                                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-gray-500 sm:text-sm">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <FaCalendarAlt className="text-gray-400" />
                                                    {new Date(event.date).toLocaleDateString()}
                                                </span>
                                                {event.location && (
                                                    <span className="inline-flex min-w-0 items-center gap-1.5">
                                                        <FaMapMarkerAlt className="shrink-0 text-gray-400" />
                                                        <span className="break-words">{event.location}</span>
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1.5">
                                                    <FaTicketAlt className="text-gray-400" />
                                                    {event.ticketPrice === 0 ? 'Free admission' : `₹${Number(event.ticketPrice).toLocaleString('en-IN')} per ticket`}
                                                </span>
                                            </div>

                                            <div className="mt-4 max-w-xl">
                                                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                                                    <span className="font-semibold text-gray-600">Ticket capacity</span>
                                                    <span className="font-bold tabular-nums text-gray-800">
                                                        {bookedSeats.toLocaleString('en-IN')} booked <span className="font-medium text-gray-400">/ {totalSeats.toLocaleString('en-IN')} total</span>
                                                    </span>
                                                </div>
                                                <div
                                                    className="h-1.5 overflow-hidden rounded-full bg-gray-100"
                                                    role="progressbar"
                                                    aria-label={`Ticket capacity for ${event.title}`}
                                                    aria-valuenow={Math.round(occupancy)}
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                >
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            isSoldOut ? 'bg-red-600' : isLowAvailability ? 'bg-amber-500' : 'bg-gray-900'
                                                        }`}
                                                        style={{ width: `${occupancy}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1.5 text-[11px] text-gray-500">
                                                    {availableSeats.toLocaleString('en-IN')} of {totalSeats.toLocaleString('en-IN')} seats remaining
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex w-full items-center justify-between gap-3 border-t border-gray-100 pt-3 lg:w-auto lg:min-w-[150px] lg:flex-col lg:items-end lg:border-0 lg:pt-0">
                                            <div className="lg:text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Ticket price</p>
                                                <p className="mt-0.5 text-lg font-extrabold text-gray-950">
                                                    {event.ticketPrice === 0 ? 'Free' : `₹${Number(event.ticketPrice).toLocaleString('en-IN')}`}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteEvent(event._id)}
                                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-700 transition hover:border-red-700 hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                            >
                                                <FaTrashAlt />
                                                Delete event
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            ) : (
                <div className="space-y-6">
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div><h2 className="text-lg font-extrabold tracking-tight text-gray-950 sm:text-xl">Event Entry Scanner</h2><p className="text-sm text-gray-500 mt-1">Scan each confirmed booking QR once at the entrance.</p></div>
                            <button onClick={() => { setScanResult(null); setShowTicketScanner(true); }} className="w-full rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-400 sm:w-auto">Open QR Scanner</button>
                        </div>
                        <form className="mt-4 flex flex-col sm:flex-row gap-2" onSubmit={e => { e.preventDefault(); handleScanTicket(manualTicketCode); }}>
                            <input value={manualTicketCode} onChange={e => setManualTicketCode(e.target.value)} placeholder="Or enter ticket code manually" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100" />
                            <button disabled={!manualTicketCode.trim() || scanning} className="rounded-xl border border-gray-200 bg-gray-100 px-5 py-3 text-sm font-bold text-gray-800 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50">{scanning ? 'Verifying...' : 'Verify Ticket'}</button>
                        </form>
                        {scanResult && <div className={`mt-4 rounded-lg p-4 border ${scanResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <strong>{scanResult.success ? '✓ Entry approved' : '✕ Entry denied'}</strong><p className="text-sm mt-1">{scanResult.message}</p>
                            {scanResult.success && <p className="text-sm mt-1">Attendee: <b>{scanResult.attendee}</b> · Event: <b>{scanResult.event}</b> · Tickets: <b>{scanResult.quantity || 1}</b></p>}
                        </div>}
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-gray-500">Reservation management</p>
                                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-950">Booking Requests</h2>
                                <p className="mt-1 text-sm text-gray-500">Review attendee details and payment evidence before processing each request.</p>
                            </div>
                            <div className="flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 sm:self-center">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <span className="text-sm font-bold text-gray-800">{bookings.length}</span>
                                <span className="text-xs font-medium text-gray-500">total requests</span>
                            </div>
                        </div>

                        <div className="space-y-3 bg-gray-50/70 p-3 sm:space-y-4 sm:p-5">
                            {bookings.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
                                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gray-100 text-gray-500">
                                        <FaUsers className="text-lg" />
                                    </div>
                                    <h3 className="mt-3 text-sm font-bold text-gray-900">No booking requests yet</h3>
                                    <p className="mt-1 text-sm text-gray-500">New reservations will appear here when attendees book an event.</p>
                                </div>
                            ) : bookings.map(booking => {
                                const isPending = booking.status === 'pending';
                                const isConfirmed = booking.status === 'confirmed';
                                const paymentIsPaid = booking.paymentStatus === 'paid';

                                return (
                                    <article key={booking._id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-300 hover:shadow-md">
                                        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
                                            <div className="min-w-0">
                                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                                    {isPending ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 ring-1 ring-inset ring-amber-200"><FaHourglassHalf /> Action required</span>
                                                    ) : isConfirmed ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-green-700 ring-1 ring-inset ring-green-200"><FaCheckCircle /> Confirmed</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-red-700 ring-1 ring-inset ring-red-200"><FaTimesCircle /> Rejected</span>
                                                    )}
                                                    <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${paymentIsPaid ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${paymentIsPaid ? 'bg-blue-600' : 'bg-gray-400'}`} />
                                                        {paymentIsPaid ? 'Payment marked paid' : 'Payment not marked paid'}
                                                    </span>
                                                </div>
                                                <h3 className="break-words text-base font-extrabold leading-snug text-gray-950 sm:text-lg">{booking.eventId?.title || 'Deleted Event'}</h3>
                                                <p className="mt-1 break-all text-xs text-gray-500 sm:text-sm">
                                                    {booking.userId?.name || 'Unknown attendee'} <span className="px-1 text-gray-300">|</span> {booking.userId?.email || 'No email available'}
                                                </p>
                                            </div>
                                            <div className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 sm:text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Booking reference</p>
                                                <p className="mt-0.5 font-mono text-xs font-bold text-gray-800">#{booking._id.slice(-8).toUpperCase()}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-px border-b border-gray-100 bg-gray-200 sm:grid-cols-4">
                                            <div className="bg-white px-4 py-3 sm:px-5"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Booking amount</p><p className="mt-1 text-base font-extrabold text-gray-950">{booking.amount === 0 ? 'Free' : `₹${Number(booking.amount || 0).toLocaleString('en-IN')}`}</p></div>
                                            <div className="bg-white px-4 py-3 sm:px-5"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tickets</p><p className="mt-1 text-base font-extrabold text-gray-950">{booking.quantity || 1}</p></div>
                                            <div className="bg-white px-4 py-3 sm:px-5"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Requested on</p><p className="mt-1 text-xs font-semibold leading-relaxed text-gray-800">{booking.bookedAt ? new Date(booking.bookedAt).toLocaleString() : '—'}</p></div>
                                            <div className="bg-white px-4 py-3 sm:px-5"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Seats remaining</p><p className="mt-1 text-base font-extrabold text-gray-950">{booking.eventId?.availableSeats ?? '—'}</p></div>
                                        </div>

                                        {booking.amount > 0 && (
                                            <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-800">Payment evidence</p>
                                                    <p className="mt-0.5 text-xs text-gray-500">{booking.paymentProofUploadedAt ? `Uploaded ${new Date(booking.paymentProofUploadedAt).toLocaleString()}` : 'No payment screenshot has been uploaded'}</p>
                                                </div>
                                                {booking.paymentProofUploadedAt ? (
                                                    <button type="button" onClick={() => handleViewPaymentProof(booking._id)} disabled={proofLoading === booking._id} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-50 sm:self-center">
                                                        {proofLoading === booking._id ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" /> Loading proof...</> : 'View payment proof'}
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 self-start rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"><FaHourglassHalf /> Awaiting evidence</span>
                                                )}
                                            </div>
                                        )}

                                        {isPending ? (
                                            <div className="flex flex-col gap-2 bg-white p-4 sm:flex-row sm:justify-end sm:px-5">
                                                <button type="button" disabled={!!processingBooking} onClick={() => handleConfirmBooking(booking._id, 'paid')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-green-700 bg-green-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-40">
                                                    <FaCheckCircle /> {processingBooking === booking._id ? 'Processing...' : 'Approve as paid'}
                                                </button>
                                                <button type="button" disabled={!!processingBooking} onClick={() => handleConfirmBooking(booking._id, 'not_paid')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-900 bg-gray-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-40">
                                                    <FaCheck /> {processingBooking === booking._id ? 'Processing...' : 'Approve undecided'}
                                                </button>
                                                <button type="button" disabled={!!processingBooking} onClick={() => handleCancelBooking(booking._id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-32">
                                                    <FaTimesCircle /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1.5 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                                <p className="text-xs font-medium text-gray-600">{isConfirmed ? 'This booking has been reviewed and confirmed.' : 'This booking request was rejected.'}</p>
                                                <span className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isConfirmed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {isConfirmed ? <FaCheckCircle /> : <FaTimesCircle />} {isConfirmed ? 'Review complete' : 'Request closed'}
                                                </span>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}

            {showTicketScanner && <TicketScanner onClose={() => setShowTicketScanner(false)} onDetected={handleScanTicket} />}
            {confirmAction && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-confirm-title"
                        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
                    >
                        <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-gray-100 text-lg font-bold text-gray-800">
                            !
                        </div>
                        <h3 id="admin-confirm-title" className="text-lg font-extrabold text-gray-950">
                            {confirmAction.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">
                            {confirmAction.description}
                        </p>
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setConfirmAction(null)}
                                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                            >
                                Keep it
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const action = confirmAction.onConfirm;
                                    setConfirmAction(null);
                                    await action();
                                }}
                                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${
                                    confirmAction.danger
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-gray-950 hover:bg-black'
                                }`}
                            >
                                {confirmAction.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {proofPreview && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => { URL.revokeObjectURL(proofPreview); setProofPreview(''); }}>
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3"><h3 className="font-extrabold text-gray-900">Payment Screenshot</h3><button onClick={() => { URL.revokeObjectURL(proofPreview); setProofPreview(''); }} className="rounded-lg px-3 py-2 bg-gray-100 hover:bg-gray-200 font-bold">Close ✕</button></div>
                        <img src={proofPreview} alt="User uploaded payment proof" className="max-h-[75vh] w-full object-contain rounded-lg bg-gray-50" />
                    </div>
                </div>
            )}
            <style>{`
                .admin-dashboard input,
                .admin-dashboard textarea,
                .admin-dashboard button {
                    -webkit-tap-highlight-color: transparent;
                }

                @media (max-width: 640px) {
                    .admin-dashboard {
                        padding-left: 0.75rem;
                        padding-right: 0.75rem;
                    }

                    .admin-dashboard section,
                    .admin-dashboard > div {
                        min-width: 0;
                    }

                    .admin-dashboard ul li {
                        overflow-wrap: anywhere;
                    }

                    .admin-dashboard button {
                        min-height: 42px;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .admin-dashboard *,
                    .admin-dashboard *::before,
                    .admin-dashboard *::after {
                        scroll-behavior: auto !important;
                        animation-duration: 0.01ms !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;

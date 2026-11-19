import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { useNavigate } from 'react-router-dom';
import TicketScanner from '../components/TicketScanner';
import toast from 'react-hot-toast';

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
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-green-50 text-green-700 flex items-center justify-center text-xl font-bold">₹</div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.14em] text-gray-500">Paid Clients</p>
                        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-blue-600 sm:text-3xl">{new Set(bookings.filter(b => b.paymentStatus === 'paid' && b.status === 'confirmed').map(b => b.userId?._id)).size}</h3>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold">👤</div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.14em] text-gray-500">Pending Requests</p>
                        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-amber-600 sm:text-3xl">{bookings.filter(b => b.status === 'pending').length}</h3>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold">⏳</div>
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
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
                        <div><h2 className="text-lg font-extrabold tracking-tight text-gray-950 sm:text-xl">All Events</h2><p className="mt-1 text-sm text-gray-500">Manage your published events and available seats.</p></div>
                        <span className="rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-sm font-bold">{events.length} events</span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {events.length === 0 ? <li className="p-8 text-center text-gray-500">No events created yet.</li> :
                            events.map(event => (
                                <li key={event._id} className="flex flex-col items-start justify-between gap-3 p-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:p-5">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-900 text-base">{event.title}</h4>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                                            <span>{event.category}</span><span>• {new Date(event.date).toLocaleDateString()}</span>
                                            <span>• {event.availableSeats}/{event.totalSeats} seats available</span>
                                            <span>• {event.ticketPrice === 0 ? 'Free' : `₹${event.ticketPrice}`}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteEvent(event._id)} className="shrink-0 rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 sm:text-sm">Delete Event</button>
                                </li>
                            ))
                        }
                    </ul>
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
                        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
                            <div><h2 className="text-lg font-extrabold tracking-tight text-gray-950 sm:text-xl">Booking Requests</h2><p className="mt-1 text-sm text-gray-500">Review uploaded UPI payment screenshots before approving paid bookings.</p></div>
                            <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-bold">{bookings.length} requests</span>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            {bookings.length === 0 ? <li className="p-8 text-center text-gray-500">No booking requests yet.</li> :
                                bookings.map(booking => (
                                    <li key={booking._id} className={`border-l-4 p-4 transition sm:p-5 ${booking.status === 'pending' ? 'border-l-yellow-400' : booking.status === 'confirmed' ? 'border-l-green-400' : 'border-l-red-400'}`}>
                                        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
                                            <div><h4 className="font-bold text-gray-900 text-lg">{booking.eventId?.title || 'Deleted Event'}</h4><p className="text-sm text-gray-500 mt-1">{booking.userId?.name} · {booking.userId?.email}</p></div>
                                            <div className="flex sm:flex-col gap-2 sm:items-end">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{booking.status}</span>
                                                {booking.status !== 'cancelled' && <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${booking.paymentStatus === 'paid' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>{booking.paymentStatus.replace('_', ' ')}</span>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm sm:grid-cols-4 sm:p-4">
                                            <div><p className="text-xs uppercase text-gray-400 font-bold">Amount</p><p className="font-bold text-gray-900">{booking.amount === 0 ? 'Free' : `₹${booking.amount}`}</p></div>
                                            <div><p className="text-xs uppercase text-gray-400 font-bold">Tickets</p><p className="font-bold text-gray-900">{booking.quantity || 1}</p></div>
                                            <div><p className="text-xs uppercase text-gray-400 font-bold">Requested</p><p className="font-semibold text-gray-700">{new Date(booking.bookedAt).toLocaleString()}</p></div>
                                            <div><p className="text-xs uppercase text-gray-400 font-bold">Seats left</p><p className="font-bold text-gray-900">{booking.eventId?.availableSeats ?? '—'}</p></div>
                                        </div>
                                        {booking.amount > 0 && (
                                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                                {booking.paymentProofUploadedAt ? (
                                                    <>
                                                        <button onClick={() => handleViewPaymentProof(booking._id)} disabled={proofLoading === booking._id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-800 transition hover:bg-gray-100 disabled:opacity-50">
                                                            {proofLoading === booking._id ? 'Loading screenshot...' : 'View Payment Screenshot'}
                                                        </button>
                                                        <span className="text-xs text-gray-500">Uploaded {new Date(booking.paymentProofUploadedAt).toLocaleString()}</span>
                                                    </>
                                                ) : <span className="text-xs font-semibold text-amber-700">No payment screenshot uploaded</span>}
                                            </div>
                                        )}
                                        {booking.status === 'pending' && (
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                <button disabled={!!processingBooking} onClick={() => handleConfirmBooking(booking._id, 'paid')} className="flex-1 min-w-[140px] bg-green-50 text-green-700 hover:bg-green-600 hover:text-white border border-green-200 text-sm font-bold py-2.5 px-3 rounded-lg transition disabled:opacity-50">{processingBooking === booking._id ? 'Processing...' : '✓ Approve as Paid'}</button>
                                                <button disabled={!!processingBooking} onClick={() => handleConfirmBooking(booking._id, 'not_paid')} className="flex-1 min-w-[140px] bg-gray-50 text-gray-700 hover:bg-gray-800 hover:text-white border border-gray-200 text-sm font-bold py-2.5 px-3 rounded-lg transition disabled:opacity-50">{processingBooking === booking._id ? 'Processing...' : '✓ Approve Undecided'}</button>
                                                <button onClick={() => handleCancelBooking(booking._id)} className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 text-sm font-bold py-2.5 px-4 rounded-lg transition">✕ Reject</button>
                                            </div>
                                        )}
                                    </li>
                                ))
                            }
                        </ul>
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

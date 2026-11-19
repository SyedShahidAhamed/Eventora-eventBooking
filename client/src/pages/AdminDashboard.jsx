import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import { useNavigate } from 'react-router-dom';
import TicketScanner from '../components/TicketScanner';

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
            setShowEventForm(false);
            setFormData({ title: '', description: '', date: '', location: '', category: '', totalSeats: '', ticketPrice: '', image: '' });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Error creating event');
        }
    };

    const handleDeleteEvent = async (id) => {
        if (window.confirm('Are you sure you want to delete this event?')) {
            try {
                await api.delete(`/events/${id}`);
                fetchData();
            } catch (error) {
                alert('Error deleting event');
            }
        }
    };

    const handleConfirmBooking = async (id, paymentStatus) => {
        if (processingBooking) return;
        setProcessingBooking(id);
        try {
            const { data } = await api.put(`/bookings/${id}/confirm`, { paymentStatus });
            // Reflect the approval immediately; refresh the complete dashboard in the background.
            setBookings(current => current.map(b => b._id === id ? { ...b, ...data.booking } : b));
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Error confirming booking');
        } finally { setProcessingBooking(''); }
    };

    const handleViewPaymentProof = async (bookingId) => {
        setProofLoading(bookingId);
        try {
            const { data } = await api.get(`/bookings/${bookingId}/payment-proof`, { responseType: 'blob' });
            setProofPreview(URL.createObjectURL(data));
        } catch (error) {
            alert(error.response?.data?.message || 'Unable to load payment screenshot');
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
        if (window.confirm('Cancel this user\'s booking request?')) {
            try {
                await api.delete(`/bookings/${id}`);
                setBookings(current => current.map(b => b._id === id ? { ...b, status: 'cancelled', ticketStatus: b.ticketStatus === 'valid' ? 'revoked' : b.ticketStatus } : b));
                fetchData();
            } catch (error) {
                alert(error.response?.data?.message || 'Error cancelling booking');
            }
        }
    };

    if (loading) return <div className="text-center py-20 text-xl font-semibold">Loading admin panel...</div>;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="bg-black text-white rounded-2xl p-6 sm:p-8 mb-8 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Admin Dashboard</h1>
                    <p className="text-gray-300">Manage events and manually confirm bookings.</p>
                </div>
                <button
                    onClick={() => setShowEventForm(!showEventForm)}
                    className="w-full md:w-auto bg-white text-black font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition shadow-md"
                >
                    {showEventForm ? 'Cancel Creation' : '+ Create New Event'}
                </button>
            </div>

            {/* Admin Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Total Revenue</p>
                        <h3 className="text-3xl font-black text-green-600">₹{bookings.reduce((sum, b) => b.paymentStatus === 'paid' && b.status === 'confirmed' ? sum + b.amount : sum, 0)}</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-xl font-bold">₹</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Paid Clients</p>
                        <h3 className="text-3xl font-black text-blue-600">{new Set(bookings.filter(b => b.paymentStatus === 'paid' && b.status === 'confirmed').map(b => b.userId?._id)).size}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-xl font-bold">👤</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Pending Requests</p>
                        <h3 className="text-3xl font-black text-yellow-600">{bookings.filter(b => b.status === 'pending').length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xl font-bold">⏳</div>
                </div>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div><h2 className="text-xl font-extrabold text-gray-900">Event Entry Scanner</h2><p className="text-sm text-gray-500 mt-1">Scan each confirmed ticket once at the entrance.</p></div>
                    <button onClick={() => { setScanResult(null); setShowTicketScanner(true); }} className="bg-gray-900 hover:bg-black text-white font-bold px-5 py-3 rounded-lg">Open QR Scanner</button>
                </div>
                <form className="mt-4 flex flex-col sm:flex-row gap-2" onSubmit={e => { e.preventDefault(); handleScanTicket(manualTicketCode); }}>
                    <input value={manualTicketCode} onChange={e => setManualTicketCode(e.target.value)} placeholder="Or enter ticket code manually" className="flex-1 border rounded-lg px-4 py-3" />
                    <button disabled={!manualTicketCode.trim() || scanning} className="bg-gray-100 font-bold px-5 py-3 rounded-lg disabled:opacity-50">{scanning ? 'Verifying...' : 'Verify Ticket'}</button>
                </form>
                {scanResult && <div className={`mt-4 rounded-lg p-4 border ${scanResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}><strong>{scanResult.success ? '✓ Entry approved' : '✕ Entry denied'}</strong><p className="text-sm mt-1">{scanResult.message}</p>{scanResult.success && <p className="text-sm mt-1">Attendee: <b>{scanResult.attendee}</b> · Event: <b>{scanResult.event}</b></p>}</div>}
            </section>
            {showTicketScanner && <TicketScanner onClose={() => setShowTicketScanner(false)} onDetected={handleScanTicket} />}

            {showEventForm && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 animation-slideDown">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Event</h2>
                    <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input required type="text" placeholder="Event Title" className="border px-4 py-3 rounded-lg focus:ring-2 focus:ring-gray-700 outline-none transition" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        <input required type="text" placeholder="Category (e.g., Tech, Music)" className="border px-4 py-3 rounded-lg focus:ring-2 focus:ring-gray-700 outline-none transition" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                        <input required type="date" className="border px-4 py-3 rounded-lg focus:ring-2 focus:ring-gray-700 outline-none transition" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        <input required type="text" placeholder="Location" className="border px-4 py-3 rounded-lg focus:ring-2 focus:ring-gray-700 outline-none transition" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                        <input required type="number" placeholder="Total Seats" className="border px-4 py-3 rounded-lg focus:ring-2 focus:ring-gray-700 outline-none transition" value={formData.totalSeats} onChange={e => setFormData({ ...formData, totalSeats: e.target.value })} />
                        <input required type="number" placeholder="Ticket Price (0 for free)" className="border px-4 py-3 rounded-lg focus:ring-2 focus:ring-gray-700 outline-none transition" value={formData.ticketPrice} onChange={e => setFormData({ ...formData, ticketPrice: e.target.value })} />

                        <div className="md:col-span-2">
                            <input type="text" placeholder="Image URL (Provide any direct link to an image)" className="w-full border px-4 py-3 rounded-lg focus:ring-2 focus:ring-gray-700 outline-none transition" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} />
                        </div>

                        <textarea required placeholder="Event Description" className="border px-4 py-3 rounded-lg md:col-span-2 h-32 focus:ring-2 focus:ring-gray-700 outline-none transition" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        <button type="submit" className="md:col-span-2 bg-gray-900 text-white font-bold py-3 mt-2 rounded-lg hover:bg-black transition shadow-md">Publish Event</button>
                    </form>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-2 mb-6 flex gap-2 shadow-sm">
                <button onClick={() => setActiveTab('events')} className={`flex-1 rounded-lg px-5 py-3 font-extrabold transition ${activeTab === 'events' ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                    ALL EVENTS <span className="ml-2 text-xs opacity-75">{events.length}</span>
                </button>
                <button onClick={() => setActiveTab('bookings')} className={`flex-1 rounded-lg px-5 py-3 font-extrabold transition ${activeTab === 'bookings' ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
                    BOOKING REQUESTS <span className="ml-2 text-xs opacity-75">{bookings.filter(b => b.status === 'pending').length}</span>
                </button>
            </div>

            {activeTab === 'events' ? (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div><h2 className="text-xl font-extrabold text-gray-900">All Events</h2><p className="text-sm text-gray-500 mt-1">Manage your published events and available seats.</p></div>
                        <span className="rounded-full bg-gray-100 text-gray-700 px-3 py-1 text-sm font-bold">{events.length} events</span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {events.length === 0 ? <li className="p-8 text-center text-gray-500">No events created yet.</li> :
                            events.map(event => (
                                <li key={event._id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-900 text-base">{event.title}</h4>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                                            <span>{event.category}</span><span>• {new Date(event.date).toLocaleDateString()}</span>
                                            <span>• {event.availableSeats}/{event.totalSeats} seats available</span>
                                            <span>• {event.ticketPrice === 0 ? 'Free' : `₹${event.ticketPrice}`}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteEvent(event._id)} className="text-red-600 hover:bg-red-50 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold transition shrink-0">Delete Event</button>
                                </li>
                            ))
                        }
                    </ul>
                </section>
            ) : (
                <div className="space-y-6">
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div><h2 className="text-xl font-extrabold text-gray-900">Event Entry Scanner</h2><p className="text-sm text-gray-500 mt-1">Scan each confirmed booking QR once at the entrance.</p></div>
                            <button onClick={() => { setScanResult(null); setShowTicketScanner(true); }} className="bg-gray-900 hover:bg-black text-white font-bold px-5 py-3 rounded-lg">Open QR Scanner</button>
                        </div>
                        <form className="mt-4 flex flex-col sm:flex-row gap-2" onSubmit={e => { e.preventDefault(); handleScanTicket(manualTicketCode); }}>
                            <input value={manualTicketCode} onChange={e => setManualTicketCode(e.target.value)} placeholder="Or enter ticket code manually" className="flex-1 border rounded-lg px-4 py-3" />
                            <button disabled={!manualTicketCode.trim() || scanning} className="bg-gray-100 font-bold px-5 py-3 rounded-lg disabled:opacity-50">{scanning ? 'Verifying...' : 'Verify Ticket'}</button>
                        </form>
                        {scanResult && <div className={`mt-4 rounded-lg p-4 border ${scanResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <strong>{scanResult.success ? '✓ Entry approved' : '✕ Entry denied'}</strong><p className="text-sm mt-1">{scanResult.message}</p>
                            {scanResult.success && <p className="text-sm mt-1">Attendee: <b>{scanResult.attendee}</b> · Event: <b>{scanResult.event}</b> · Tickets: <b>{scanResult.quantity || 1}</b></p>}
                        </div>}
                    </section>

                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div><h2 className="text-xl font-extrabold text-gray-900">Booking Requests</h2><p className="text-sm text-gray-500 mt-1">Review uploaded UPI payment screenshots before approving paid bookings.</p></div>
                            <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-bold">{bookings.length} requests</span>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            {bookings.length === 0 ? <li className="p-8 text-center text-gray-500">No booking requests yet.</li> :
                                bookings.map(booking => (
                                    <li key={booking._id} className={`p-5 transition border-l-4 ${booking.status === 'pending' ? 'border-l-yellow-400' : booking.status === 'confirmed' ? 'border-l-green-400' : 'border-l-red-400'}`}>
                                        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
                                            <div><h4 className="font-bold text-gray-900 text-lg">{booking.eventId?.title || 'Deleted Event'}</h4><p className="text-sm text-gray-500 mt-1">{booking.userId?.name} · {booking.userId?.email}</p></div>
                                            <div className="flex sm:flex-col gap-2 sm:items-end">
                                                <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{booking.status}</span>
                                                {booking.status !== 'cancelled' && <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${booking.paymentStatus === 'paid' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>{booking.paymentStatus.replace('_', ' ')}</span>}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div><p className="text-xs uppercase text-gray-400 font-bold">Amount</p><p className="font-bold text-gray-900">{booking.amount === 0 ? 'Free' : `₹${booking.amount}`}</p></div>
                                            <div><p className="text-xs uppercase text-gray-400 font-bold">Tickets</p><p className="font-bold text-gray-900">{booking.quantity || 1}</p></div>
                                            <div><p className="text-xs uppercase text-gray-400 font-bold">Requested</p><p className="font-semibold text-gray-700">{new Date(booking.bookedAt).toLocaleString()}</p></div>
                                            <div><p className="text-xs uppercase text-gray-400 font-bold">Seats left</p><p className="font-bold text-gray-900">{booking.eventId?.availableSeats ?? '—'}</p></div>
                                        </div>
                                        {booking.amount > 0 && (
                                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                                {booking.paymentProofUploadedAt ? (
                                                    <>
                                                        <button onClick={() => handleViewPaymentProof(booking._id)} disabled={proofLoading === booking._id} className="rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 text-sm font-bold disabled:opacity-50">
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
            {proofPreview && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => { URL.revokeObjectURL(proofPreview); setProofPreview(''); }}>
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3"><h3 className="font-extrabold text-gray-900">Payment Screenshot</h3><button onClick={() => { URL.revokeObjectURL(proofPreview); setProofPreview(''); }} className="rounded-lg px-3 py-2 bg-gray-100 hover:bg-gray-200 font-bold">Close ✕</button></div>
                        <img src={proofPreview} alt="User uploaded payment proof" className="max-h-[75vh] w-full object-contain rounded-lg bg-gray-50" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

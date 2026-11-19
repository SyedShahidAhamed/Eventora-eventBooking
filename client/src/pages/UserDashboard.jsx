import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTicketAlt, FaCalendarAlt, FaMapMarkerAlt, FaClock, FaSearch, FaArrowRight, FaTimes, FaCheckCircle, FaHourglassHalf, FaCompass, FaSyncAlt } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/axios';
import DigitalTicket from '../components/DigitalTicket';

const dateLabel = (value) => {
    if (!value) return 'Date to be announced';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date to be announced' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const readable = (value = '') => value.replaceAll('_', ' ');

const UserDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const fetchBookings = useCallback(async (quiet = false) => {
        try {
            quiet ? setRefreshing(true) : setLoading(true);
            const { data } = await api.get('/bookings/my');
            setBookings(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching bookings', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchBookings();
    }, [user, navigate, fetchBookings]);

    const cancelBooking = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this booking request?')) return;
        try { await api.delete(`/bookings/${id}`); await fetchBookings(true); }
        catch (error) { window.alert(error.response?.data?.message || 'Unable to cancel this booking.'); }
    };

    const visibleBookings = useMemo(() => bookings.filter((booking) => {
        const event = booking.eventId;
        const date = event?.date ? new Date(event.date) : null;
        const upcoming = date && date >= new Date() && booking.status !== 'cancelled';
        const matchesFilter = filter === 'all' || (filter === 'upcoming' && upcoming) || (filter === 'past' && date && date < new Date()) || (filter === 'pending' && booking.status === 'pending');
        const query = search.trim().toLowerCase();
        const matchesSearch = !query || `${event?.title || ''} ${event?.location || ''} ${event?.category || ''}`.toLowerCase().includes(query);
        return matchesFilter && matchesSearch;
    }).sort((a, b) => new Date(b.bookedAt || b.createdAt || 0) - new Date(a.bookedAt || a.createdAt || 0)), [bookings, filter, search]);

    const confirmed = bookings.filter((item) => item.status === 'confirmed').length;
    const pending = bookings.filter((item) => item.status === 'pending').length;
    const upcoming = bookings.filter((item) => item.eventId?.date && new Date(item.eventId.date) >= new Date() && item.status !== 'cancelled').length;

    if (loading) return <div className="min-h-[65vh] flex items-center justify-center"><div className="text-center"><div className="w-10 h-10 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" /><p className="text-sm font-medium text-gray-500">Preparing your dashboard…</p></div></div>;

    const firstName = user?.name?.trim().split(' ')[0] || 'there';
    return (
        <div className="max-w-7xl mx-auto pb-12">
            <section className="relative overflow-hidden rounded-3xl bg-gray-950 text-white px-6 py-8 sm:px-10 sm:py-10 mb-8">
                <div className="absolute -right-16 -top-24 w-72 h-72 rounded-full border border-white/10" />
                <div className="absolute -right-2 -bottom-40 w-80 h-80 rounded-full border border-white/10" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-7">
                    <div><p className="text-xs uppercase tracking-[0.24em] text-gray-400 font-bold mb-3">Your Eventora space</p><h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Welcome back, {firstName}.</h1><p className="text-gray-300 mt-3 max-w-xl text-sm sm:text-base leading-relaxed">Your plans, passes and event bookings — all in one place.</p></div>
                    <Link to="/" className="inline-flex items-center justify-center gap-3 bg-white text-gray-950 hover:bg-gray-200 px-5 py-3 rounded-xl font-bold text-sm transition w-full md:w-auto"><FaCompass /> Discover events <FaArrowRight className="text-xs" /></Link>
                </div>
                <div className="relative z-10 mt-8 pt-5 border-t border-white/10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400"><span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-white" /> Personal dashboard</span><span>Manage your bookings and digital tickets</span></div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-9">
                {[[FaTicketAlt, 'Total bookings', bookings.length], [FaCheckCircle, 'Confirmed', confirmed], [FaHourglassHalf, 'Awaiting approval', pending]].map(([Icon, label, value]) => <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-900 flex items-center justify-center text-lg"><Icon /></div><div><p className="text-xs uppercase tracking-wider font-bold text-gray-500">{label}</p><p className="text-2xl font-black text-gray-950 mt-1">{value}</p></div></div>)}
            </section>

            <section>
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-5">
                    <div><p className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">Your activity</p><h2 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">My bookings</h2><p className="text-sm text-gray-500 mt-1">{upcoming} upcoming {upcoming === 1 ? 'experience' : 'experiences'}</p></div>
                    <div className="flex flex-col sm:flex-row gap-3"><div className="relative"><FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your bookings" className="w-full sm:w-64 pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300" /></div><button onClick={() => fetchBookings(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"><FaSyncAlt className={refreshing ? 'animate-spin' : ''} /> Refresh</button></div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-5">{[['all', 'All bookings'], ['upcoming', 'Upcoming'], ['pending', 'Pending'], ['past', 'Past events']].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-bold border transition ${filter === value ? 'bg-gray-950 border-gray-950 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-950'}`}>{label}</button>)}</div>

                {visibleBookings.length === 0 ? <div className="bg-white border border-gray-200 rounded-2xl px-6 py-14 sm:py-20 text-center"><div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center text-2xl mx-auto mb-5"><FaTicketAlt /></div><h3 className="text-xl font-extrabold text-gray-950 mb-2">{bookings.length === 0 ? 'Your next experience starts here.' : 'No bookings match this view.'}</h3><p className="text-sm text-gray-500 max-w-md mx-auto mb-6">{bookings.length === 0 ? 'Explore what is happening and reserve your place at an event you love.' : 'Try another filter or search term to find the booking you are looking for.'}</p>{bookings.length === 0 ? <Link to="/" className="inline-flex items-center gap-2 bg-gray-950 hover:bg-black text-white px-6 py-3 rounded-xl text-sm font-bold transition">Explore events <FaArrowRight /></Link> : <button onClick={() => { setFilter('all'); setSearch(''); }} className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-bold">Clear filters</button>}</div> : (
                    <div className="space-y-5">{visibleBookings.map((booking) => {
                        const event = booking.eventId;
                        const eventDate = event?.date ? new Date(event.date) : null;
                        const isPast = eventDate && eventDate < new Date();
                        const status = booking.status || 'pending';
                        return <article key={booking._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition"><div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
                            <div className="relative h-48 md:h-full min-h-[190px] bg-gray-100 overflow-hidden">{event?.image ? <img src={event.image} alt={event.title || 'Event'} className="w-full h-full object-cover" /> : <div className="w-full h-full min-h-[190px] flex flex-col items-center justify-center bg-gray-100 text-gray-400"><FaTicketAlt className="text-3xl mb-3" /><span className="text-xs uppercase tracking-widest font-bold">{event?.category || 'Eventora event'}</span></div>}{event?.category && <span className="absolute left-4 top-4 px-3 py-1.5 bg-white/95 text-gray-800 rounded-full text-[10px] uppercase tracking-wider font-black">{event.category}</span>}</div>
                            <div className="p-5 sm:p-6 min-w-0">{event ? <><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4"><div className="min-w-0"><p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-bold mb-2">Booking reference · {booking._id.slice(-8).toUpperCase()}</p><h3 className="text-xl sm:text-2xl font-extrabold text-gray-950 leading-tight">{event.title}</h3></div><div className="flex flex-wrap gap-2 sm:justify-end shrink-0"><span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-black uppercase tracking-wider">{readable(status)}</span>{status !== 'cancelled' && <span className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-wider">{readable(booking.paymentStatus || 'not_paid')}</span>}</div></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 text-sm text-gray-600 mb-5"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700"><FaCalendarAlt /></span><span><small className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Event date</small><strong className="text-gray-900">{dateLabel(event.date)}</strong></span></div><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700"><FaMapMarkerAlt /></span><span className="min-w-0"><small className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Location</small><strong className="text-gray-900 truncate block">{event.location || 'Location TBA'}</strong></span></div><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700"><FaTicketAlt /></span><span><small className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold">Tickets · Total</small><strong className="text-gray-900">{booking.quantity || 1} · {booking.amount === 0 ? 'Free' : `₹${Number(booking.amount || 0).toLocaleString('en-IN')}`}</strong></span></div></div>
                                {booking.status === 'confirmed' && <DigitalTicket booking={booking} />}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100"><p className="text-xs text-gray-400 inline-flex items-center gap-2"><FaClock /> Booked {dateLabel(booking.bookedAt || booking.createdAt)}</p><div className="flex items-center gap-4"><Link to={`/events/${event._id}`} className="text-sm font-bold text-gray-800 hover:text-black inline-flex items-center gap-2">Event details <FaArrowRight className="text-xs" /></Link>{status !== 'cancelled' && booking.ticketStatus !== 'used' && !isPast && <button onClick={() => cancelBooking(booking._id)} className="text-sm font-semibold text-gray-500 hover:text-gray-950 inline-flex items-center gap-1.5"><FaTimes className="text-xs" /> Cancel</button>}</div></div>
                            </> : <div className="h-full flex flex-col justify-center"><p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">Booking reference · {booking._id.slice(-8).toUpperCase()}</p><h3 className="text-lg font-bold text-gray-900">Event details unavailable</h3><p className="text-sm text-gray-500 mt-2">This event may have been removed. Contact the event organizer if you need help with this booking.</p><span className="mt-4 inline-flex w-fit px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold uppercase">{readable(status)}</span></div>}</div>
                        </div></article>;
                    })}</div>
                )}
            </section>
            <div className="mt-10 border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400"><span>Eventora · Your experiences, organized.</span><Link to="/" className="font-bold text-gray-600 hover:text-black inline-flex items-center gap-2">Find your next event <FaArrowRight /></Link></div>
        </div>
    );
};
export default UserDashboard;

import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { AuthContext } from '../context/AuthContext';
import { FaCalendarAlt, FaMapMarkerAlt, FaChair, FaMoneyBillWave } from 'react-icons/fa';

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const { data } = await api.get(`/events/${id}`);
                setEvent(data);
            } catch {
                setError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const startBooking = async () => {
        if (!user) return navigate('/login');
        if (bookingLoading || !event) return;
        setBookingLoading(true);
        setError('');
        try {
            await api.post('/bookings/send-otp');
            navigate(`/events/${event._id}/payment`, { state: { event, quantity } });
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to send booking OTP. Please try again.');
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 text-xl font-semibold">Loading...</div>;
    if (!event) return <div className="text-center py-20 text-xl text-red-500">{error || 'Event not found'}</div>;

    const isSoldOut = event.availableSeats <= 0;
    const maxSelectable = Math.max(1, Math.min(5, event.availableSeats));
    const totalAmount = Number(event.ticketPrice || 0) * quantity;

    return (
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden mt-8">
            {event.image ? <img src={event.image} alt={event.title} className="w-full h-80 object-cover" /> :
                <div className="w-full h-64 bg-gray-900 flex items-center justify-center text-white/50 text-6xl font-black uppercase tracking-widest">{event.category}</div>}
            <div className="p-6 md:p-10">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_330px] gap-8">
                    <div>
                        <div className="inline-block bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3">{event.category}</div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">{event.title}</h1>
                        <p className="text-gray-600 text-lg leading-relaxed">{event.description}</p>
                    </div>
                    <aside className="bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm h-fit">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Booking Details</h3>
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-4 text-gray-600"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900"><FaMoneyBillWave /></div><div><p className="text-sm font-semibold text-gray-400 uppercase">Ticket Price</p><p className="font-bold text-gray-800 text-lg">{totalAmount === 0 ? <span className="text-green-600">Free</span> : `₹${event.ticketPrice}`}</p></div></div>
                            <div className="flex items-center gap-4 text-gray-600"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900"><FaChair /></div><div><p className="text-sm font-semibold text-gray-400 uppercase">Availability</p><p className="font-bold text-gray-800">{event.availableSeats} / {event.totalSeats}</p></div></div>
                            <div className="flex items-center gap-4 text-gray-600"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900"><FaCalendarAlt /></div><div><p className="text-sm font-semibold text-gray-400 uppercase">Date</p><p className="font-bold text-gray-800">{new Date(event.date).toLocaleDateString()}</p></div></div>
                            <div className="flex items-center gap-4 text-gray-600"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900"><FaMapMarkerAlt /></div><div><p className="text-sm font-semibold text-gray-400 uppercase">Location</p><p className="font-bold text-gray-800">{event.location}</p></div></div>
                        </div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Number of tickets (max 5)</label>
                        <select value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-4 py-3 font-semibold text-gray-800 mb-3">
                            {Array.from({ length: maxSelectable }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? 'ticket' : 'tickets'}</option>)}
                        </select>
                        <div className="flex justify-between text-sm mb-5"><span className="text-gray-500">Total amount</span><strong className="text-gray-900 text-lg">{totalAmount === 0 ? 'FREE' : `₹${totalAmount.toLocaleString('en-IN')}`}</strong></div>
                        <button onClick={startBooking} disabled={isSoldOut || bookingLoading} className="w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg bg-gray-900 hover:bg-black text-white disabled:bg-gray-300">{bookingLoading ? 'Sending OTP...' : isSoldOut ? 'Sold Out' : 'Continue to Payment'}</button>
                        {error && <p className="text-red-600 mt-4 text-center">{error}</p>}
                    </aside>
                </div>
            </div>
        </div>
    );
};
export default EventDetail;

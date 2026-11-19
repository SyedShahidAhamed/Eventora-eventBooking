import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const DigitalTicket = ({ booking }) => {
    const [qrImage, setQrImage] = useState('');
    useEffect(() => {
        let active = true;
        if (booking.ticketCode) QRCode.toDataURL(booking.ticketCode, { errorCorrectionLevel: 'H', margin: 2, width: 280 })
            .then(url => { if (active) setQrImage(url); }).catch(err => console.error('QR generation failed', err));
        return () => { active = false; };
    }, [booking.ticketCode]);
    if (booking.status !== 'confirmed' || !booking.ticketCode) return null;
    return <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-3"><div><p className="text-sm font-extrabold text-gray-900">Your Digital Ticket</p><p className="text-xs text-gray-600">Present this QR at the event entrance · Covers {booking.quantity || 1} ticket(s).</p></div><span className={`text-[10px] font-black uppercase rounded-full px-2 py-1 ${booking.ticketStatus === 'used' ? 'bg-gray-200 text-gray-700' : booking.ticketStatus === 'revoked' ? 'bg-red-100 text-gray-700' : 'bg-green-100 text-gray-600'}`}>{booking.ticketStatus}</span></div>
        {booking.ticketStatus === 'valid' && qrImage && <div className="bg-white rounded-lg p-3 w-fit mx-auto"><img src={qrImage} alt="Event ticket QR code" className="w-44 h-44" /></div>}
        {booking.ticketStatus === 'used' && <p className="text-sm text-gray-700 text-center py-3">This ticket has already been used.</p>}
        {booking.ticketStatus === 'revoked' && <p className="text-sm text-gray-700 text-center py-3">This ticket is no longer valid.</p>}
        <p className="text-[11px] text-center text-gray-500 mt-2">Ticket ID: {booking.ticketCode.slice(0, 12).toUpperCase()}</p>
        {booking.ticketStatus === 'valid' && qrImage && <a href={qrImage} download={`eventora-ticket-${booking._id}.png`} className="block text-center mt-3 bg-gray-900 hover:bg-black text-white rounded-lg py-2.5 px-4 text-sm font-bold">Download QR Ticket</a>}
    </div>;
};
export default DigitalTicket;

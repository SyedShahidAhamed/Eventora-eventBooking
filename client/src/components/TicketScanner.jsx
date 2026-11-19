import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const TicketScanner = ({ onDetected, onClose }) => {
    const scannerRef = useRef(null);
    const detectedRef = useRef(false);
    const callbackRef = useRef(onDetected);
    callbackRef.current = onDetected;
    useEffect(() => {
        const scanner = new Html5QrcodeScanner('eventora-ticket-reader', { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 }, false);
        scannerRef.current = scanner;
        scanner.render(async decoded => {
            if (detectedRef.current) return;
            detectedRef.current = true;
            try { await scanner.clear(); } catch (_) {}
            callbackRef.current(decoded);
        }, () => {});
        return () => { if (scannerRef.current) { scannerRef.current.clear().catch(() => {}); scannerRef.current = null; } };
    }, []);
    return <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5"><div className="flex justify-between items-center mb-3"><div><h3 className="text-xl font-extrabold">Scan Event Ticket</h3><p className="text-sm text-gray-500">Allow camera access and scan the attendee QR code.</p></div><button onClick={onClose} className="text-2xl text-gray-500" aria-label="Close scanner">×</button></div><div id="eventora-ticket-reader"/><p className="text-xs text-gray-500 mt-3">Camera access requires HTTPS or localhost.</p></div></div>;
};
export default TicketScanner;

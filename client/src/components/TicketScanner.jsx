
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const TicketScanner = ({ onDetected, onClose }) => {
    const scannerRef = useRef(null);
    const detectedRef = useRef(false);
    const callbackRef = useRef(onDetected);

    const [status, setStatus] = useState('Starting camera...');
    const [error, setError] = useState('');

    callbackRef.current = onDetected;

    useEffect(() => {
        let mounted = true;

        const scanner = new Html5QrcodeScanner(
            'eventora-ticket-reader',
            {
                fps: 10,
                qrbox: { width: 230, height: 230 },
                aspectRatio: 1,
                videoConstraints: {
                    facingMode: { ideal: 'environment' }
                }
            },
            false
        );

        scannerRef.current = scanner;

        scanner.render(
            async (decodedText) => {
                if (detectedRef.current || !mounted) return;

                detectedRef.current = true;
                setStatus('QR code detected!');

                try {
                    await scanner.clear();
                } catch (err) {
                    console.warn('Scanner cleanup:', err);
                }

                if (mounted) {
                    callbackRef.current?.(decodedText);
                }
            },
            (scanError) => {
                // Normal QR decoding failures happen while searching.
                // Do not display every failed frame as a camera error.
                console.debug('QR scan:', scanError);
            }
        );

        setStatus('Initializing camera...');

        // html5-qrcode reports camera startup errors through its UI.
        // Also expose a useful fallback message.
        const timeout = setTimeout(() => {
            if (mounted && !detectedRef.current) {
                setStatus('Waiting for camera...');
            }
        }, 3000);

        return () => {
            mounted = false;
            clearTimeout(timeout);

            if (scannerRef.current) {
                scannerRef.current.clear()
                    .catch(err => console.warn('Scanner cleanup:', err));

                scannerRef.current = null;
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5">

                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h3 className="text-xl font-extrabold">
                            Scan Event Ticket
                        </h3>

                        <p className="text-sm text-gray-500">
                            Allow camera access and scan the attendee QR code.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-2xl text-gray-500"
                        aria-label="Close scanner"
                    >
                        ×
                    </button>
                </div>

                <div className="text-sm font-medium text-gray-700 mb-2">
                    {status}
                </div>

                {error && (
                    <p className="text-sm text-red-600 mb-2">
                        {error}
                    </p>
                )}

                <div id="eventora-ticket-reader" />

                <p className="text-xs text-gray-500 mt-3">
                    Make sure camera permission is enabled in your browser.
                </p>
            </div>
        </div>
    );
};

export default TicketScanner;

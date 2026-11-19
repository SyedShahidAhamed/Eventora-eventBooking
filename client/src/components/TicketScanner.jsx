
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const TicketScanner = ({ onDetected, onClose }) => {
    const scannerRef = useRef(null);
    const detectedRef = useRef(false);
    const callbackRef = useRef(onDetected);
    const mountedRef = useRef(false);

    const [status, setStatus] = useState('Initializing camera...');
    const [error, setError] = useState('');
    const [cameraReady, setCameraReady] = useState(false);

    // Always use the latest callback from the parent component.
    callbackRef.current = onDetected;

    useEffect(() => {
        let scanner = null;
        let cancelled = false;

        mountedRef.current = true;
        detectedRef.current = false;

        const startScanner = async () => {
            try {
                setStatus('Requesting camera access...');
                setError('');

                if (!window.isSecureContext) {
                    throw new Error(
                        'Camera requires HTTPS or localhost. Please open the secure website.'
                    );
                }

                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error(
                        'Your browser does not support camera access.'
                    );
                }

                scanner = new Html5Qrcode('eventora-ticket-reader', {
                    verbose: false
                });

                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: {
                            width: 230,
                            height: 230
                        },
                        aspectRatio: 1,
                        disableFlip: false
                    },
                    async (decodedText) => {
                        if (
                            detectedRef.current ||
                            cancelled ||
                            !mountedRef.current
                        ) {
                            return;
                        }

                        detectedRef.current = true;

                        setStatus('QR code detected successfully!');
                        setCameraReady(false);

                        try {
                            if (scanner.isScanning) {
                                await scanner.stop();
                            }
                        } catch (stopError) {
                            console.warn(
                                'Unable to stop scanner:',
                                stopError
                            );
                        }

                        try {
                            scanner.clear();
                        } catch (clearError) {
                            console.warn(
                                'Unable to clear scanner:',
                                clearError
                            );
                        }

                        if (!cancelled && mountedRef.current) {
                            // Send the original decoded ticket value
                            // to the existing parent validation logic.
                            callbackRef.current?.(decodedText);
                        }
                    },
                    () => {
                        // Normal QR decoding failures are expected
                        // while the camera searches for a QR code.
                    }
                );

                if (!cancelled && mountedRef.current) {
                    setCameraReady(true);
                    setStatus('Camera active. Scan the attendee QR code.');
                }
            } catch (err) {
                console.error('Eventora QR scanner error:', err);

                if (!cancelled && mountedRef.current) {
                    setCameraReady(false);
                    setStatus('Camera could not start.');

                    let message = err?.message || 'Unable to start camera.';

                    if (err?.name === 'NotAllowedError') {
                        message =
                            'Camera permission denied. Allow camera access in Chrome site settings and reload.';
                    } else if (err?.name === 'NotFoundError') {
                        message =
                            'No camera was found on this device.';
                    } else if (err?.name === 'NotReadableError') {
                        message =
                            'Camera is already being used by another application. Close other camera apps and try again.';
                    } else if (err?.name === 'OverconstrainedError') {
                        message =
                            'The requested camera is unavailable. Try another camera.';
                    }

                    setError(message);
                }
            }
        };

        startScanner();

        return () => {
            cancelled = true;
            mountedRef.current = false;

            const activeScanner = scannerRef.current;
            scannerRef.current = null;

            if (activeScanner) {
                const cleanup = async () => {
                    try {
                        if (activeScanner.isScanning) {
                            await activeScanner.stop();
                        }
                    } catch (stopError) {
                        console.warn(
                            'Scanner stop cleanup:',
                            stopError
                        );
                    }

                    try {
                        activeScanner.clear();
                    } catch (clearError) {
                        console.warn(
                            'Scanner clear cleanup:',
                            clearError
                        );
                    }
                };

                cleanup();
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">

            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 max-h-[95vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-4">

                    <div>
                        <h3 className="text-xl font-extrabold text-gray-900">
                            Scan Event Ticket
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                            Scan the attendee's QR code to verify entry.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-3xl text-gray-500 hover:text-black transition"
                        aria-label="Close scanner"
                    >
                        ×
                    </button>

                </div>

                {/* Camera status */}
                <div className="mb-4">

                    <div className="flex items-center gap-2">

                        <span
                            className={`h-2.5 w-2.5 rounded-full ${
                                cameraReady
                                    ? 'bg-green-500'
                                    : error
                                    ? 'bg-red-500'
                                    : 'bg-yellow-500 animate-pulse'
                            }`}
                        />

                        <p className="text-sm font-semibold text-gray-700">
                            {status}
                        </p>

                    </div>

                    {error && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">

                            <p className="text-sm text-red-700">
                                {error}
                            </p>

                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="mt-2 text-sm font-bold text-red-700 underline"
                            >
                                Reload page and try again
                            </button>

                        </div>
                    )}

                </div>

                {/* QR Scanner */}
                <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-black">

                    <div
                        id="eventora-ticket-reader"
                        className="w-full"
                    />

                </div>

                {/* Instructions */}
                <div className="mt-4 rounded-lg bg-gray-50 p-3">

                    <p className="text-sm font-semibold text-gray-800">
                        Scanning instructions
                    </p>

                    <ul className="mt-2 space-y-1 text-xs text-gray-600">

                        <li>• Allow camera permission in your browser.</li>

                        <li>• Position the attendee QR code inside the scanning box.</li>

                        <li>• Keep the QR code clearly visible and steady.</li>

                        <li>• Use HTTPS when accessing the deployed website.</li>

                    </ul>

                </div>

                {/* Footer */}
                <div className="mt-4 flex justify-end">

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition"
                    >
                        Close Scanner
                    </button>

                </div>

            </div>

        </div>
    );
};

export default TicketScanner;

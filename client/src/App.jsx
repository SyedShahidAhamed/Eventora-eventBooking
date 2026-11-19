
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';
import PaymentPage from './pages/PaymentPage';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';

function AppLayout() {
    const location = useLocation();
    const isPaymentPage = location.pathname.endsWith('/payment');

    if (isPaymentPage) {
        return (
            <>
                <Routes>
                    <Route path="/events/:id/payment" element={<PaymentPage />} />
                </Routes>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/events/:id" element={<EventDetail />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<UserDashboard />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    <Route path="/payment-failed" element={<PaymentFailed />} />
                    <Route
                        path="*"
                        element={
                            <h1 className="text-3xl font-bold text-center mt-20">
                                404 - Page Not Found
                            </h1>
                        }
                    />
                </Routes>
            </main>
        </div>
    );
}

function App() {
    return (
        <Router>
            <AppLayout />

            <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                    duration: 3000,
                    style: {
                        borderRadius: '10px',
                        background: '#1f2937',
                        color: '#ffffff',
                        fontSize: '14px',
                        padding: '12px 16px'
                    },
                    success: {
                        iconTheme: {
                            primary: '#10b981',
                            secondary: '#ffffff'
                        }
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#ffffff'
                        }
                    }
                }}
            />
        </Router>
    );
}

export default App;

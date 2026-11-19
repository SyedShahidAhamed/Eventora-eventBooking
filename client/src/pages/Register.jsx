
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register, verifyOTP } = useContext(AuthContext);
    const navigate = useNavigate();

    const requirements = [
        { label: 'At least 8 characters', test: password.length >= 8 },
        { label: 'One uppercase letter (A-Z)', test: /[A-Z]/.test(password) },
        { label: 'One lowercase letter (a-z)', test: /[a-z]/.test(password) },
        { label: 'One number (0-9)', test: /[0-9]/.test(password) },
        { label: 'One special character (@#$!)', test: /[^A-Za-z0-9]/.test(password) }
    ];

    const strength = requirements.filter(item => item.test).length;

    const strengthLabel = [
        'Very Weak',
        'Weak',
        'Fair',
        'Good',
        'Almost Strong',
        'Strong'
    ];

    const strengthColor = [
        'bg-red-500',
        'bg-red-500',
        'bg-orange-500',
        'bg-yellow-500',
        'bg-emerald-400',
        'bg-green-500'
    ];

    const isPasswordStrong = strength === 5;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!showOTP && !isPasswordStrong) {
            toast.error('Please create a strong password.');
            return;
        }

        setLoading(true);

        try {
            if (!showOTP) {
                await register(name, email, password);

                setShowOTP(true);
                toast.success('OTP sent to your email. Please verify your account.');
            } else {
                await verifyOTP(email, otp);

                toast.success('Account created successfully! Welcome to Eventora.');
                navigate('/dashboard');
            }
        } catch (err) {
            toast.error(
                err.response?.data?.message ||
                err.message ||
                (typeof err === 'string' ? err : 'Something went wrong. Please try again.')
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16 mb-10 bg-white p-8 rounded-xl shadow-lg border border-gray-100">

            <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                    Create an Account
                </h2>
                <p className="text-gray-500">
                    Join Eventora today
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

                {!showOTP ? (
                    <>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Full Name
                            </label>

                            <input
                                type="text"
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 transition shadow-sm"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                            </label>

                            <input
                                type="email"
                                required
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 transition shadow-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Password
                            </label>

                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 transition shadow-sm"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>

                            {/* Password Strength */}
                            {password.length > 0 && (
                                <div className="mt-3">

                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-semibold text-gray-600">
                                            Password Strength
                                        </span>

                                        <span className={`text-xs font-bold ${
                                            strength <= 1 ? 'text-red-500' :
                                            strength === 2 ? 'text-orange-500' :
                                            strength === 3 ? 'text-yellow-600' :
                                            strength === 4 ? 'text-emerald-600' :
                                            'text-green-600'
                                        }`}>
                                            {strengthLabel[strength]}
                                        </span>
                                    </div>

                                    <div className="flex gap-1.5">
                                        {requirements.map((item, index) => (
                                            <div
                                                key={index}
                                                className={`h-1.5 flex-1 rounded-full transition-all ${
                                                    index < strength
                                                        ? strengthColor[strength]
                                                        : 'bg-gray-200'
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    <div className="mt-3 space-y-2">
                                        {requirements.map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2 text-xs"
                                            >
                                                {item.test ? (
                                                    <FaCheckCircle className="text-green-500" />
                                                ) : (
                                                    <FaTimesCircle className="text-gray-300" />
                                                )}

                                                <span className={
                                                    item.test
                                                        ? 'text-green-700'
                                                        : 'text-gray-500'
                                                }>
                                                    {item.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div>
                        <p className="text-sm text-green-700 bg-green-50 p-3 mb-4 rounded border border-green-200">
                            An OTP has been sent to your email. Please verify your account.
                        </p>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Verification Code (OTP)
                        </label>

                        <input
                            type="text"
                            required
                            placeholder="6-digit code"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-gray-700 transition shadow-sm font-bold tracking-widest text-center text-lg"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength="6"
                        />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || (!showOTP && !isPasswordStrong)}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-black focus:ring-4 focus:ring-gray-200 transition shadow-md mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading
                        ? 'Processing...'
                        : (showOTP ? 'Verify & Complete' : 'Sign Up')}
                </button>

            </form>

            {!showOTP && (
                <p className="text-center mt-6 text-gray-600">
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        className="text-gray-900 font-bold hover:underline"
                    >
                        Sign in
                    </Link>
                </p>
            )}

        </div>
    );
};

export default Register;

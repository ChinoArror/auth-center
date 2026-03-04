import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, Shield, Eye, EyeOff } from 'lucide-react';
import { useParams } from 'react-router-dom';

const API_BASE = '';

export default function ChangePassword() {
    const { uuid } = useParams();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/users/${uuid}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setMessage('Password updated successfully. You can now log in with your new password.');
            } else {
                setError(data.error || 'Failed to update password');
            }
        } catch (err: any) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-fuchsia-900 to-indigo-950 flex items-center justify-center p-4 overflow-hidden z-50">
            <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />
            <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-black/40 backdrop-blur-xl border border-purple-400/30 p-8 rounded-3xl shadow-2xl shadow-purple-900/50 w-full max-w-md ring-1 ring-white/10 relative z-10"
            >
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-gradient-to-tr from-blue-600 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20">
                        <KeyRound className="w-10 h-10 text-white" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">Change Password</h2>
                <p className="text-purple-300/80 text-center mb-8 font-medium">Update your account security credentials</p>

                {success ? (
                    <div className="text-center space-y-4">
                        <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl font-medium">{message}</div>
                        <p className="text-white/60 text-sm">You can close this window now.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-xl border border-red-500/30 text-sm font-medium text-center">{error}</div>}

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type={showOld ? "text" : "password"} required placeholder="Current Password"
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 font-medium rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:ring-2 focus:border-transparent focus:ring-purple-500 transition-all duration-300 pr-10"
                                    value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                                />
                                <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                                    {showOld ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className="relative">
                                <input
                                    type={showNew ? "text" : "password"} required placeholder="New Password"
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 font-medium rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:ring-2 focus:border-transparent focus:ring-emerald-500 transition-all duration-300 pr-10"
                                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                />
                                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className="relative">
                                <input
                                    type={showConfirm ? "text" : "password"} required placeholder="Confirm New Password"
                                    className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 font-medium rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:ring-2 focus:border-transparent focus:ring-emerald-500 transition-all duration-300 pr-10"
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={loading}
                            className={`w-full bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 text-white font-bold text-lg rounded-xl px-4 py-3 shadow-lg shadow-emerald-500/20 transition-all mt-6 border border-white/10 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:filter-brightness-110'}`}
                        >
                            {loading ? 'Updating...' : 'Securely Update Password'}
                        </motion.button>
                    </form>
                )}
            </motion.div>
        </div>
    );
}

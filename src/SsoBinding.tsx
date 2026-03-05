import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Eye, EyeOff, Github } from 'lucide-react';
import { useParams } from 'react-router-dom';

const API_BASE = '';

export default function SsoBinding() {
    const { uuid } = useParams();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/users/${uuid}/verify-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (res.ok && data.bind_token) {
                setMessage('Verification successful! Redirecting to GitHub...');
                window.location.href = `${API_BASE}/api/github/login?bind_token=${data.bind_token}`;
            } else {
                setError(data.error || 'Failed to verify password');
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
                    <div className="p-4 bg-gradient-to-tr from-gray-700 to-gray-900 rounded-2xl shadow-lg shadow-gray-900/50">
                        <Github className="w-10 h-10 text-white" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">Bind GitHub</h2>
                <p className="text-purple-300/80 text-center mb-8 font-medium">Verify your password to link your GitHub account</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-xl border border-red-500/30 text-sm font-medium text-center">{error}</div>}
                    {message && <div className="bg-emerald-500/20 text-emerald-300 p-3 rounded-xl border border-emerald-500/30 text-sm font-medium text-center">{message}</div>}

                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"} required placeholder="Current Password"
                                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 font-medium rounded-xl px-4 py-3 outline-none focus:bg-white/10 focus:ring-2 focus:border-transparent focus:ring-purple-500 transition-all duration-300 pr-10"
                                value={password} onChange={e => setPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        className={`w-full bg-gradient-to-r from-gray-700 to-gray-900 text-white font-bold text-lg rounded-xl px-4 py-3 shadow-lg transition-all mt-6 border border-white/10 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:filter-brightness-110'}`}
                    >
                        {loading ? 'Verifying...' : 'Verify and Bind GitHub'}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}

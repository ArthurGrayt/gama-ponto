
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { logAction } from '../services/logger';
import { Lock, Mail, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else if (data.session?.user) {
            await logAction(data.session.user.id, 'LOGIN', 'Realizou login no sistema');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center px-6 font-sans">
            <div className="w-full max-w-sm bg-white p-8 rounded-[2rem] shadow-xl animate-in zoom-in-95 duration-500">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 mb-4">
                        <img src="/logo.png" alt="Gama Ponto" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Bem-vindo</h1>
                    <p className="text-gray-500 text-sm">Faça login para continuar</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-2">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 font-medium"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-2">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center">
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center mt-6"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Entrar"}
                    </button>
                </form>

            </div>
            <p className="mt-8 text-gray-400 text-sm">Gama Ponto v1.0</p>
        </div>
    );
};

export default Login;

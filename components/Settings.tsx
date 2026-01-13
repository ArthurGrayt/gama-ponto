import React, { useState, useEffect } from 'react';
import { Save, Loader2, MapPin } from 'lucide-react';
import { setSystemConfig } from '../services/pontoService';

interface SettingsProps {
    currentRadius: number;
    onUpdate: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentRadius, onUpdate }) => {
    const [radius, setRadius] = useState<string>(currentRadius.toString());
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        setRadius(currentRadius.toString());
    }, [currentRadius]);

    const handleSaveRadius = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const val = parseFloat(radius);
            if (isNaN(val) || val < 0) {
                throw new Error("Raio inválido.");
            }

            await setSystemConfig('max_radius_km', val);
            setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
            onUpdate(); // Trigger parent refresh
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || "Erro ao salvar." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col pt-10 px-6 pb-24 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-md mx-auto flex flex-col space-y-8 animate-in fade-in duration-500">

                <div className="flex flex-col space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
                    <p className="text-gray-500 text-sm">Ajustes do sistema (Admin)</p>
                </div>

                {/* Radius Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 text-blue-600 mb-2">
                        <MapPin size={24} />
                        <h3 className="font-semibold text-gray-900">Raio de Localização</h3>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Raio Máximo (km)</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={radius}
                                onChange={(e) => setRadius(e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-lg"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">km</span>
                        </div>
                        <p className="text-xs text-gray-400">Distância máxima permitida para bater ponto sem justificativa.</p>
                    </div>

                    <button
                        onClick={handleSaveRadius}
                        disabled={loading}
                        className="w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        <span>Salvar Alterações</span>
                    </button>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-medium text-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

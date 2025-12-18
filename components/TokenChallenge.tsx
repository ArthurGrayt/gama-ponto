
import React, { useMemo } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface TokenChallengeProps {
    validToken: string;
    onSuccess: () => void;
    onFail: () => void;
    onClose: () => void;
}

export const TokenChallenge: React.FC<TokenChallengeProps> = ({ validToken, onSuccess, onFail, onClose }) => {

    // Generate options once on mount
    const options = useMemo(() => {
        const generateFake = () => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let result = '';
            for (let i = 0; i < 3; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };

        const opt1 = generateFake();
        const opt2 = generateFake();
        // Shuffle the valid token with fakes
        const all = [validToken, opt1, opt2].sort(() => Math.random() - 0.5);
        return all;
    }, [validToken]);

    const handleSelect = (selected: string) => {
        if (selected === validToken) {
            onSuccess();
        } else {
            onFail();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 flex flex-col items-center shadow-2xl animate-in slide-in-from-bottom-8 duration-300">

                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck size={32} />
                </div>

                <h2 className="text-xl font-bold text-gray-900 mb-2">Confirmação de Segurança</h2>
                <p className="text-center text-gray-500 mb-8">
                    Selecione o Token correto para validar seu ponto.
                </p>

                <div className="grid grid-cols-3 gap-3 w-full mb-6">
                    {options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(opt)}
                            className="h-16 rounded-2xl bg-gray-50 border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 text-xl font-bold text-gray-700 hover:text-blue-700 transition-all active:scale-95"
                        >
                            {opt}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="text-gray-400 text-sm font-medium hover:text-gray-600"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

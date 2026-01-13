import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Justificativa } from '../types';

interface ApprovedModalProps {
    justificativa: Justificativa | null;
    onClose: () => void;
}

export const JustificationApprovedModal: React.FC<ApprovedModalProps> = ({ justificativa, onClose }) => {
    if (!justificativa) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-2">
                    <CheckCircle size={40} />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Justificativa Aprovada!</h2>
                    <p className="text-gray-600">
                        O gestor aprovou sua justificativa de <span className="font-semibold text-gray-900 capitalize">{justificativa.tipo}</span>.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                        Os pontos foram ajustados automaticamente.
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition-all active:scale-95"
                >
                    Entendido
                </button>
            </div>
        </div>
    );
};

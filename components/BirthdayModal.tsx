import React, { useState } from 'react';
import { Calendar, Check, Loader2 } from 'lucide-react';

interface BirthdayModalProps {
    isOpen: boolean;
    onSubmit: (date: string) => Promise<void>;
    onClose: () => void;
}

export const BirthdayModal: React.FC<BirthdayModalProps> = ({ isOpen, onSubmit, onClose }) => {
    const [birthdate, setBirthdate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!birthdate) return;
        setIsSubmitting(true);
        try {
            await onSubmit(birthdate);
        } catch (error) {
            console.error("Error saving birthday:", error);
            alert("Erro ao salvar data de nascimento.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 space-y-6">

                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2">
                        <Calendar size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Data de Nascimento</h2>
                    <p className="text-gray-500">
                        Informe sua data de nascimento para completarmos seu cadastro.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Data de Nascimento</label>
                    <input
                        type="date"
                        value={birthdate}
                        onChange={(e) => setBirthdate(e.target.value)}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-base bg-gray-50"
                        max={new Date().toISOString().split("T")[0]}
                    />
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!birthdate || isSubmitting}
                        className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all active:scale-[0.98] ${isSubmitting || !birthdate
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/20'
                            }`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            <>
                                <Check size={20} />
                                <span>Confirmar</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

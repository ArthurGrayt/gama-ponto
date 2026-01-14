import React, { useEffect, useState } from 'react';
import { PartyPopper, X } from 'lucide-react';
import Confetti from 'react-confetti';

interface BirthdayCelebrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
}

export const BirthdayCelebrationModal: React.FC<BirthdayCelebrationModalProps> = ({ isOpen, onClose, username }) => {
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500">
            <Confetti
                width={windowSize.width}
                height={windowSize.height}
                recycle={false}
                numberOfPieces={500}
                gravity={0.15}
            />

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-8 space-y-6 relative animate-in zoom-in-50 duration-500">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-2"
                >
                    <X size={24} />
                </button>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                        <PartyPopper size={48} className="text-purple-600 drop-shadow-sm" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                            Feliz Aniversário!
                        </h2>
                        <h3 className="text-xl font-bold text-gray-800">
                            {username}
                        </h3>
                    </div>

                    <p className="text-gray-600 leading-relaxed">
                        Hoje é o seu dia! 🎉<br />
                        Desejamos muita felicidade, saúde e sucesso em sua jornada. Aproveite seu dia!
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    Obrigado!
                </button>
            </div>
        </div>
    );
};


import React from 'react';
import { X } from 'lucide-react';

interface TokenViewerProps {
    token: string | null;
    timeLeft: number;
    totalDuration: number;
    onClose: () => void;
}

export const TokenViewer: React.FC<TokenViewerProps> = ({ token, timeLeft, totalDuration, onClose }) => {
    // SVG Config
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const progress = timeLeft / totalDuration;
    const strokeDashoffset = circumference - (progress * circumference);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-sans">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 flex flex-col items-center relative shadow-2xl animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Circular Timer Container */}
                <div className="relative w-64 h-64 flex items-center justify-center mt-4 mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                        {/* Background Circle */}
                        <circle
                            className="text-[#E5E5E5]"
                            strokeWidth="6"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="50%"
                            cy="50%"
                        />
                        {/* Progress Circle */}
                        <circle
                            className="text-[#C19D60] transition-all duration-1000 ease-linear"
                            strokeWidth="6"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="50%"
                            cy="50%"
                        />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
                        <span className="text-[10px] font-bold text-[#AFAFAF] tracking-[0.2em] uppercase">
                            GTOKEN
                        </span>

                        {token ? (
                            <span className="text-5xl font-bold text-[#5A4B2C] tracking-tight">
                                {token}
                            </span>
                        ) : (
                            <span className="text-xl text-[#C19D60] font-medium animate-pulse">...</span>
                        )}

                        <div className="bg-[#FAF6F0] px-4 py-1.5 rounded-full flex items-center mt-3 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-[#C19D60] mr-2 animate-pulse"></div>
                            <span className="text-sm font-bold text-[#5A4B2C] font-mono">{timeLeft}s</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

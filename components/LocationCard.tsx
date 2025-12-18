
import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface LocationCardProps {
    distance: number | null;
    isWithinRadius: boolean;
    loading: boolean;
}

export const LocationCard: React.FC<LocationCardProps> = ({ distance, isWithinRadius, loading }) => {
    return (
        <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
            {/* Header */}
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                LOCALIZAÇÃO
            </h3>

            <div className="flex items-center justify-between">
                {/* Left Side: Status & Icon */}
                <div className="flex items-center gap-3">


                    <div className="flex flex-col">
                        <span className={`text-sm font-semibold ${loading ? 'text-gray-400' : isWithinRadius ? 'text-gray-700' : 'text-red-600'
                            }`}>
                            {loading ? "Localizando..." : isWithinRadius ? "Dentro do raio" : "Fora do raio"}
                        </span>
                    </div>

                    <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 ml-1">
                        <Navigation size={14} />
                    </button>
                </div>

                {/* Right Side: Distance */}
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold text-gray-900 leading-none">
                        {loading || distance === null ? "-" : distance.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">km da Sede</span>
                </div>
            </div>
        </div>
    );
};

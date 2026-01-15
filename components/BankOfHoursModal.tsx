import React, { useEffect, useState } from 'react';
import { Clock, Loader2, X } from 'lucide-react';
import { getReportData } from '../services/pontoService';

interface BankOfHoursModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const formatDecimalHours = (decimal: number): string => {
    const sign = decimal < 0 ? '-' : '';
    const absDecimal = Math.abs(decimal);
    const hours = Math.floor(absDecimal);
    const minutes = Math.round((absDecimal - hours) * 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${sign}${hours}h ${pad(minutes)}m`;
};

export const BankOfHoursModal: React.FC<BankOfHoursModalProps> = ({ isOpen, onClose, userId }) => {
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState<number>(0);
    const [totalWorked, setTotalWorked] = useState<number>(0);
    const [totalExpected, setTotalExpected] = useState<number>(0);
    const [daysWorked, setDaysWorked] = useState<number>(0);
    const [businessDays, setBusinessDays] = useState<number>(0);
    const [lastRecordDate, setLastRecordDate] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            loadData();
        }
    }, [isOpen, userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 'all' period logic now implemented in getReportData
            const data = await getReportData(userId, 'all');
            setBalance(data.balance);
            setTotalWorked(data.totalHours);
            setDaysWorked(data.daysWorked);
            setBusinessDays(data.businessDays);
            setLastRecordDate(data.lastRecordDate);
            // Calculate expected from balance for display: Balance = Worked - Expected => Expected = Worked - Balance
            setTotalExpected(data.totalHours - data.balance);
        } catch (error) {
            console.error("Error loading bank of hours:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 space-y-6 relative">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                    <X size={24} />
                </button>

                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
                        <Clock size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Banco de Horas</h2>
                    <p className="text-gray-500 text-sm px-4">
                        Saldo acumulado desde o seu primeiro registro no sistema
                        {lastRecordDate ? (
                            <> até seu ultimo ponto de fim de expediente ({new Date(lastRecordDate).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })})</>
                        ) : (
                            <> até o momento.</>
                        )}
                    </p>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="py-8 flex flex-col items-center text-gray-400 space-y-2">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <span className="text-sm">Calculando histórico...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col space-y-4">

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Trabalhado</span>
                                    <span className="text-xl font-bold text-blue-600">
                                        {formatDecimalHours(totalWorked)}
                                    </span>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Média Diária</span>
                                    <div className="flex flex-col">
                                        <span className="text-xl font-bold text-gray-900">
                                            {businessDays > 0 ? formatDecimalHours(totalWorked / businessDays) : '0h 00m'}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            Baseado em {businessDays} dias úteis
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl flex flex-col space-y-1">
                                    <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Meta (Período)</span>
                                    <div className="flex flex-col">
                                        <span className="text-xl font-bold text-gray-900">
                                            {formatDecimalHours(totalExpected)}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {businessDays} dias úteis (sem feriados) x 8h 45m
                                        </span>
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl flex flex-col space-y-1 border-2 ${balance >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                                    }`}>
                                    <span className={`text-xs font-semibold uppercase tracking-wider ${balance >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>Saldo de Horas</span>
                                    <div className="flex flex-col">
                                        <span className={`text-xl font-extrabold ${balance >= 0 ? 'text-green-700' : 'text-red-700'
                                            }`}>
                                            {balance > 0 ? '+' : ''}{formatDecimalHours(balance)}
                                        </span>
                                        <span className={`text-[10px] ${balance >= 0 ? 'text-green-600/70' : 'text-red-600/70'
                                            }`}>
                                            Meta - Trabalhado
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-xl font-bold bg-gray-900 text-white hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg"
                    >
                        Fechar
                    </button>
                </div>

            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { Calendar, Cake } from 'lucide-react';
import { getHolidays, getAllUserBirthdays } from '../services/pontoService';
import { Holiday, User } from '../types';

export const InfoTab: React.FC = () => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [birthdays, setBirthdays] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [hList, bList] = await Promise.all([
                getHolidays(),
                getAllUserBirthdays()
            ]);
            setHolidays(hList);
            setBirthdays(bList);
        } catch (error) {
            console.error("Error loading info data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getUpcomingBirthdays = () => {
        const today = new Date();
        const currentYear = today.getFullYear();

        return birthdays.map(user => {
            if (!user.birthdate) return null;
            const [y, m, d] = user.birthdate.split('-').map(Number);

            // Calculate next birthday date
            let nextBday = new Date(currentYear, m - 1, d);
            if (nextBday < new Date(today.setHours(0, 0, 0, 0))) {
                nextBday.setFullYear(currentYear + 1);
            }
            return { ...user, nextBday };
        })
            .filter((u): u is (User & { nextBday: Date }) => u !== null)
            .sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime());
    };

    return (
        <div className="w-full h-full flex flex-col pt-10 px-6 pb-24 overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-md mx-auto flex flex-col space-y-8 animate-in fade-in duration-500">

                <div className="flex flex-col space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Informações</h2>
                    <p className="text-gray-500 text-sm">Dados e avisos do sistema</p>
                </div>

                {/* Birthday Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 text-pink-500 mb-2">
                        <Cake size={24} />
                        <h3 className="font-semibold text-gray-900">Aniversariantes</h3>
                    </div>

                    <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
                        <p className="text-xs text-pink-800 leading-snug">
                            Próximos aniversariantes da equipe. Não esqueça de parabenizar! 🎉
                        </p>
                    </div>

                    <div className="space-y-3 pt-2">
                        {loading ? (
                            <div className="py-8 text-center text-gray-400 text-sm">Carregando...</div>
                        ) : birthdays.length === 0 ? (
                            <p className="text-sm text-gray-400 italic text-center py-4">Nenhum aniversário cadastrado.</p>
                        ) : (
                            <div className="flex flex-col space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                                {getUpcomingBirthdays().map((user) => (
                                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                {user.img_url ? (
                                                    <img src={user.img_url} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-gray-900 font-semibold text-sm truncate max-w-[120px]">{user.username || user.name.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm">
                                            <span className="text-gray-600 font-mono text-xs font-medium">
                                                {user.nextBday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Holidays Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 text-purple-600 mb-2">
                        <Calendar size={24} />
                        <h3 className="font-semibold text-gray-900">Próximos Feriados</h3>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <p className="text-xs text-purple-800 leading-snug">
                            Lista de feriados cadastrados no sistema. Nestas datas, o ponto é abonado automaticamente.
                        </p>
                    </div>

                    <div className="space-y-3 pt-2">
                        {loading ? (
                            <div className="py-8 text-center text-gray-400 text-sm">Carregando...</div>
                        ) : holidays.filter(h => new Date(h.data) >= new Date(new Date().setHours(0, 0, 0, 0))).length === 0 ? (
                            <p className="text-sm text-gray-400 italic text-center py-4">Nenhum próximo feriado encontrado.</p>
                        ) : (
                            <div className="flex flex-col space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                                {holidays
                                    .filter(h => new Date(h.data) >= new Date(new Date().setHours(0, 0, 0, 0)))
                                    .map((h) => (
                                        <div key={h.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-gray-900 font-semibold text-sm">{h.titulo}</span>
                                                <span className="text-gray-500 font-mono text-xs">
                                                    {new Date(h.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                </span>
                                            </div>
                                            <div className="px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold uppercase rounded-md">
                                                Feriado
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

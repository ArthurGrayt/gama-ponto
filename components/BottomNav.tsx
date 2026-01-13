import React from 'react';
import { Home, Clock, User, Settings, Info } from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  setView: (view: string) => void;
  userRole?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, userRole }) => {
  const navItemClass = (view: string) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === view ? 'text-ios-blue' : 'text-gray-400 hover:text-gray-600'}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-t border-gray-200 flex justify-around items-center pb-4 z-50">
      <button onClick={() => setView('dashboard')} className={navItemClass('dashboard')}>
        <Home size={24} strokeWidth={currentView === 'dashboard' ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Início</span>
      </button>
      <button onClick={() => setView('history')} className={navItemClass('history')}>
        <Clock size={24} strokeWidth={currentView === 'history' ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Histórico</span>
      </button>
      <button onClick={() => setView('profile')} className={navItemClass('profile')}>
        <User size={24} strokeWidth={currentView === 'profile' ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Perfil</span>
      </button>
      <button onClick={() => setView('info')} className={navItemClass('info')}>
        <Info size={24} strokeWidth={currentView === 'info' ? 2.5 : 2} />
        <span className="text-[10px] font-medium">Informações</span>
      </button>
      {userRole === 7 && (
        <button onClick={() => setView('settings')} className={navItemClass('settings')}>
          <Settings size={24} strokeWidth={currentView === 'settings' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Configurações</span>
        </button>
      )}
    </div>
  );
};
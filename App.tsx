import React, { useState, useEffect, useCallback, useRef } from 'react';
import { JustificationModal } from './components/JustificationModal';
import { JustificationApprovedModal } from './components/JustificationApprovedModal';
import { BirthdayCelebrationModal } from './components/BirthdayCelebrationModal'; // Import
import { BirthdayModal } from './components/BirthdayModal';

import { MapPin, AlertCircle, Clock, RefreshCw, Navigation, X, Eye, Lock, ShieldAlert, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { HistoryCard } from './components/HistoryCard';
import { BottomNav } from './components/BottomNav';
import { SwipeButton } from './components/SwipeButton';
import { LocationCard } from './components/LocationCard';
import { TokenViewer } from './components/TokenViewer';
import { TokenChallenge } from './components/TokenChallenge';
import Login from './components/Login';
import { Settings } from './components/Settings';
import { InfoTab } from './components/InfoTab';
import { useTokenSystem } from './hooks/useTokenSystem';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';
import { calculateDistanceKm, getTodayRegistros, registerPonto, determineNextPontoType, getUserProfile, getReportData, ReportPeriod, getHistoryRecords, calculateWorkedTime, getSystemConfig, getLastJustificativa, updateUserBirthdate } from './services/pontoService';
import { TARGET_LOCATION, MAX_RADIUS_KM, USER_MOCK } from './constants';
import { TipoPonto, PontoRegistro, GeoLocation, User, Justificativa } from './types';
import { logAction } from './services/logger';

// --- Components ---

/**
 * Gama Center Logo Component
 * Utiliza LITERALMENTE a imagem PNG enviada pelo usuário.
 */
const GamaLogo: React.FC<{ className?: string }> = ({ className = "w-28 h-28" }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <img
      src="/logo.png"
      alt="Gama Ponto Logo"
      className="w-full h-full object-contain"
    />
  </div>
);

const formatDecimalHours = (decimal: number): string => {
  const sign = decimal < 0 ? '-' : '';
  const absDecimal = Math.abs(decimal);
  const hours = Math.floor(absDecimal);
  const minutes = Math.round((absDecimal - hours) * 60);
  return `${sign}${hours}h ${minutes}m`;
};

const formatMsToTimer = (ms: number): string => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile State
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod | 'today'>('today'); // Default to today? Or day? User said "profile deve ter uma parte Hoje do lado de Dia".
  const [reportData, setReportData] = useState<{ totalHours: number, balance: number }>({ totalHours: 0, balance: 0 });

  // History State
  const [historyType, setHistoryType] = useState<'today' | 'day' | 'week' | 'month'>('today');
  const [historyFilterType, setHistoryFilterType] = useState<TipoPonto | 'all'>('all');
  const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [historyRecords, setHistoryRecords] = useState<PontoRegistro[]>([]);

  // Config State
  const [maxRadius, setMaxRadius] = useState<number>(MAX_RADIUS_KM);
  const [isPendingJustification, setIsPendingJustification] = useState(false); // New state for justification status
  const [approvalModalJustificativa, setApprovalModalJustificativa] = useState<Justificativa | null>(null);


  // Fetch Config on Load
  useEffect(() => {
    getSystemConfig('max_radius_km', MAX_RADIUS_KM).then((val) => {
      setMaxRadius(val);
    });
  }, []);

  const refreshConfig = () => {
    getSystemConfig('max_radius_km', MAX_RADIUS_KM).then((val) => {
      setMaxRadius(val);
    });
  };

  useEffect(() => {
    if (session?.user.id && currentView === 'history') {
      const [y, m, d] = historyDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      let start = new Date(date);
      let end = new Date(date);

      if (historyType === 'today') {
        const now = new Date();
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
      } else if (historyType === 'day') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      } else if (historyType === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (historyType === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setMonth(start.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
      }

      const typeFilter = (historyType !== 'today' && historyFilterType !== 'all') ? historyFilterType : undefined;
      getHistoryRecords(session.user.id, start, end, typeFilter).then(setHistoryRecords);
    }
  }, [session, currentView, historyType, historyDate, historyFilterType]);

  useEffect(() => {
    if (session?.user.id) {
      // Always fetch profile to get username for Dashboard/Header
      // Always fetch profile to get username for Dashboard/Header
      getUserProfile(session.user.id).then(profile => {
        setUserProfile(profile);
        if (profile) {
          if (!profile.birthdate) {
            setShowBirthdayModal(true);
          } else {
            // Check for birthday celebration
            const today = new Date();
            // Fix timezone issue when comparing dates strings
            const [y, m, d] = profile.birthdate.split('-').map(Number);

            // Check if today matches MM-DD (Month is 0-indexed in JS)
            const isMatch = today.getDate() === d && today.getMonth() === (m - 1);

            console.log("[BirthdayDebug] Check:", {
              today: today.toLocaleDateString(),
              birthdate: profile.birthdate,
              d, m,
              isMatch
            });

            if (isMatch) {
              const currentYear = today.getFullYear();
              const key = `birthday_acknowledged_${currentYear}_${profile.id}`;

              const alreadyAcknowledged = localStorage.getItem(key);
              console.log("[BirthdayDebug] Key:", key, "Acknowledged:", alreadyAcknowledged);

              if (!alreadyAcknowledged) {
                console.log("[BirthdayDebug] Opening Modal");
                setShowCelebrationModal(true);
              }
            }
          }
        }
      });

      if (currentView === 'profile' && reportPeriod !== 'today') {
        getReportData(session.user.id, reportPeriod as ReportPeriod).then(setReportData);
      }
    }
  }, [session, currentView, reportPeriod]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);



  // Token UI State
  const [showTokenViewer, setShowTokenViewer] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  const handleBirthdaySubmit = async (date: string) => {
    if (!session?.user.id) return;
    try {
      await updateUserBirthdate(session.user.id, date);
      setShowBirthdayModal(false);
      getUserProfile(session.user.id).then(setUserProfile);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar data.");
    }
  };

  const handleCelebrationClose = () => {
    if (userProfile?.id) {
      const today = new Date();
      const key = `birthday_acknowledged_${today.getFullYear()}_${userProfile.id}`;
      localStorage.setItem(key, 'true');
      console.log("[BirthdayDebug] Acknowledged! Key set:", key);
    }
    setShowCelebrationModal(false);
  };

  // App Logic State
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
  const showIOSFallback = isIOS && isStandalone;

  const [registros, setRegistros] = useState<PontoRegistro[]>([]);
  const [nextType, setNextType] = useState<TipoPonto>(TipoPonto.ENTRADA);

  // Timer & Summary State
  const [workedTime, setWorkedTime] = useState(0);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [finalDailyHours, setFinalDailyHours] = useState("");

  // Custom Hook
  const { token, timeLeft, totalDuration, isLocked, attempts, verifyToken } = useTokenSystem();

  // Load initial data
  useEffect(() => {
    if (!session) return;

    const fetchRecords = async () => {
      try {
        const todays = await getTodayRegistros(session.user.id);
        // Ensure we have the profile with role
        const profile = await getUserProfile(session.user.id);
        if (profile) setUserProfile(profile);

        setRegistros(todays);

        // Check pending justification from new table
        const lastJust = await getLastJustificativa(session.user.id);

        if (lastJust) {
          if (lastJust.aprovada === null) {
            setIsPendingJustification(true);
          } else if (lastJust.aprovada === true) {
            setIsPendingJustification(false);
            // Check if already acknowledged
            const lastAckId = localStorage.getItem('ack_just_id');
            if (!lastAckId || parseInt(lastAckId) !== lastJust.id) {
              setApprovalModalJustificativa(lastJust);
            }
          } else {
            setIsPendingJustification(false);
          }
        } else {
          setIsPendingJustification(false);
        }

        const { tipo } = determineNextPontoType(todays, profile?.role);
        setNextType(tipo);
      } catch (err) {
        console.error("Error fetching records:", err);
      }
    };

    fetchRecords();
  }, [session]);

  // Polling for Justification Status (Every 30s if pending)
  useEffect(() => {
    if (!session || !isPendingJustification) return;

    const interval = setInterval(async () => {
      console.log("Polling justification status...");
      const lastJust = await getLastJustificativa(session.user.id);

      if (lastJust) {
        if (lastJust.aprovada === true) {
          setIsPendingJustification(false);
          setApprovalModalJustificativa(lastJust); // Show modal immediately

          // Also refresh records to show the new generated points!
          const updated = await getTodayRegistros(session.user.id);
          setRegistros(updated);
          const { tipo } = determineNextPontoType(updated, userProfile?.role);
          setNextType(tipo);
        } else if (lastJust.aprovada === false) {
          // Rejected? Logic not defined, but we stop pending.
          setIsPendingJustification(false);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session, isPendingJustification, userProfile]);

  const handleCloseApprovalModal = () => {
    if (approvalModalJustificativa) {
      localStorage.setItem('ack_just_id', approvalModalJustificativa.id.toString());
    }
    setApprovalModalJustificativa(null);
  };

  // Manual Location Request for iOS/PWA compliance
  const requestLocation = (retry = false) => {
    if (!('geolocation' in navigator)) {
      setError("Geolocalização não suportada neste dispositivo.");
      return;
    }

    setLoading(true);
    if (!retry) setError(null); // Clear error only on first attempt

    // Small delay to ensure UI interaction is registered by iOS WebKit
    setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          };
          setLocation(newLoc);

          const dist = calculateDistanceKm(newLoc, TARGET_LOCATION);
          setDistance(dist);

          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Geolocation error:", err);

          // Retry Logic (Try once more after 1s)
          if (!retry) {
            console.log("Retrying location request...");
            setTimeout(() => requestLocation(true), 1500);
            return;
          }

          setLoading(false);

          let msg = "Erro ao obter localização.";
          if (err.code === 1) { // Permission Denied
            msg = "Permissão negada. Vá em Ajustes > Privacidade > Localização e ative para o Gama Ponto.";
          } else if (err.code === 2) { // Position Unavailable
            msg = "Sinal de GPS fraco. Tente novamente em local aberto.";
          } else if (err.code === 3) { // Timeout
            msg = "Tempo esgotado ao buscar GPS. Tente novamente.";
          }

          // iOS PWA Specific Fallback Message
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

          if (isIOS && isStandalone) {
            msg += " \n\n⚠️ No iPhone (PWA), se o erro persistir, abra o app diretamente no Safari.";
          } else {
            msg += " Verifique se o GPS está ativado.";
          }

          setError(msg);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    }, 500);
  };

  // NOTE: Removed automatic useEffect for location to comply with iOS PWA policies.


  // Timer Effect
  useEffect(() => {
    // Run timer if we have records AND (user is on Dashboard OR User is on Profile->Today)
    // User said REMOVE from Dashboard. So only Profile->Today.
    // "o tempo trabalhado não deve ser exibido na aba 'Ínicio' e sim em 'Horas Trabalhadas'na aba de 'Perfil'"
    // So usually we only need the INTERVAL if we are displaying it.
    // Condition: registros > 0 AND currentView === 'profile' AND reportPeriod === 'today'
    if (registros.length > 0 && currentView === 'profile' && reportPeriod === 'today') {
      // Update immediately
      setWorkedTime(calculateWorkedTime(registros));

      const interval = setInterval(() => {
        const ms = calculateWorkedTime(registros);
        setWorkedTime(ms);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // If we switch away, workedTime state might be stale but it doesn't matter as we reload it on switch back.
      // But if we want to show it in modal (after 4th point), modal uses `calculateWorkedTime(updated)` directly?
      // No, modal uses `finalDailyHours`.
      // So we good.
    }
  }, [registros, currentView, reportPeriod]);

  const handleRegisterClick = () => {
    // Intercept: Open challenge instead of registering immediately
    if (isLocked) {
      setError("Sistema bloqueado temporariamente. Aguarde novo token.");
      return;
    }
    const maxPoints = userProfile?.role === 2 ? 2 : 4;
    if (registros.length >= maxPoints) {
      setError(`Você já registrou os ${maxPoints} pontos de hoje.`);
      return;
    }

    // Check logic for Justification
    if (distance && distance > maxRadius) {
      setShowJustificationModal(true);
      return;
    }

    if (!token) {
      setError("Buscando satélites... Aguarde o token.");
      return;
    }

    setShowChallenge(true);
  };

  const handleJustificationSubmit = async (text: string, file: File | null, type: 'atraso' | 'falta') => {
    setShowJustificationModal(false);
    if (!location) {
      setError("Localização não disponível.");
      return;
    }
    if (!session) return;

    setLoading(true);
    setSuccessMsg(null);
    setError(null);

    try {
      const maxPoints = userProfile?.role === 2 ? 2 : 4;

      // Call register with justification
      const newRecord = await registerPonto(session.user.id, nextType, location, text, file, type);

      setSuccessMsg(`${getButtonText().split(' ')[1] || "Ponto"} Confirmado (Justificado)!`);
      setIsPendingJustification(true); // Update state immediately

      // Refresh local state
      const updated = await getTodayRegistros(session.user.id);
      setRegistros(updated);
      const { tipo } = determineNextPontoType(updated, userProfile?.role);
      setNextType(tipo);

      if (updated.length >= maxPoints) {
        const totalMs = calculateWorkedTime(updated);
        const hours = totalMs / (1000 * 60 * 60);
        setFinalDailyHours(formatDecimalHours(hours));
        setShowSummaryModal(true);
      }

      setTimeout(() => setSuccessMsg(null), 3000);

    } catch (e: any) {
      setError(e.message || "Erro ao registrar ponto justificado.");
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeSuccess = async () => {
    setShowChallenge(false);

    // Proceed with registration
    if (!location) {
      setError("Localização não disponível.");
      return;
    }

    if (!session) return;

    setLoading(true);
    setSuccessMsg(null);
    setError(null);

    try {
      // Just before registering, check if this is the last one (2nd for intern, 4th for others)
      const maxPoints = userProfile?.role === 2 ? 2 : 4;
      // const isLastPoint = registros.length === (maxPoints - 1); 


      const newRecord = await registerPonto(session.user.id, nextType, location);

      setSuccessMsg(`${getButtonText().split(' ')[1] || "Ponto"} Confirmado!`);

      // Refresh local state
      const updated = await getTodayRegistros(session.user.id);
      setRegistros(updated);
      // We rely on userProfile.role being up to date from initial fetch
      const { tipo } = determineNextPontoType(updated, userProfile?.role);
      setNextType(tipo);

      // If limits reached (2 for intern, 4 for others), show summary
      if (updated.length >= maxPoints) {
        const totalMs = calculateWorkedTime(updated);
        const hours = totalMs / (1000 * 60 * 60);
        setFinalDailyHours(formatDecimalHours(hours));
        setShowSummaryModal(true);
      }

      setTimeout(() => setSuccessMsg(null), 3000);

    } catch (e: any) {
      setError(e.message || "Erro ao registrar ponto.");
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeFail = () => {
    // Hook automatically increments attempts internally via verifyToken, 
    // but here we just show feedback.
    setError(`Token incorreto!`);

    // Logic to close modal if locked could go here or rely on isLocked prop in parent
    if (attempts + 1 >= 2) {
      setShowChallenge(false);
    }
  };

  // Helper to determine if we should show "Aguardando aprovação"
  // NOW DEPRECATED: We use isPendingJustification state loaded from DB
  const isPendingApproval = () => isPendingJustification;

  const getButtonText = () => {
    if (isPendingJustification) {
      return "Aguardando aprovação";
    }

    if (distance && distance > maxRadius) {
      return "Justificar Ausência";
    }


    switch (nextType) {
      case TipoPonto.ENTRADA: return "Registrar Entrada";
      case TipoPonto.ALMOCO_INICIO: return "Registrar Saída para almoço";
      case TipoPonto.ALMOCO_FIM: return "Registrar Volta do almoço";
      case TipoPonto.SAIDA: return "Registrar Fim de expediente";
      default: return "Registrar Ponto";
    }
  };

  if (!session) {
    return <Login />;
  }

  return (
    <div className="h-[100dvh] w-full bg-[#F2F2F7] relative overflow-hidden font-sans">

      {/* Modals */}
      {showTokenViewer && (
        <TokenViewer
          token={token}
          timeLeft={timeLeft}
          totalDuration={totalDuration}
          onClose={() => setShowTokenViewer(false)}
        />
      )}

      {showChallenge && token && (
        <TokenChallenge
          validToken={token}
          onSuccess={handleChallengeSuccess}
          onFail={handleChallengeFail}
          onClose={() => setShowChallenge(false)}
        />
      )}

      {showJustificationModal && (
        <JustificationModal
          isOpen={showJustificationModal}
          onClose={() => setShowJustificationModal(false)}
          onSubmit={handleJustificationSubmit}
        />
      )}

      <BirthdayModal
        isOpen={showBirthdayModal}
        onSubmit={handleBirthdaySubmit}
        onClose={() => setShowBirthdayModal(false)}
      />

      <BirthdayCelebrationModal
        isOpen={showCelebrationModal}
        onClose={handleCelebrationClose}
        username={userProfile?.username || userProfile?.name || "Colaborador"}
      />

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-2">
              <Clock size={40} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Bom descanso!</h2>
              <p className="text-gray-600">
                Até mais, <span className="font-semibold text-gray-900">{userProfile?.username || userProfile?.name || session?.user.email?.split('@')[0]}</span>!
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Você trabalhou</p>
              <p className="text-3xl font-bold text-ios-blue">{finalDailyHours}</p>
            </div>

            <button
              onClick={() => setShowSummaryModal(false)}
              className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition-all active:scale-95"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* --- DASHBOARD VIEW --- */}
      {currentView === 'dashboard' && (
        <div className="w-full h-full flex flex-col items-center justify-start pt-10 px-6 pb-24 space-y-4 overflow-hidden">
          <div className="w-full max-w-md flex flex-col items-center space-y-6 animate-in fade-in duration-500">
            <GamaLogo className="w-28 h-28 drop-shadow-sm" />

            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Olá, {userProfile?.username || userProfile?.name || session?.user.email?.split('@')[0]}</h1>
              <p className="text-gray-500 font-medium text-base">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>

            {/* Timer REMOVED */}

            <LocationCard
              distance={distance}
              isWithinRadius={distance !== null && distance <= maxRadius}
              loading={!location}
            />

            <div className="w-full pt-4 space-y-3">
              {registros.length >= (userProfile?.role === 2 ? 2 : 4) ? (
                <button
                  disabled
                  className="w-full bg-gray-200 text-gray-400 font-bold py-4 rounded-2xl cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Clock size={20} />
                  <span>Jornada Completa</span>
                </button>
              ) : !location || error ? (
                showIOSFallback ? (
                  <div className="w-full bg-orange-50 border border-orange-100 p-4 rounded-2xl flex flex-col items-center space-y-3">
                    <div className="flex items-center space-x-2 text-orange-600 font-medium">
                      <ShieldAlert size={24} />
                      <span className="text-sm text-center">Localização indisponível no App</span>
                    </div>
                    <p className="text-xs text-center text-gray-500 px-2 leading-tight">
                      Este dispositivo (iPhone) restringe GPS no modo aplicativo.
                    </p>
                    <button
                      onClick={() => window.location.href = window.location.href}
                      className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <Navigation size={20} />
                      <span>Abrir no Safari</span>
                    </button>
                    <p className="text-[10px] text-center text-gray-400">
                      Toque acima ou copie o link para o Safari.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => requestLocation()}
                    disabled={loading}
                    className={`w-full font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2 ${loading ? "bg-gray-300 text-gray-500 cursor-wait" : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                  >
                    <MapPin size={24} />
                    <span>{loading ? "Obtendo GPS..." : error ? "Tentar Novamente" : "Atualizar Localização"}</span>
                  </button>
                )
              ) : (
                <SwipeButton
                  text={getButtonText()}
                  onSuccess={handleRegisterClick}
                  isLoading={loading}
                  disabled={isLocked || isPendingApproval()}
                  successMessage={successMsg}
                  customTextClass={isPendingApproval() ? 'text-red-500 font-bold' : undefined}
                />
              )}

              {/* View Token Button */}
              {/* View Token Button */}
              <button
                onClick={() => {
                  if (distance !== null && distance > maxRadius) {
                    setError("Fora da área permitida");
                    return;
                  }
                  if (isLocked) {
                    setError("Sistema bloqueado. Aguarde o próximo ciclo.");
                    return;
                  }
                  if (!token) {
                    setError("Aguardando geração de token...");
                    return;
                  }
                  setShowTokenViewer(true);
                }}
                // Hide if outside radius
                className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-xl transition-all font-semibold shadow-sm border ${isLocked || (distance !== null && distance > maxRadius)
                  ? "hidden" // Hide completely if outside radius or locked
                  : "bg-white text-blue-600 border-blue-100 hover:bg-blue-50"
                  }`}
              >
                <Eye size={18} />
                <span>Ver Token de Ponto</span>
              </button>

              {loading && <p className="text-center text-gray-400 text-sm mt-3 animate-pulse">Verificando localização...</p>}
              {error && <p className="text-center text-red-500 text-sm mt-3 font-medium bg-red-50 py-2 px-3 rounded-lg mx-auto max-w-[90%]">{error}</p>}

            </div>
          </div>
        </div>
      )}

      {/* --- HISTORY VIEW --- */}
      {currentView === 'history' && (
        <div className="w-full h-full flex flex-col pt-10 px-4 pb-24 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-md mx-auto flex flex-col h-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 px-2">Histórico de Pontos</h2>

            {/* Filters */}
            <div className="flex flex-col gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['today', 'day', 'week', 'month'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setHistoryType(t)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${historyType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {t === 'today' ? 'Hoje' : t === 'day' ? 'Dia' : t === 'week' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>

              {historyType !== 'today' && (
                <div className="flex gap-2">
                  <input
                    type={historyType === 'month' ? 'month' : 'date'}
                    value={historyType === 'month' ? historyDate.slice(0, 7) : historyDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (historyType === 'month') setHistoryDate(`${val}-01`);
                      else setHistoryDate(val);
                    }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ios-blue/50"
                  />

                  <select
                    value={historyFilterType}
                    onChange={(e) => setHistoryFilterType(e.target.value as TipoPonto | 'all')}
                    className="w-1/3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ios-blue/50 bg-white"
                  >
                    <option value="all">Todos</option>
                    <option value={TipoPonto.ENTRADA}>Entrada</option>
                    <option value={TipoPonto.ALMOCO_INICIO}>Saída para almoço</option>
                    <option value={TipoPonto.ALMOCO_FIM}>Volta do almoço</option>
                    <option value={TipoPonto.SAIDA}>Fim de expediente</option>
                    <option value={TipoPonto.AUSENCIA}>Ausência</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 px-1">
              {historyRecords.length > 0 ? (
                historyRecords.map((registro) => (
                  <HistoryCard key={registro.id} record={registro} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
                  <Clock size={32} strokeWidth={1.5} />
                  <p>Nenhum registro encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PROFILE VIEW --- */}
      {currentView === 'profile' && (
        <div className="w-full h-full flex flex-col items-center pt-10 px-6 pb-24 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-md flex flex-col items-center space-y-8">
            {/* Avatar & Name */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-lg overflow-hidden">
                {userProfile?.img_url ? (
                  <img src={userProfile.img_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500">
                    <UserIcon size={40} />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-800">{userProfile?.username || userProfile?.name || session?.user.email}</h2>
            </div>

            {/* Stats Section */}
            <div className="w-full bg-white rounded-2xl shadow-sm p-6 space-y-6">

              {/* Filter Tabs */}
              <div className="flex p-1 bg-gray-100 rounded-lg">
                {/* Added 'today' to the map */}
                {(['today', 'day', 'week', 'month', 'year'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setReportPeriod(p)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${reportPeriod === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {p === 'today' ? 'Hoje' : p === 'day' ? 'Dia' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Ano'}
                  </button>
                ))}
              </div>

              {/* Data Display */}
              <div className="flex flex-col items-center space-y-1">
                <span className="text-sm text-gray-500">Horas Trabalhadas</span>
                <p className="text-4xl font-bold text-gray-900">
                  {reportPeriod === 'today' ? formatMsToTimer(workedTime) : formatDecimalHours(reportData.totalHours)}
                </p>
                {reportPeriod === 'today' && registros.length > 0 && registros.length % 2 === 0 && registros.length < (userProfile?.role === 2 ? 2 : 4) && (
                  <span className="text-xs text-orange-500 font-medium px-2 py-0.5 bg-orange-50 rounded-full mt-1">
                    • Pausado
                  </span>
                )}
              </div>

              {/* Hide Balance for Today, show for others */}
              {reportPeriod !== 'today' && (
                <div className="border-t border-gray-100 pt-4 flex flex-col items-center space-y-1">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Saldo de Horas</span>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${reportData.balance >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {reportData.balance > 0 ? '+' : ''}{formatDecimalHours(reportData.balance)}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={async () => {
                if (session?.user) {
                  await logAction(session.user.id, 'LOGOUT', 'Realizou logout do sistema');
                }
                supabase.auth.signOut();
              }}
              className="flex items-center space-x-2 text-red-500 hover:text-red-700 font-medium px-6 py-3 bg-red-50 rounded-xl w-full justify-center transition-colors"
            >
              <LogOut size={20} />
              <span>Sair do Aplicativo</span>
            </button>
          </div>
        </div>
      )}

      {/* --- SETTINGS VIEW --- */}
      {currentView === 'settings' && userProfile?.role === 7 && (
        <Settings
          currentRadius={maxRadius}
          onUpdate={refreshConfig}
        />
      )}

      {/* --- INFO VIEW --- */}
      {currentView === 'info' && (
        <InfoTab />
      )}

      {/* --- BOTTOM NAV --- */}
      <BottomNav currentView={currentView} setView={setCurrentView} userRole={userProfile?.role} />

      {/* Approval Notification Modal */}
      <JustificationApprovedModal
        justificativa={approvalModalJustificativa}
        onClose={handleCloseApprovalModal}
      />
    </div>
  );
};

export default App;
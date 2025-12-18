import React from 'react';
import { PontoRegistro, TipoPonto } from '../types';
import { Clock, AlertTriangle, MapPinOff } from 'lucide-react';

const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const getLabel = (tipo: TipoPonto) => {
  switch (tipo) {
    case TipoPonto.ENTRADA: return 'Entrada';
    case TipoPonto.ALMOCO_INICIO: return 'Saída para almoço';
    case TipoPonto.ALMOCO_FIM: return 'Volta do almoço';
    case TipoPonto.SAIDA: return 'Fim de expediente';
    case TipoPonto.AUSENCIA: return 'Ausência';
    default: return tipo;
  }
};

export const HistoryCard: React.FC<{ record: PontoRegistro }> = ({ record }) => {
  const isEmergency = record.tipo === TipoPonto.AUSENCIA;
  const isOffLocation = record.fora_do_raio;

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mb-3">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEmergency ? 'bg-ios-red/10 text-ios-red' : 'bg-ios-blue/10 text-ios-blue'}`}>
          {isEmergency ? <AlertTriangle size={20} /> : <Clock size={20} />}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{getLabel(record.tipo)}</h4>
          <p className="text-sm text-gray-500">{new Date(record.datahora).toLocaleDateString('pt-BR')} • {formatTime(record.datahora)}</p>
          {record.justificativa_local && (
            <p className="text-xs text-ios-red mt-1 italic">"{record.justificativa_local}"</p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {isOffLocation && (
          <div className="flex items-center gap-1 text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-md">
            <MapPinOff size={12} />
            <span>Fora local</span>
          </div>
        )}
      </div>
    </div>
  );
};
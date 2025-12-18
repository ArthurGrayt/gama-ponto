export enum TipoPonto {
  ENTRADA = 'entrada',
  ALMOCO_INICIO = 'almoco_inicio',
  ALMOCO_FIM = 'almoco_fim',
  SAIDA = 'saida',
  AUSENCIA = 'ausencia'
}

export interface PontoRegistro {
  id: number;
  user_id: string;
  datahora: string; // ISO string
  tipo: TipoPonto;
  justificativa_local: string | null;
  ordem: number;
  horas_acumuladas: number | null;
  tempo_almoco: number | null;
  fora_do_raio: boolean;
}

export interface User {
  id: string;
  name: string;
  codeHash: string;
  img_url?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface AppState {
  isAuthenticated: boolean;
  currentUser: User | null;
  currentLocation: GeoLocation | null;
  distanceToTarget: number | null;
  isWithinRadius: boolean;
  loading: boolean;
  error: string | null;
}
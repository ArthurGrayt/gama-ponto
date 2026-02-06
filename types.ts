export enum TipoPonto {
  ENTRADA = 'entrada',
  ALMOCO_INICIO = 'almoco_inicio',
  ALMOCO_FIM = 'almoco_fim',
  SAIDA = 'saida',
  AUSENCIA = 'ausencia',
  FERIADO = 'feriado'
}

export interface PontoRegistro {
  id: number;
  user_id: string;
  datahora: string; // ISO string
  tipo: TipoPonto;
  justificativa_local: string | null;
  justificativa_aprovada?: boolean;
  tipo_just?: 'falta' | null;
  ordem: number;
  horas_acumuladas: number | null;
  tempo_almoco: number | null;
  fora_do_raio: boolean;
}

export interface Justificativa {
  id: number;
  created_at: string;
  tipo: string;
  texto: string;
  aprovada: boolean | null;
  usuario: string;
  img?: string | null;
}

export interface Holiday {
  id: number;
  data: string; // YYYY-MM-DD
  titulo: string;
  tipo: string; // 'feriado'
}

export interface User {
  id: string;
  name: string;
  username?: string;
  codeHash: string;
  img_url?: string;
  role?: number;
  birthdate?: string; // YYYY-MM-DD
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
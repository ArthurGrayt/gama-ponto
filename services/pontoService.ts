import { PontoRegistro, TipoPonto, GeoLocation, User } from '../types';
import { TARGET_LOCATION, MAX_RADIUS_KM } from '../constants';
import { supabase } from './supabase';

// --- Haversine Formula ---
export const calculateDistanceKm = (loc1: GeoLocation, loc2: GeoLocation): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(loc2.latitude - loc1.latitude);
  const dLon = deg2rad(loc2.longitude - loc1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(loc1.latitude)) * Math.cos(deg2rad(loc2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// --- Type Mapping ---
const getTipoString = (tipo: TipoPonto): string => {
  switch (tipo) {
    case TipoPonto.ENTRADA: return "Entrada";
    case TipoPonto.ALMOCO_INICIO: return "Saída para almoço";
    case TipoPonto.ALMOCO_FIM: return "Volta do almoço";
    case TipoPonto.SAIDA: return "Fim de expediente";
    default: return "Entrada"; // Default/Fallback
  }
};

const mapDbToType = (dbTipo: string): TipoPonto => {
  switch (dbTipo) {
    case "Entrada": return TipoPonto.ENTRADA;
    case "Saída para almoço": return TipoPonto.ALMOCO_INICIO;
    case "Volta do almoço": return TipoPonto.ALMOCO_FIM;
    case "Fim de expediente": return TipoPonto.SAIDA;
    default: return TipoPonto.ENTRADA; // Fallback
  }
};

// --- Database Operations (Supabase) ---

export const getTodayRegistros = async (userId: string): Promise<PontoRegistro[]> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('ponto_registros')
    .select('*')
    .eq('user_id', userId)
    .gte('datahora', todayStart.toISOString())
    .lte('datahora', todayEnd.toISOString())
    .order('datahora', { ascending: true });

  if (error) {
    console.error("Error fetching records:", error);
    return [];
  }

  // Map DB fields to Frontend types
  return (data || []).map((r: any) => ({
    ...r,
    tipo: mapDbToType(r.tipo)
  })) as PontoRegistro[];
};

/**
 * Since `getTodayRegistros` is async now, we need to adjust the synchronous helper usage in App.tsx.
 * However, `determineNextPontoType` logic remains synchronous on the *fetched* array.
 */
export const determineNextPontoType = (todayRecords: PontoRegistro[]): { tipo: TipoPonto, ordem: number } => {
  // Only count valid shift points
  const count = todayRecords.filter(r => r.tipo !== TipoPonto.AUSENCIA).length;

  // Logic sequence: 1->Entrada, 2->AlmocoInicio, 3->AlmocoFim, 4->Saida
  let ordem = count + 1;
  let tipo = TipoPonto.ENTRADA;

  if (count === 0) tipo = TipoPonto.ENTRADA;
  else if (count === 1) tipo = TipoPonto.ALMOCO_INICIO;
  else if (count === 2) tipo = TipoPonto.ALMOCO_FIM;
  else if (count === 3) tipo = TipoPonto.SAIDA;
  else tipo = TipoPonto.SAIDA; // Prevent overflow beyond 4

  return { tipo, ordem };
};

export const registerPonto = async (
  userId: string,
  tipo: TipoPonto,
  location: GeoLocation
): Promise<PontoRegistro> => {

  // 1. Backend Distance Validation
  const distance = calculateDistanceKm(location, TARGET_LOCATION);
  const isWithinRadius = distance <= MAX_RADIUS_KM;

  if (!isWithinRadius) {
    throw new Error("Localização fora do raio permitido de 3km.");
  }

  // 2. Fetch current records to calculate fields
  const todayRecords = await getTodayRegistros(userId);

  // Strict Order Logic
  const count = todayRecords.filter(r => r.tipo !== TipoPonto.AUSENCIA).length;
  const ordem = count + 1;

  // 3. Calculate Times (Lunch, Accumulated)
  let tempo_almoco: number | null = null;
  let horas_acumuladas: number | null = null;

  const now = new Date();

  if (ordem > 1) {
    const entrada = todayRecords.find(r => r.ordem === 1);
    if (entrada) {
      const start = new Date(entrada.datahora).getTime();
      horas_acumuladas = (now.getTime() - start) / (1000 * 60 * 60); // Hours
    }
  }

  if (tipo === TipoPonto.ALMOCO_FIM) {
    const saidaAlmoco = todayRecords.find(r => r.tipo === TipoPonto.ALMOCO_INICIO);
    if (saidaAlmoco) {
      const start = new Date(saidaAlmoco.datahora).getTime();
      tempo_almoco = (now.getTime() - start) / (1000 * 60 * 60); // Hours
    }
  }

  // 4. Create Record Payload
  const dbRecord = {
    user_id: userId,
    datahora: now.toISOString(),
    tipo: getTipoString(tipo), // "Entrada", "Saída para almoço", etc.
    ordem: ordem,
    horas_acumuladas: horas_acumuladas ? parseFloat(horas_acumuladas.toFixed(2)) : null,
    tempo_almoco: tempo_almoco ? parseFloat(tempo_almoco.toFixed(2)) : null,
    // fora_do_raio removed
  };

  // 5. Save to Supabase
  const { data, error } = await supabase
    .from('ponto_registros')
    .insert([dbRecord])
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar ponto: ${error.message}`);
  }

  return {
    ...data,
    tipo: mapDbToType(data.tipo),
    fora_do_raio: !isWithinRadius
  } as PontoRegistro;
};

// --- Profile & Reporting ---

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users') // Assuming 'users' table exists or auth.users meta? 
    // User mentioned: "tabela 'users'". Usually implies public.users linked to auth.
    // Let's assume public.users table with 'id', 'name', 'img_url'.
    .select('*') // user table schema unknown, fetch all to be safe and map
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }

  // Map potential name columns
  const raw = data as any;
  return {
    id: raw.id,
    name: raw.name || raw.nome || raw.full_name || raw.username || "Usuário",
    codeHash: raw.codeHash || "",
    img_url: raw.img_url
  };
};

export type ReportPeriod = 'day' | 'week' | 'month' | 'year';

export const getReportData = async (userId: string, period: ReportPeriod): Promise<{ totalHours: number, balance: number }> => {
  const now = new Date();
  let startTime = new Date();

  // Set timeframe
  switch (period) {
    case 'day':
      startTime.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const day = startTime.getDay(); // 0 (Sun) to 6 (Sat)
      const diff = startTime.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      startTime.setDate(diff);
      startTime.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startTime.setDate(1);
      startTime.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startTime.setMonth(0, 1);
      startTime.setHours(0, 0, 0, 0);
      break;
  }

  const { data, error } = await supabase
    .from('ponto_registros')
    .select('datahora, tipo, horas_acumuladas')
    .eq('user_id', userId)
    .gte('datahora', startTime.toISOString())
    .lte('datahora', now.toISOString()); // Up to now

  if (error || !data) {
    return { totalHours: 0, balance: 0 };
  }

  // Filter only 'Fim de expediente' (type=SAIDA) for completed shifts totals
  // Prompt said: "horas_acumuladas" vai ser o tanto de horas que a pessoa trabalhou...
  // We sum records that have 'horas_acumuladas'. 
  // IMPORTANT: We only want to sum ONCE per day, usually the last 'Fim de expediente' contains the full day sum? 
  // OR does every 'Fim de expediente' contain the sum from start?
  // My logic in registerPonto: `horas_acumuladas = (now - entrada) - lunch`. 
  // If user clocks out, that value is the total for the day at that moment.
  // So we should take the MAX `horas_acumuladas` per Day to get the daily total, then sum those daily maxes.

  const dailyTotals: Record<string, number> = {};

  data.forEach((r: any) => {
    if (r.horas_acumuladas) {
      const dayKey = new Date(r.datahora).toDateString();
      const val = parseFloat(r.horas_acumuladas);
      if (!dailyTotals[dayKey] || val > dailyTotals[dayKey]) {
        dailyTotals[dayKey] = val;
      }
    }
  });

  let totalHours = 0;
  let workDaysCount = 0;

  Object.values(dailyTotals).forEach(val => {
    totalHours += val;
    workDaysCount++;
  });

  const WORKDAY_HOURS = 8.75; // 8h 45m

  // For 'day', we compare against 1 workday if we have any record, or 0? 
  // Usually balance is (Total Worked - Expected).
  // Expected = WorkDaysFound * 8.75? Or (Days Passed in Period excluding weekends) * 8.75?
  // Simple approach: Balance based on days worked.
  const expected = workDaysCount * WORKDAY_HOURS;
  const balance = totalHours - expected;

  return { totalHours, balance };
};

export const getHistoryRecords = async (userId: string, start: Date, end: Date, type?: TipoPonto): Promise<PontoRegistro[]> => {
  let query = supabase
    .from('ponto_registros')
    .select('*')
    .eq('user_id', userId)
    .gte('datahora', start.toISOString())
    .lte('datahora', end.toISOString())
    .order('datahora', { ascending: false });

  if (type) {
    query = query.eq('tipo', getTipoString(type));
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching history:", error);
    return [];
  }

  return (data || []).map((r: any) => ({
    ...r,
    tipo: mapDbToType(r.tipo),
    fora_do_raio: r.fora_do_raio || false // fallback if removed
  })) as PontoRegistro[];
};

export const calculateWorkedTime = (records: PontoRegistro[]): number => {
  const now = new Date().getTime();
  const getRec = (ord: number) => records.find(r => r.ordem === ord);

  const p1 = getRec(1);
  const p2 = getRec(2);
  const p3 = getRec(3);
  const p4 = getRec(4);

  let totalMs = 0;

  // Segment 1: Entrada -> Saída Almoço (or Now)
  if (p1) {
    const start1 = new Date(p1.datahora).getTime();
    const end1 = p2 ? new Date(p2.datahora).getTime() : now;
    totalMs += (end1 - start1);
  }

  // Segment 2: Volta Almoço -> Saída (or Now)
  if (p3) {
    const start2 = new Date(p3.datahora).getTime();
    const end2 = p4 ? new Date(p4.datahora).getTime() : now;
    totalMs += (end2 - start2);
  }

  return totalMs > 0 ? totalMs : 0;
};
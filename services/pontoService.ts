import { PontoRegistro, TipoPonto, GeoLocation, User } from '../types';
import { logAction } from './logger';
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
export const determineNextPontoType = (todayRecords: PontoRegistro[], userRole?: number): { tipo: TipoPonto, ordem: number } => {
  // Only count valid shift points
  const count = todayRecords.filter(r => r.tipo !== TipoPonto.AUSENCIA).length;

  // Intern Logic (Role = 2)
  if (userRole === 2) {
    // Logic sequence: 1->Entrada, 2->Saida
    let ordem = count + 1;
    let tipo = TipoPonto.ENTRADA;

    if (count === 0) tipo = TipoPonto.ENTRADA;
    else if (count === 1) tipo = TipoPonto.SAIDA;
    else tipo = TipoPonto.SAIDA; // Prevent overflow

    return { tipo, ordem };
  }

  // Standard Logic
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
  // 3. Calculate Times (Lunch, Accumulated)
  let tempo_almoco: number | null = null;
  let horas_acumuladas: number | null = null;

  const now = new Date();

  const getRec = (ord: number) => todayRecords.find(r => r.ordem === ord);
  const p1 = getRec(1);
  const p2 = getRec(2);
  const p3 = getRec(3);

  if (tipo === TipoPonto.ALMOCO_INICIO && p1) { // Current is P2
    const start = new Date(p1.datahora).getTime();
    horas_acumuladas = (now.getTime() - start) / (1000 * 60 * 60);
  } else if (tipo === TipoPonto.ALMOCO_FIM && p1 && p2) { // Current is P3
    // Worked time is locked to P2 when returning
    const start = new Date(p1.datahora).getTime();
    const end = new Date(p2.datahora).getTime();
    horas_acumuladas = (end - start) / (1000 * 60 * 60);

    // Lunch time
    tempo_almoco = (now.getTime() - end) / (1000 * 60 * 60);
  } else if (tipo === TipoPonto.SAIDA) { // Current is P4
    if (p1 && p2 && p3) {
      const start1 = new Date(p1.datahora).getTime(); // P1
      const end1 = new Date(p2.datahora).getTime();   // P2
      const start2 = new Date(p3.datahora).getTime(); // P3

      const part1 = end1 - start1; // Morning shift
      const part2 = now.getTime() - start2; // Afternoon shift

      horas_acumuladas = (part1 + part2) / (1000 * 60 * 60);
    } else if (p1) {
      // Fallback: P1 -> P4 directly (no lunch logged)
      const start = new Date(p1.datahora).getTime();
      horas_acumuladas = (now.getTime() - start) / (1000 * 60 * 60);
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

  await logAction(userId, 'CREATE', `Registrou ponto: ${getTipoString(tipo)}`);

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
    name: raw.name || raw.nome || raw.full_name || "Usuário",
    username: raw.username,
    codeHash: raw.codeHash || "",
    img_url: raw.img_url,
    role: raw.role // Fetch role
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
    .select('*')
    .eq('user_id', userId)
    .gte('datahora', startTime.toISOString())
    .lte('datahora', now.toISOString()); // Up to now

  if (error || !data) {
    return { totalHours: 0, balance: 0 };
  }

  // Group by Day to calculate daily totals using the robust calculateWorkedTime function
  const dailyRecords: Record<string, any[]> = {};

  data.forEach((r: any) => {
    const dayKey = new Date(r.datahora).toDateString();
    if (!dailyRecords[dayKey]) {
      dailyRecords[dayKey] = [];
    }
    dailyRecords[dayKey].push({
      ...r,
      tipo: mapDbToType(r.tipo)
    });
  });

  let totalMs = 0;
  let workDaysCount = 0;

  Object.values(dailyRecords).forEach(dayRecs => {
    // Sort by boolean time
    dayRecs.sort((a, b) => new Date(a.datahora).getTime() - new Date(b.datahora).getTime());

    // Only count as workday if there is at least start and end or significant tracking
    // But for balance usually we check if day is valid. 
    // Simplified: If there are records, it's a workday.
    workDaysCount++;

    totalMs += calculateWorkedTime(dayRecs as any);
  });

  const totalHours = totalMs / (1000 * 60 * 60);

  // Fetch user role to determine goal
  const user = await getUserProfile(userId);
  const isIntern = user?.role === 2;
  const WORKDAY_HOURS = isIntern ? 6.0 : 8.75;

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
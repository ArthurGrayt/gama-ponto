import { PontoRegistro, TipoPonto, GeoLocation, User, Holiday, Justificativa } from '../types';
import { logAction } from './logger';
import { TARGET_LOCATION, MAX_RADIUS_KM } from '../constants';
import { supabase } from './supabase';

// --- Configuration ---
export const getSystemConfig = async (key: string, defaultValue?: any): Promise<any> => {
  // Config stored in LocalStorage for local testing (User request)
  try {
    const localVal = localStorage.getItem(`config_${key}`);
    if (localVal !== null) {
      return JSON.parse(localVal);
    }
  } catch (e) {
    console.warn("LocalStorage read error", e);
  }
  return defaultValue;
};

export const setSystemConfig = async (key: string, value: any): Promise<void> => {
  try {
    localStorage.setItem(`config_${key}`, JSON.stringify(value));
  } catch (e: any) {
    throw new Error(`Erro ao salvar configuração localmente: ${e.message}`);
  }
};

// --- Holiday Management ---
export const getHolidays = async (): Promise<Holiday[]> => {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('data', { ascending: true });

  if (error) {
    console.error("Error fetching holidays:", error);
    return [];
  }
  return data as Holiday[];
};

export const addHoliday = async (date: string, title: string): Promise<Holiday[]> => {
  const { error } = await supabase
    .from('holidays')
    .insert([{ data: date, titulo: title, tipo: 'feriado' }]);

  if (error) {
    throw new Error(`Erro ao adicionar feriado: ${error.message}`);
  }
  return await getHolidays();
};

export const removeHoliday = async (id: number): Promise<Holiday[]> => {
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao remover feriado: ${error.message}`);
  }
  return await getHolidays();
};

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
    case TipoPonto.AUSENCIA: return "Ausência";
    case TipoPonto.FERIADO: return "Feriado";
    default: return "Entrada"; // Default/Fallback
  }
};

const mapDbToType = (dbTipo: string): TipoPonto => {
  switch (dbTipo) {
    case "Entrada": return TipoPonto.ENTRADA;
    case "Saída para almoço": return TipoPonto.ALMOCO_INICIO;
    case "Volta do almoço": return TipoPonto.ALMOCO_FIM;
    case "Fim de expediente": return TipoPonto.SAIDA;
    case "Ausência": return TipoPonto.AUSENCIA;
    case "Feriado": return TipoPonto.FERIADO;
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
    tipo: mapDbToType(r.tipo),
    fora_do_raio: !!r.justificativa_local // Derive from justification since column doesn't exist
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

export const uploadJustificationImage = async (file: File, userId: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${new Date().getTime()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('justificativas')
      .upload(filePath, file);

    console.log("Upload result:", uploadError ? "Error" : "Success", filePath);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('justificativas')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadJustificationImage:', error);
    return null;
  }
};

export const registerPonto = async (
  userId: string,
  tipo: TipoPonto,
  location: GeoLocation,
  justificativaText?: string,
  justificativaImage?: File | null,
  tipoJust?: 'atraso' | 'falta'
): Promise<PontoRegistro> => {

  // 1. Backend Distance Validation
  const distance = calculateDistanceKm(location, TARGET_LOCATION);
  const dynamicRadius = await getSystemConfig('max_radius_km', MAX_RADIUS_KM);
  const isWithinRadius = distance <= dynamicRadius;

  const hasJustification = !!(justificativaText || justificativaImage);

  // If NOT within radius AND NO justification provided, block.
  if (!isWithinRadius && !hasJustification) {
    throw new Error("Localização fora do raio permitido.");
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

  // Handle Justification Content
  let finalJustificativa = null;
  let aprovada = undefined;
  let imageUrl: string | null = null;

  if (hasJustification) {
    if (justificativaImage) {
      console.log("Uploading justification image...", justificativaImage.name);
      imageUrl = await uploadJustificationImage(justificativaImage, userId);
      console.log("Image URL returned:", imageUrl);
    }

    // Combine text and URL
    const textPart = justificativaText ? `Justificativa: ${justificativaText}` : "";

    finalJustificativa = textPart.trim();

    aprovada = false; // "justificativa_aprovada" vai receber FALSE
  }

  // 4. Create Record Payload
  const dbRecord = {
    user_id: userId,
    datahora: now.toISOString(),
    tipo: getTipoString(tipo),
    ordem: ordem,
    horas_acumuladas: horas_acumuladas ? parseFloat(horas_acumuladas.toFixed(2)) : null,
    tempo_almoco: tempo_almoco ? parseFloat(tempo_almoco.toFixed(2)) : null
  };

  // IF JUSTIFICATION: Only save to justificativa table, DO NOT insert into ponto_registros
  if (tipoJust) {
    console.log("Saving justification:", { userId, tipoJust, texto: justificativaText, imageUrl });

    if (imageUrl) {
      console.log("Image URL to be saved:", imageUrl);
    }

    // User requested "somente pegue a url que esta indo no campo 'texto' e faça ir no campo 'img'"
    // We already pass imageUrl correctly here, and we removed it from 'justificativaText' above.
    console.log("--- DEBUG: CALLING SAVE JUSTIFICATIVA V3 (Clean Text) ---");
    console.log("Text:", justificativaText);
    console.log("Image:", imageUrl);
    await saveJustificativa(userId, tipoJust, justificativaText || "", imageUrl);

    // Return a mock PontoRegistro to satisfy the Promise type, 
    // though it won't be in the DB list yet.
    return {
      id: 0,
      user_id: userId,
      datahora: now.toISOString(),
      tipo: tipo,
      justificativa_local: finalJustificativa,
      justificativa_aprovada: false, // Pending
      tipo_just: tipoJust,
      ordem: ordem,
      horas_acumuladas: null,
      tempo_almoco: null,
      fora_do_raio: true
    } as PontoRegistro;
  }

  // 5. Save to Supabase (Normal Flow)
  const { data, error } = await supabase
    .from('ponto_registros')
    .insert([dbRecord])
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar ponto: ${error.message}`);
  }

  await logAction(userId, 'CREATE', `Registrou ponto ${hasJustification ? '(com justificativa)' : ''}: ${getTipoString(tipo)}`);

  return {
    ...data,
    tipo: mapDbToType(data.tipo),
    fora_do_raio: !!finalJustificativa
  } as PontoRegistro;
};

export const saveJustificativa = async (userId: string, tipo: string, texto: string, imgUrl?: string | null) => {
  const payload = {
    usuario: userId,
    tipo, // 'atraso' or 'falta'
    texto,
    img: imgUrl || null,
    aprovada: null // Default pending
  };

  console.log("Attempting to insert into justificativa table with payload:", payload);

  const { data, error } = await supabase
    .from('justificativa')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error saving justification table:", error);
  } else {
    console.log("Justification saved successfully to table. Inserted Data:", data);
  }

  if (error) {
    console.error("Error saving justification:", error);
    // Don't throw to avoid blocking the Ponto registration if this fails (optional choice, but safer for user exp)
  }
};

export const getLastJustificativa = async (userId: string): Promise<Justificativa | null> => {
  const { data, error } = await supabase
    .from('justificativa')
    .select('*')
    .eq('usuario', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    return null;
  }

  return data as Justificativa | null;
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
    role: raw.role, // Fetch role
    birthdate: raw.birthdate // Fetch birthdate
  };
};

export const updateUserBirthdate = async (userId: string, birthdate: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({ birthdate })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao salvar aniversário: ${error.message}`);
  }
};

export const getAllUserBirthdays = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, user_id, username, img_url, birthdate')
    .not('birthdate', 'is', null) // Only users with birthdays
    .order('username', { ascending: true });

  if (error) {
    console.error("Error fetching birthdays:", error);
    return [];
  }

  // Map to User type (partial)
  return (data || []).map((raw: any) => ({
    id: raw.id,
    name: raw.username || "Usuário", // Use username as name
    username: raw.username,
    codeHash: "", // Not needed here
    img_url: raw.img_url,
    birthdate: raw.birthdate
    // role not strictly needed for this list
  })) as User[];
};

export type ReportPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export const getReportData = async (userId: string, period: ReportPeriod): Promise<{ totalHours: number, balance: number, daysWorked: number, businessDays: number, lastRecordDate: string | null }> => {
  const SPECIAL_INTERN_ID = '0bab58a4-ee36-4550-879d-e48c94224e82';
  const now = new Date();

  // SPECIAL CASE: 'all' (Bank of Hours) - Use requested views
  if (period === 'all') {
    // 1. Get total balance from vw_banco_horas_total
    const { data: balanceData } = await supabase
      .from('vw_banco_horas_total')
      .select('saldo_total_horas')
      .eq('user_id', userId)
      .single();

    // 2. Get daily data from vw_fechamento_diario
    const { data: dailyData } = await supabase
      .from('vw_fechamento_diario')
      .select('dia, horas_trabalhadas')
      .eq('user_id', userId);

    if (!dailyData || dailyData.length === 0) {
      return { totalHours: 0, balance: 0, daysWorked: 0, businessDays: 0, lastRecordDate: null };
    }

    // 3. Totals and Meta
    const totalHours = dailyData.reduce((acc, curr) => acc + (parseFloat(curr.horas_trabalhadas) || 0), 0);
    const daysWorked = dailyData.length;

    // Meta Rule: 6h for specific intern, 8.75h for others
    const dailyMeta = userId === SPECIAL_INTERN_ID ? 6.0 : 8.75;
    const balance = balanceData?.saldo_total_horas || (totalHours - (daysWorked * dailyMeta));

    // Get last work date from the view
    const lastRecordDate = dailyData.length > 0 ? dailyData[dailyData.length - 1].dia : null;

    return {
      totalHours,
      balance,
      daysWorked,
      businessDays: daysWorked, // Purposing businessDays as the days with registers for meta calc
      lastRecordDate
    };
  }

  // OLD LOGIC for other periods (day/week/month/year) - Kept as fallback/standard
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

  // Determine End Date (Always Limit to Last 'Fim de Expediente' found)
  // User Instruction: "deve contar até o último ponto de 'Fim de Expediente' batido pelo usuario"

  let lastRecordDate: string | null = null;
  let endDate = new Date(now);
  endDate.setDate(endDate.getDate() - 1); // Default fallback: Yesterday
  endDate.setHours(23, 59, 59, 999);

  // 1. Fetch the absolute last 'Fim de Expediente'
  const { data: lastSaida } = await supabase
    .from('ponto_registros')
    .select('datahora')
    .eq('user_id', userId)
    .eq('tipo', 'Fim de expediente')
    .order('datahora', { ascending: false })
    .limit(1)
    .single();

  if (lastSaida) {
    const lastWorkDate = new Date(lastSaida.datahora);
    lastWorkDate.setHours(23, 59, 59, 999);

    // If the last worked day is BEFORE the default 'yesterday', we use it to stop the counter early.
    // If it's today or generally available, we use it. 
    // Effectively, we shouldn't count days AFTER the user last worked.
    endDate = lastWorkDate;
    lastRecordDate = lastSaida.datahora;
  }

  // If period logic wants to restrict 'endDate' further (like 'day'), we should respect the Min(PeriodEnd, LastWorkRec).
  // But for 'all' or 'year'/'month' where we look at "accumulated balance", stopping at the last real work day is usually desired.
  // The start time is set by period.


  const { data, error } = await supabase
    .from('ponto_registros')
    .select('*')
    .eq('user_id', userId)
    .gte('datahora', startTime.toISOString())
    .lte('datahora', endDate.toISOString());

  if (error || !data) {
    return { totalHours: 0, balance: 0, daysWorked: 0, businessDays: 0, lastRecordDate: null };
  }

  // Fetch Holidays
  const holidaysData = await getHolidays();
  const holidays = holidaysData.map(h => {
    // robustly handle YYYY-MM-DD or ISO string
    if (typeof h.data === 'string') {
      return h.data.split('T')[0];
    }
    return h.data; // fallback
  });

  // Fetch user role
  const user = await getUserProfile(userId);
  const isIntern = user?.role === 2;
  const WORKDAY_HOURS = isIntern ? 6.0 : 8.75; // Using 8.75 as standard

  // Group by Day
  const dailyRecords: Record<string, any[]> = {};
  data.forEach((r: any) => {
    const dayKey = new Date(r.datahora).toISOString().split('T')[0];
    if (!dailyRecords[dayKey]) dailyRecords[dayKey] = [];
    dailyRecords[dayKey].push({
      ...r,
      tipo: mapDbToType(r.tipo)
    });
  });

  let totalMs = 0;
  let businessDays = 0; // Renaming/Repurposing logic: Count actual business days
  let daysWorkedCount = 0;

  // Iterate days from start to now (or endDate)
  const iterDate = new Date(startTime);

  while (iterDate <= endDate) {
    const dayKey = iterDate.toISOString().split('T')[0];
    const dayOfWeek = iterDate.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 1. Calculate Expected (Meta) - First Step: Count Weekdays
    if (!isWeekend) {
      businessDays++; // Temporarily count all weekdays. We will subtract holidays after.
    }

    // 2. Calculate Worked
    const dayRecs = dailyRecords[dayKey];
    if (dayRecs && dayRecs.length > 0) {
      const workedPx = calculateWorkedTime(dayRecs as any);
      if (workedPx > 0) {
        totalMs += workedPx;
        daysWorkedCount++;
      }
    }

    iterDate.setDate(iterDate.getDate() + 1);
  }

  // User Algorithm: Business Days = Total Weekdays - Total Holidays (Explicit Request)
  // "Pegue os 34 dias uteis e retire os 7 feriados"
  const startStr = startTime.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const holidaysInRange = holidays.filter(hDate => hDate >= startStr && hDate <= endStr);
  const holidaysCount = holidaysInRange.length;

  // Subtract ALL holidays in range from the weekday count
  businessDays = Math.max(0, businessDays - holidaysCount);

  const expectedMs = businessDays * (WORKDAY_HOURS * 60 * 60 * 1000);

  const totalHours = totalMs / (1000 * 60 * 60);
  const expectedHours = expectedMs / (1000 * 60 * 60);

  const balance = totalHours - expectedHours;

  return { totalHours, balance, daysWorked: daysWorkedCount, businessDays, lastRecordDate };
};

export const getHistoryRecords = async (userId: string, start: Date, end: Date, type?: TipoPonto): Promise<PontoRegistro[]> => {
  let query = supabase
    .from('ponto_registros')
    .select('*')
    .eq('user_id', userId)
    .gte('datahora', start.toISOString())
    .lte('datahora', end.toISOString())
    .order('datahora', { ascending: false });

  if (type && type !== TipoPonto.FERIADO) {
    query = query.eq('tipo', getTipoString(type));
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching history:", error);
    return [];
  }

  let records = (data || []).map((r: any) => ({
    ...r,
    tipo: mapDbToType(r.tipo),
    fora_do_raio: !!r.justificativa_local // Derive from justification
  })) as PontoRegistro[];

  // Inject Virtual Holidays if 'FERIADO' or 'ALL' requested
  if (!type || type === TipoPonto.FERIADO) {
    const holidaysData = await getHolidays();
    const now = new Date();
    const iter = new Date(start);
    const endDate = new Date(end);

    while (iter <= endDate) {
      const dayKey = iter.toISOString().split('T')[0];

      const holidayObj = holidaysData.find(h => h.data === dayKey);

      // Check visibility: (Holiday - 1 Day) <= Now
      const oneDayBefore = new Date(iter);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      oneDayBefore.setHours(0, 0, 0, 0);
      const isVisible = now.getTime() >= oneDayBefore.getTime();

      if (holidayObj && isVisible) {
        // Check if there are already records for this day
        const hasRecords = records.some(r => r.datahora.startsWith(dayKey));

        if (!hasRecords) {
          // Insert virtual record using the start of the UTC day to avoid business hour assumptions
          records.push({
            id: -1 * iter.getTime(), // Fake ID
            user_id: userId,
            datahora: new Date(dayKey).toISOString(), // Start of UTC day
            tipo: TipoPonto.FERIADO,
            justificativa_local: holidayObj.titulo || "Feriado", // Use Title
            justificativa_aprovada: true, // Implied approved
            ordem: 0,
            horas_acumuladas: null,
            tempo_almoco: null,
            fora_do_raio: false
          });
        }
      }
      iter.setDate(iter.getDate() + 1);
    }

    // Re-sort
    records.sort((a, b) => new Date(b.datahora).getTime() - new Date(a.datahora).getTime());
  }

  // Filter again if needed (e.g. if we only wanted FERIADO, filter out others)
  if (type === TipoPonto.FERIADO) {
    records = records.filter(r => r.tipo === TipoPonto.FERIADO);
  }

  return records;
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
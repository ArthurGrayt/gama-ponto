-- Function to handle justification approval logic
CREATE OR REPLACE FUNCTION public.handle_justification_approval()
RETURNS TRIGGER AS $$
DECLARE
  u_role int;
  record_date date;
  
  -- Variables for Regular User Logic
  ts_entrada TIMESTAMPTZ;
  ts_saida_almoco TIMESTAMPTZ;
  ts_volta_almoco TIMESTAMPTZ;
  ts_saida TIMESTAMPTZ;
  
  acc_saida_almoco NUMERIC;
  acc_volta_almoco NUMERIC;
  
  -- Temps
  t_rec TIMESTAMPTZ;
  acc_rec NUMERIC;
BEGIN
  -- Only proceed if approved changed to true and type is 'falta'
  IF NEW.aprovada = true AND OLD.aprovada IS DISTINCT FROM true AND NEW.tipo = 'falta' THEN
    
    -- Get user role
    SELECT role INTO u_role FROM public.users WHERE user_id = NEW.usuario;
    
    -- Determine the date
    record_date := NEW.created_at::date;
    
    -- Check Role
    IF u_role = 2 THEN
       -- Intern: 08:00 (11:00 UTC) - 14:00 (17:00 UTC)
       -- Total: 6 hours. (Simple logic for interns, fixed times)

       -- Slot 1: Entrada (08:00)
       IF NOT EXISTS (SELECT 1 FROM public.ponto_registros WHERE user_id = NEW.usuario AND datahora::date = record_date AND ordem = 1) THEN
         INSERT INTO public.ponto_registros (user_id, datahora, tipo, ordem, horas_acumuladas, tempo_almoco)
         VALUES (NEW.usuario, (record_date + time '11:00:00') AT TIME ZONE 'UTC', 'Entrada', 1, NULL, NULL);
       END IF;
       
       -- Slot 2: Saida (14:00)
       IF NOT EXISTS (SELECT 1 FROM public.ponto_registros WHERE user_id = NEW.usuario AND datahora::date = record_date AND ordem = 2) THEN
         INSERT INTO public.ponto_registros (user_id, datahora, tipo, ordem, horas_acumuladas, tempo_almoco)
         VALUES (NEW.usuario, (record_date + time '17:00:00') AT TIME ZONE 'UTC', 'Fim de expediente', 2, 6.00, NULL);
       END IF;

    ELSE
       -- Regular User
       -- Dynamic Logic to ensure coherence with variables

       -- 1. ENTRADA (Ordem 1)
       SELECT datahora INTO ts_entrada FROM public.ponto_registros 
       WHERE user_id = NEW.usuario AND datahora::date = record_date AND ordem = 1;
       
       IF ts_entrada IS NULL THEN
          -- Default: 07:00 BRT (10:00 UTC)
          ts_entrada := (record_date + time '10:00:00') AT TIME ZONE 'UTC';
          INSERT INTO public.ponto_registros (user_id, datahora, tipo, ordem, horas_acumuladas, tempo_almoco)
          VALUES (NEW.usuario, ts_entrada, 'Entrada', 1, NULL, NULL);
       END IF;

       -- 2. SAIDA ALMOCO (Ordem 2)
       SELECT datahora, horas_acumuladas INTO ts_saida_almoco, acc_saida_almoco FROM public.ponto_registros 
       WHERE user_id = NEW.usuario AND datahora::date = record_date AND ordem = 2;
       
       IF ts_saida_almoco IS NULL THEN
           -- Default: 12:00 BRT (15:00 UTC)
           ts_saida_almoco := (record_date + time '15:00:00') AT TIME ZONE 'UTC';
           -- Calculate Accumulated: (SaidaAlmoco - Entrada)
           acc_saida_almoco := ROUND((EXTRACT(EPOCH FROM (ts_saida_almoco - ts_entrada)) / 3600.0)::numeric, 2);
           
           INSERT INTO public.ponto_registros (user_id, datahora, tipo, ordem, horas_acumuladas, tempo_almoco)
           VALUES (NEW.usuario, ts_saida_almoco, 'Saída para almoço', 2, acc_saida_almoco, NULL);
       END IF;

       -- 3. VOLTA ALMOCO (Ordem 3)
       SELECT datahora, horas_acumuladas INTO ts_volta_almoco, acc_volta_almoco FROM public.ponto_registros 
       WHERE user_id = NEW.usuario AND datahora::date = record_date AND ordem = 3;
       
       IF ts_volta_almoco IS NULL THEN
           -- Rule: Equals Slot 2 + 1h 15m
           ts_volta_almoco := ts_saida_almoco + interval '1 hour 15 minutes';
           acc_volta_almoco := acc_saida_almoco; -- Hours frozen during lunch
           
           INSERT INTO public.ponto_registros (user_id, datahora, tipo, ordem, horas_acumuladas, tempo_almoco)
           VALUES (NEW.usuario, ts_volta_almoco, 'Volta do almoço', 3, acc_volta_almoco, 1.25);
       END IF;

       -- 4. SAIDA (Ordem 4)
       SELECT datahora INTO ts_saida FROM public.ponto_registros 
       WHERE user_id = NEW.usuario AND datahora::date = record_date AND ordem = 4;
       
       IF ts_saida IS NULL THEN
           -- Default: 17:00 BRT (20:00 UTC)
           ts_saida := (record_date + time '20:00:00') AT TIME ZONE 'UTC';
           -- Calculate Accumulated: Acc3 + (Saida - VoltaAlmoco)
           acc_rec := acc_volta_almoco + ROUND((EXTRACT(EPOCH FROM (ts_saida - ts_volta_almoco)) / 3600.0)::numeric, 2);
           
           INSERT INTO public.ponto_registros (user_id, datahora, tipo, ordem, horas_acumuladas, tempo_almoco)
           VALUES (NEW.usuario, ts_saida, 'Fim de expediente', 4, acc_rec, NULL);
       END IF;
       
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition
DROP TRIGGER IF EXISTS on_justification_approve ON public.justificativa;
CREATE TRIGGER on_justification_approve
AFTER UPDATE ON public.justificativa
FOR EACH ROW EXECUTE FUNCTION public.handle_justification_approval();

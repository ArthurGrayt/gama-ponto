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
    
    -- Simplified logic: Insert a single record marking the absence as justified, 
    -- using the timestamp of the justification metadata to avoid hardcoding business hours.
    IF NOT EXISTS (SELECT 1 FROM public.ponto_registros WHERE user_id = NEW.usuario AND datahora::date = record_date) THEN
      INSERT INTO public.ponto_registros (user_id, datahora, tipo, ordem, horas_acumuladas, tempo_almoco)
      VALUES (NEW.usuario, NEW.created_at, 'Ausência', 1, 8.75, NULL);
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

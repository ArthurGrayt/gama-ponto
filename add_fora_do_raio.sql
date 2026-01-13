-- Add 'fora_do_raio' column to 'ponto_registros' table
ALTER TABLE public.ponto_registros
ADD COLUMN IF NOT EXISTS fora_do_raio boolean DEFAULT false;

-- Optional: Add comment
COMMENT ON COLUMN public.ponto_registros.fora_do_raio IS 'Indicates if the point was registered outside the allowed radius';

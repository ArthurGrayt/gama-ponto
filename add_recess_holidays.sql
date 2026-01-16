-- Update Holidays to match User's provided list exactly
-- List from Image:
-- 25/12/2025 (Natal)
-- 26/12/2025 (Natal)
-- 27/12/2025 (Natal)
-- 31/12/2025 (Ano Novo)
-- 01/01/2026 (Ano Novo)
-- 02/01/2026 (Ano Novo)

-- 1. Remove ANY other holidays in the Dec 2025 - Jan 2026 range to avoid conflicts/extras
DELETE FROM public.holidays 
WHERE data >= '2025-12-01' AND data <= '2026-01-31';

-- 2. Insert the specific list
INSERT INTO public.holidays (data, titulo, tipo)
VALUES 
  ('2025-12-25', 'Natal', 'feriado'),
  ('2025-12-26', 'Natal', 'feriado'),
  ('2025-12-27', 'Natal', 'feriado'),
  ('2025-12-31', 'Ano Novo', 'feriado'),
  ('2026-01-01', 'Ano Novo', 'feriado'),
  ('2026-01-02', 'Ano Novo', 'feriado')
ON CONFLICT (data) DO UPDATE SET titulo = EXCLUDED.titulo;

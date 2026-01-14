-- Try to manually insert a row with a dummy image URL
-- Replace 'SOME_VALID_USER_ID' with a real ID if known, or pick one from users table
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the first user found (intern or normal)
  SELECT user_id INTO v_user_id FROM public.users LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.justificativa (usuario, tipo, texto, img, created_at, aprovada)
    VALUES (v_user_id, 'falta', 'TESTE_MANUAL_SQL', 'https://example.com/teste.png', now(), NULL);
  END IF;
END $$;

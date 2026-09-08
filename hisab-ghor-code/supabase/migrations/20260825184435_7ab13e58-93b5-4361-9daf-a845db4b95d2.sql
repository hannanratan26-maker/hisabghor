ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activation_code_3m text,
  ADD COLUMN IF NOT EXISTS activation_code_6m text,
  ADD COLUMN IF NOT EXISTS activation_code_1y text,
  ADD COLUMN IF NOT EXISTS activation_code_lifetime text;

CREATE OR REPLACE FUNCTION public.gen_activation_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

REVOKE ALL ON FUNCTION public.gen_activation_code() FROM PUBLIC, anon, authenticated;

UPDATE public.profiles
SET activation_code_3m = COALESCE(activation_code_3m, public.gen_activation_code()),
    activation_code_6m = COALESCE(activation_code_6m, public.gen_activation_code()),
    activation_code_1y = COALESCE(activation_code_1y, public.gen_activation_code()),
    activation_code_lifetime = COALESCE(activation_code_lifetime, public.gen_activation_code());

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_end_date,
    activation_code_3m, activation_code_6m, activation_code_1y, activation_code_lifetime)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), now() + interval '7 days',
    public.gen_activation_code(), public.gen_activation_code(), public.gen_activation_code(), public.gen_activation_code())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;
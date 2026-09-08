ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activation_code_shop text,
  ADD COLUMN IF NOT EXISTS shop_create_credits integer NOT NULL DEFAULT 0;

UPDATE public.profiles
SET activation_code_shop = COALESCE(activation_code_shop, public.gen_activation_code());

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_end_date,
    activation_code_3m, activation_code_6m, activation_code_1y, activation_code_lifetime,
    activation_code_shop)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), now() + interval '7 days',
    public.gen_activation_code(), public.gen_activation_code(), public.gen_activation_code(), public.gen_activation_code(),
    public.gen_activation_code())
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
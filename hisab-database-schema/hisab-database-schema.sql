-- হিসাব ঘর - ডেটাবেজ স্ট্রাকচার (কোনো ডেটা নেই)
-- ENUM
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- TABLES
CREATE TABLE public.app_settings (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value text NOT NULL,
  created_by text,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.cash_entries (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text DEFAULT 'other'::text,
  description text,
  date date,
  time text,
  party_name text,
  transaction_id uuid,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now(),
  shop_id uuid
);
CREATE TABLE public.email_confirmation_challenges (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  confirmed_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:05:00'::interval),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.packages (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  package_type text NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  used_by_email text,
  used_date timestamp with time zone,
  created_by text,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.parties (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  name text NOT NULL,
  phone text,
  type text NOT NULL DEFAULT 'customer'::text,
  total_debit numeric NOT NULL DEFAULT 0,
  total_credit numeric NOT NULL DEFAULT 0,
  notes text,
  avatar_color text,
  photo_url text,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now(),
  shop_id uuid,
  address text
);
CREATE TABLE public.products (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  name text NOT NULL,
  sale_price numeric,
  purchase_price numeric,
  stock numeric DEFAULT 0,
  category text,
  sub_category text,
  unit text DEFAULT 'ইউনিট'::text,
  description text,
  photo_url text,
  barcode text,
  online_sale boolean DEFAULT false,
  wholesale boolean DEFAULT false,
  wholesale_price numeric,
  wholesale_min_qty numeric,
  low_stock_alert boolean DEFAULT false,
  min_stock_level numeric,
  vat_applicable boolean DEFAULT false,
  vat_percent numeric,
  warranty boolean DEFAULT false,
  warranty_duration numeric,
  warranty_unit text,
  discount boolean DEFAULT false,
  discount_amount numeric,
  discount_type text,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now(),
  shop_id uuid
);
CREATE TABLE public.profiles (  id uuid NOT NULL,
  email text,
  full_name text,
  username text,
  mobile_number text,
  is_activated boolean NOT NULL DEFAULT false,
  account_status text NOT NULL DEFAULT 'trial'::text,
  trial_end_date timestamp with time zone,
  activation_end_date timestamp with time zone,
  package_type text,
  language text NOT NULL DEFAULT 'bn'::text,
  last_active timestamp with time zone,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now(),
  activation_code text,
  activation_code_3m text,
  activation_code_6m text,
  activation_code_1y text,
  activation_code_lifetime text,
  pre_admin_state jsonb,
  activation_code_shop text,
  shop_create_credits integer NOT NULL DEFAULT 0
);
CREATE TABLE public.sales (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  shop_id uuid,
  receipt_no text NOT NULL,
  sale_type text NOT NULL DEFAULT 'product'::text,
  payment_method text NOT NULL DEFAULT 'cash'::text,
  item_count integer NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  items_summary text,
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  delivery_charge numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  due numeric NOT NULL DEFAULT 0,
  profit numeric,
  customer_name text,
  customer_phone text,
  customer_address text,
  employee_name text,
  employee_phone text,
  note text,
  photo_url text,
  sale_date timestamp with time zone NOT NULL DEFAULT now(),
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.shops (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  shop_type text,
  division text,
  district text,
  area text,
  address text,
  online_sale boolean NOT NULL DEFAULT false,
  logo_url text,
  owner_name text,
  owner_phone text,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.sub_categories (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  name text NOT NULL,
  category text,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now(),
  shop_id uuid
);
CREATE TABLE public.transactions (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  party_id uuid,
  party_name text,
  type text NOT NULL,
  category text,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  date date,
  time text,
  attachment_url text,
  created_date timestamp with time zone NOT NULL DEFAULT now(),
  updated_date timestamp with time zone NOT NULL DEFAULT now(),
  shop_id uuid
);
CREATE TABLE public.user_roles (  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_entries TO authenticated;
GRANT ALL ON public.cash_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_confirmation_challenges TO authenticated;
GRANT ALL ON public.email_confirmation_challenges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
GRANT ALL ON public.parties TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT ALL ON public.shops TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_categories TO authenticated;
GRANT ALL ON public.sub_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- ROW LEVEL SECURITY
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_confirmation_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (((id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (((id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "own parties" ON public.parties FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "own transactions" ON public.transactions FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "own cash entries" ON public.cash_entries FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "own products" ON public.products FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "own sub categories" ON public.sub_categories FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "packages admin insert" ON public.packages FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "packages admin delete" ON public.packages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "packages admin read" ON public.packages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "packages admin update" ON public.packages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "settings public keys readable" ON public.app_settings FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'admin'::app_role) OR (key = ANY (ARRAY['free_mode'::text, 'email_verify_off'::text, 'default_trial_days'::text]))));
CREATE POLICY "Users can read own email challenges" ON public.email_confirmation_challenges FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can create own email challenges" ON public.email_confirmation_challenges FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (confirmed_at IS NULL)));
CREATE POLICY "Users can confirm own email challenges" ON public.email_confirmation_challenges FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (expires_at > now()))) WITH CHECK (((auth.uid() = user_id) AND (confirmed_at IS NOT NULL)));
CREATE POLICY "Users can delete own email challenges" ON public.email_confirmation_challenges FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "own shops" ON public.shops FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "own sales" ON public.sales FOR ALL TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$
;
CREATE OR REPLACE FUNCTION public.redeem_package(_code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  UPDATE public.packages
  SET is_used = true,
      used_by_email = v_email,
      used_date = now()
  WHERE code = upper(btrim(_code))
    AND is_used = false
  RETURNING package_type INTO v_type;

  RETURN v_type;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.gen_activation_code()
 RETURNS text
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$function$
;
CREATE OR REPLACE FUNCTION public.set_email_confirmation_challenge_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.main_admin_email()
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$ SELECT 'hannanratan27@gmail.com'::text $function$
;
CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id AND lower(u.email) = lower(public.main_admin_email())
  )
$function$
;
CREATE OR REPLACE FUNCTION public.grant_main_admin_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(COALESCE(NEW.email, '')) = lower(public.main_admin_email()) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.touch_updated_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_date = now(); RETURN NEW; END; $function$
;
CREATE OR REPLACE FUNCTION public.sync_admin_activation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE snap jsonb;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    UPDATE public.profiles p SET
      pre_admin_state = COALESCE(p.pre_admin_state, jsonb_build_object(
        'is_activated', p.is_activated,
        'account_status', p.account_status,
        'package_type', p.package_type,
        'activation_end_date', p.activation_end_date,
        'trial_end_date', p.trial_end_date
      )),
      is_activated = true,
      account_status = 'activated',
      package_type = 'lifetime',
      activation_end_date = now() + interval '100 years'
    WHERE p.id = NEW.user_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
    SELECT p.pre_admin_state INTO snap FROM public.profiles p WHERE p.id = OLD.user_id;
    UPDATE public.profiles p SET
      is_activated = COALESCE((snap->>'is_activated')::boolean, false),
      account_status = COALESCE(snap->>'account_status', 'trial'),
      package_type = NULLIF(snap->>'package_type', ''),
      activation_end_date = (snap->>'activation_end_date')::timestamptz,
      trial_end_date = COALESCE((snap->>'trial_end_date')::timestamptz, p.trial_end_date),
      pre_admin_state = NULL
    WHERE p.id = OLD.user_id;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.guard_admin_role_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' AND public.is_main_admin(OLD.user_id) THEN
      RAISE EXCEPTION 'The main admin cannot lose admin access';
    END IF;
    IF OLD.role = 'admin' AND actor IS NOT NULL AND NOT public.is_main_admin(actor) THEN
      RAISE EXCEPTION 'Only the main admin can remove admin access';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.role = 'admin' AND actor IS NOT NULL AND NOT public.is_main_admin(actor)
     AND NOT public.is_main_admin(NEW.user_id) THEN
    RAISE EXCEPTION 'Only the main admin can grant admin access';
  END IF;
  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.protect_main_admin_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_main_admin(OLD.id) THEN
    RAISE EXCEPTION 'The main admin account cannot be deleted';
  END IF;
  RETURN OLD;
END;
$function$
;
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
END; $function$
;
CREATE OR REPLACE FUNCTION public.dump_table_sql(tname text)
 RETURNS SETOF text
 LANGUAGE plpgsql
AS $function$
declare
  r record;
  cols text;
  vals text;
  c record;
  jv jsonb;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns where table_schema='public' and table_name=tname;
  return next '-- TABLE: ' || tname;
  for r in execute format('select to_jsonb(t) as row from public.%I t', tname) loop
    vals := null;
    for c in select column_name from information_schema.columns where table_schema='public' and table_name=tname order by ordinal_position loop
      jv := r.row -> c.column_name;
      if jv is null or jv = 'null'::jsonb then
        vals := coalesce(vals || ', ', '') || 'NULL';
      elsif jsonb_typeof(jv) = 'number' then
        vals := coalesce(vals || ', ', '') || (jv #>> '{}');
      elsif jsonb_typeof(jv) = 'boolean' then
        vals := coalesce(vals || ', ', '') || (jv #>> '{}');
      else
        vals := coalesce(vals || ', ', '') || quote_literal(jv #>> '{}');
      end if;
    end loop;
    return next 'INSERT INTO public.' || quote_ident(tname) || ' (' || cols || ') VALUES (' || vals || ');';
  end loop;
  return next '';
end;
$function$
;

-- TRIGGERS
CREATE TRIGGER tr_check_filters CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();
CREATE TRIGGER update_objects_updated_at CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();
CREATE TRIGGER enforce_bucket_name_length_trigger CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
CREATE TRIGGER protect_buckets_delete CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER protect_objects_delete CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER on_auth_user_created CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER t_profiles_upd CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_date();
CREATE TRIGGER t_parties_upd CREATE TRIGGER t_parties_upd BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION touch_updated_date();
CREATE TRIGGER t_transactions_upd CREATE TRIGGER t_transactions_upd BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION touch_updated_date();
CREATE TRIGGER t_cash_entries_upd CREATE TRIGGER t_cash_entries_upd BEFORE UPDATE ON public.cash_entries FOR EACH ROW EXECUTE FUNCTION touch_updated_date();
CREATE TRIGGER t_products_upd CREATE TRIGGER t_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION touch_updated_date();
CREATE TRIGGER t_sub_categories_upd CREATE TRIGGER t_sub_categories_upd BEFORE UPDATE ON public.sub_categories FOR EACH ROW EXECUTE FUNCTION touch_updated_date();
CREATE TRIGGER t_packages_upd CREATE TRIGGER t_packages_upd BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION touch_updated_date();
CREATE TRIGGER t_app_settings_upd CREATE TRIGGER t_app_settings_upd BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION touch_updated_date();
CREATE TRIGGER set_email_confirmation_challenge_updated_at CREATE TRIGGER set_email_confirmation_challenge_updated_at BEFORE UPDATE ON public.email_confirmation_challenges FOR EACH ROW EXECUTE FUNCTION set_email_confirmation_challenge_updated_at();
CREATE TRIGGER t_shops_upd CREATE TRIGGER t_shops_upd BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION touch_updated_date();
CREATE TRIGGER user_roles_sync_admin_activation_ins CREATE TRIGGER user_roles_sync_admin_activation_ins AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION sync_admin_activation();
CREATE TRIGGER user_roles_sync_admin_activation_del CREATE TRIGGER user_roles_sync_admin_activation_del AFTER DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION sync_admin_activation();
CREATE TRIGGER user_roles_guard_admin_ins CREATE TRIGGER user_roles_guard_admin_ins BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION guard_admin_role_changes();
CREATE TRIGGER user_roles_guard_admin_del CREATE TRIGGER user_roles_guard_admin_del BEFORE DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION guard_admin_role_changes();
CREATE TRIGGER profiles_protect_main_admin CREATE TRIGGER profiles_protect_main_admin BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_main_admin_profile();
CREATE TRIGGER on_auth_user_created_main_admin CREATE TRIGGER on_auth_user_created_main_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION grant_main_admin_role();
CREATE TRIGGER t_sales_upd CREATE TRIGGER t_sales_upd BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION touch_updated_date();

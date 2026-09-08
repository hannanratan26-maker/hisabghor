
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  username text,
  mobile_number text,
  is_activated boolean NOT NULL DEFAULT false,
  account_status text NOT NULL DEFAULT 'trial',
  trial_end_date timestamptz,
  activation_end_date timestamptz,
  package_type text,
  language text NOT NULL DEFAULT 'bn',
  last_active timestamptz,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_end_date)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), now() + interval '7 days')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_date()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_date = now(); RETURN NEW; END; $$;

CREATE TABLE public.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  name text NOT NULL,
  phone text,
  type text NOT NULL DEFAULT 'customer',
  total_debit numeric NOT NULL DEFAULT 0,
  total_credit numeric NOT NULL DEFAULT 0,
  notes text,
  avatar_color text,
  photo_url text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text DEFAULT 'other',
  description text,
  date date,
  time text,
  party_name text,
  transaction_id uuid,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  name text NOT NULL,
  sale_price numeric,
  purchase_price numeric,
  stock numeric DEFAULT 0,
  category text,
  sub_category text,
  unit text DEFAULT 'ইউনিট',
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
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sub_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by text,
  name text NOT NULL,
  category text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties, public.transactions, public.cash_entries, public.products, public.sub_categories TO authenticated;
GRANT ALL ON public.parties, public.transactions, public.cash_entries, public.products, public.sub_categories TO service_role;

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own parties" ON public.parties FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own transactions" ON public.transactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own cash entries" ON public.cash_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own products" ON public.products FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own sub categories" ON public.sub_categories FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  package_type text NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  used_by_email text,
  used_date timestamptz,
  created_by text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages admin insert" ON public.packages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "packages admin delete" ON public.packages FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_by text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();
CREATE TRIGGER t_parties_upd BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();
CREATE TRIGGER t_transactions_upd BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();
CREATE TRIGGER t_cash_entries_upd BEFORE UPDATE ON public.cash_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();
CREATE TRIGGER t_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();
CREATE TRIGGER t_sub_categories_upd BEFORE UPDATE ON public.sub_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();
CREATE TRIGGER t_packages_upd BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();
CREATE TRIGGER t_app_settings_upd BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

INSERT INTO public.app_settings (key, value) VALUES ('default_trial_days','7'), ('free_mode','false');

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_date() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activation_code text;

CREATE POLICY "packages admin read" ON public.packages
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "packages admin update" ON public.packages
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.redeem_package(_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.redeem_package(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_package(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_package(text) TO authenticated;

CREATE POLICY "settings public keys readable" ON public.app_settings
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR key IN ('free_mode', 'email_verify_off', 'default_trial_days')
);

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

CREATE TABLE public.email_confirmation_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_confirmation_challenges TO authenticated;
GRANT ALL ON public.email_confirmation_challenges TO service_role;

ALTER TABLE public.email_confirmation_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own email challenges"
ON public.email_confirmation_challenges
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own email challenges"
ON public.email_confirmation_challenges
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND confirmed_at IS NULL);

CREATE POLICY "Users can confirm own email challenges"
ON public.email_confirmation_challenges
FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND expires_at > now())
WITH CHECK (auth.uid() = user_id AND confirmed_at IS NOT NULL);

CREATE POLICY "Users can delete own email challenges"
ON public.email_confirmation_challenges
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX email_confirmation_challenges_user_created_idx
ON public.email_confirmation_challenges (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_email_confirmation_challenge_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_email_confirmation_challenge_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_email_confirmation_challenge_updated_at() TO service_role;

CREATE TRIGGER set_email_confirmation_challenge_updated_at
BEFORE UPDATE ON public.email_confirmation_challenges
FOR EACH ROW EXECUTE FUNCTION public.set_email_confirmation_challenge_updated_at();

CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT ALL ON public.shops TO service_role;

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own shops" ON public.shops FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER t_shops_upd BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

ALTER TABLE public.products ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.parties ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.cash_entries ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.sub_categories ADD COLUMN shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE;

CREATE INDEX idx_products_shop ON public.products(shop_id);
CREATE INDEX idx_parties_shop ON public.parties(shop_id);
CREATE INDEX idx_transactions_shop ON public.transactions(shop_id);
CREATE INDEX idx_cash_entries_shop ON public.cash_entries(shop_id);
CREATE INDEX idx_sub_categories_shop ON public.sub_categories(shop_id);
CREATE INDEX idx_shops_user ON public.shops(user_id);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pre_admin_state jsonb;

CREATE OR REPLACE FUNCTION public.main_admin_email()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 'hannanratan27@gmail.com'::text $$;

CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id AND lower(u.email) = lower(public.main_admin_email())
  )
$$;

CREATE OR REPLACE FUNCTION public.sync_admin_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

DROP TRIGGER IF EXISTS user_roles_sync_admin_activation_ins ON public.user_roles;
CREATE TRIGGER user_roles_sync_admin_activation_ins
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_activation();

DROP TRIGGER IF EXISTS user_roles_sync_admin_activation_del ON public.user_roles;
CREATE TRIGGER user_roles_sync_admin_activation_del
AFTER DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_activation();

CREATE OR REPLACE FUNCTION public.guard_admin_role_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

DROP TRIGGER IF EXISTS user_roles_guard_admin_ins ON public.user_roles;
CREATE TRIGGER user_roles_guard_admin_ins
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_admin_role_changes();

DROP TRIGGER IF EXISTS user_roles_guard_admin_del ON public.user_roles;
CREATE TRIGGER user_roles_guard_admin_del
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_admin_role_changes();

CREATE OR REPLACE FUNCTION public.protect_main_admin_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_main_admin(OLD.id) THEN
    RAISE EXCEPTION 'The main admin account cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_main_admin ON public.profiles;
CREATE TRIGGER profiles_protect_main_admin
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_main_admin_profile();

CREATE OR REPLACE FUNCTION public.grant_main_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(COALESCE(NEW.email, '')) = lower(public.main_admin_email()) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_main_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_main_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_main_admin_role();

REVOKE ALL ON FUNCTION public.main_admin_email() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.is_main_admin(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.sync_admin_activation() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.guard_admin_role_changes() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.protect_main_admin_profile() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.grant_main_admin_role() FROM anon, authenticated, public;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activation_code_shop text,
  ADD COLUMN IF NOT EXISTS shop_create_credits integer NOT NULL DEFAULT 0;

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

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  created_by text,
  shop_id uuid references public.shops(id) on delete cascade,
  receipt_no text not null,
  sale_type text not null default 'product',
  payment_method text not null default 'cash',
  item_count integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  items_summary text,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  delivery_charge numeric not null default 0,
  total numeric not null default 0,
  paid numeric not null default 0,
  due numeric not null default 0,
  profit numeric,
  customer_name text,
  customer_phone text,
  customer_address text,
  employee_name text,
  employee_phone text,
  note text,
  photo_url text,
  sale_date timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

grant select, insert, update, delete on public.sales to authenticated;
grant all on public.sales to service_role;

alter table public.sales enable row level security;

drop policy if exists "own sales" on public.sales;
create policy "own sales" on public.sales to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_sales_shop on public.sales(shop_id);
create index if not exists idx_sales_date on public.sales(sale_date desc);

drop trigger if exists t_sales_upd on public.sales;
create trigger t_sales_upd before update on public.sales
  for each row execute function public.touch_updated_date();

ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS address text;

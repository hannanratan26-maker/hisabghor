ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pre_admin_state jsonb;

CREATE OR REPLACE FUNCTION public.main_admin_email()
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT 'hannanratan27@gmail.com'::text $$;

CREATE OR REPLACE FUNCTION public.is_main_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id AND lower(u.email) = lower(public.main_admin_email())
  )
$$;

-- Apply / revert lifetime activation when the admin role changes
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

-- Only the main admin may grant or remove admin rights; main admin keeps its own admin role
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

-- The main admin profile can never be deleted
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

-- New signups matching the main admin email become admin automatically
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
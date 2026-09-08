-- 1) packages: remove broad read + unrestricted claim update
DROP POLICY IF EXISTS "packages readable" ON public.packages;
DROP POLICY IF EXISTS "packages claim" ON public.packages;

CREATE POLICY "packages admin read" ON public.packages
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "packages admin update" ON public.packages
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) secure redeem routine for regular users
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

-- 3) app_settings: only public keys readable by regular users
DROP POLICY IF EXISTS "settings readable" ON public.app_settings;

CREATE POLICY "settings public keys readable" ON public.app_settings
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR key IN ('free_mode', 'email_verify_off', 'default_trial_days')
);

-- 4) trigger-only SECURITY DEFINER function not callable by clients
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_date() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_updated_date() FROM anon;
REVOKE ALL ON FUNCTION public.touch_updated_date() FROM authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
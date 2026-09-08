CREATE OR REPLACE FUNCTION public.main_admin_email()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 'hannanratan27@gmail.com'::text $$;

REVOKE ALL ON FUNCTION public.main_admin_email() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.is_main_admin(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.sync_admin_activation() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.guard_admin_role_changes() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.protect_main_admin_profile() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.grant_main_admin_role() FROM anon, authenticated, public;
CREATE TABLE public.email_confirmation_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
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
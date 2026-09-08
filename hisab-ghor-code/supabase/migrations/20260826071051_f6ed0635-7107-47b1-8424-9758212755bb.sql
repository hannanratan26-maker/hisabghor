ALTER TABLE public.email_confirmation_challenges
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '5 minutes');

UPDATE public.email_confirmation_challenges
SET expires_at = LEAST(expires_at, created_at + interval '5 minutes')
WHERE confirmed_at IS NULL
  AND expires_at > created_at + interval '5 minutes';
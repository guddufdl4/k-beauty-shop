-- Phase 2-F: record Terms/Privacy consent for NEW wholesale signups only.
-- Additive. Do not backfill existing members. Do not apply remotely unless approved.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS privacy_version TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    company_name,
    country_code,
    username,
    preferred_currency,
    terms_accepted_at,
    privacy_accepted_at,
    terms_version,
    privacy_version
  )
  VALUES (
    NEW.id,
    NEW.email,
    'customer',
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'country_code', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'username', '')), ''),
    COALESCE(NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'preferred_currency', '')), ''), 'USD'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'terms_accepted', '') = 'true'
        THEN now()
      ELSE NULL
    END,
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'privacy_accepted', '') = 'true'
        THEN now()
      ELSE NULL
    END,
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'terms_version', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'privacy_version', '')), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    company_name = COALESCE(EXCLUDED.company_name, public.profiles.company_name),
    country_code = COALESCE(EXCLUDED.country_code, public.profiles.country_code),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    preferred_currency = COALESCE(EXCLUDED.preferred_currency, public.profiles.preferred_currency),
    terms_accepted_at = COALESCE(public.profiles.terms_accepted_at, EXCLUDED.terms_accepted_at),
    privacy_accepted_at = COALESCE(public.profiles.privacy_accepted_at, EXCLUDED.privacy_accepted_at),
    terms_version = COALESCE(public.profiles.terms_version, EXCLUDED.terms_version),
    privacy_version = COALESCE(public.profiles.privacy_version, EXCLUDED.privacy_version);

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.terms_accepted_at IS
  'Set only when a new signup accepts the current Terms of Service. Never backfilled.';
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS
  'Set only when a new signup accepts the current Privacy Policy. Never backfilled.';

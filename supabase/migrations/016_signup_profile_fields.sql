-- Wholesale signup fields: username, quote currency, and metadata copy on insert.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT;

UPDATE public.profiles
SET preferred_currency = 'USD'
WHERE preferred_currency IS NULL OR btrim(preferred_currency) = '';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_currency_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_currency_check
  CHECK (preferred_currency IS NULL OR preferred_currency IN ('USD', 'KRW'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL AND btrim(username) <> '';

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
    preferred_currency
  )
  VALUES (
    NEW.id,
    NEW.email,
    'customer',
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'country_code', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'username', '')), ''),
    COALESCE(NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'preferred_currency', '')), ''), 'USD')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    company_name = COALESCE(EXCLUDED.company_name, public.profiles.company_name),
    country_code = COALESCE(EXCLUDED.country_code, public.profiles.country_code),
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    preferred_currency = COALESCE(EXCLUDED.preferred_currency, public.profiles.preferred_currency);

  RETURN NEW;
END;
$$;

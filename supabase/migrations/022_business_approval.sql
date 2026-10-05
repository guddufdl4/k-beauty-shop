-- Existing wholesale/admin profiles retain their authorization.
-- customer profiles require an explicit admin promotion to wholesale.
CREATE OR REPLACE FUNCTION public.is_approved_business()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','wholesale')) $$;
REVOKE ALL ON FUNCTION public.is_approved_business() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_approved_business() TO authenticated;

DROP POLICY IF EXISTS products_business_approval ON public.products;
CREATE POLICY products_business_approval ON public.products AS RESTRICTIVE
FOR SELECT TO authenticated USING (public.is_approved_business());

-- Own-profile RLS must not allow self-approval or admin escalation.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin() THEN
    IF (TG_OP = 'INSERT' AND NEW.role <> 'customer') OR
       (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'Only an administrator may change business approval' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

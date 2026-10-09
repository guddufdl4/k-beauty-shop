-- Role elevation is available only through authorized server actions.
-- Authenticated admins must not bypass the master-only confirmation through REST.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF current_user IN ('authenticated','anon') AND OLD.role='admin' THEN
   RAISE EXCEPTION 'Administrator accounts are protected' USING ERRCODE='42501';
  END IF;
  RETURN OLD;
 END IF;
 IF current_user IN ('authenticated','anon') THEN
  IF (TG_OP='INSERT' AND NEW.role='admin') OR
     (TG_OP='UPDATE' AND NEW.role IS DISTINCT FROM OLD.role AND (NEW.role='admin' OR OLD.role='admin')) THEN
   RAISE EXCEPTION 'Administrator designation requires the master server workflow' USING ERRCODE='42501';
  END IF;
  IF NOT public.is_admin() THEN
   IF (TG_OP='INSERT' AND (NEW.role <> 'customer' OR NEW.member_grade <> 'normal' OR NEW.staff_scope <> 'none')) OR
      (TG_OP='UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.member_grade IS DISTINCT FROM OLD.member_grade OR NEW.staff_scope IS DISTINCT FROM OLD.staff_scope)) THEN
    RAISE EXCEPTION 'Only authorized staff may change membership access' USING ERRCODE='42501';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE TRIGGER protect_admin_profile_deletion BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

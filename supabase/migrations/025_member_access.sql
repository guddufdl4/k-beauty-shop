BEGIN;
-- Membership grade and staff access are independent of business approval.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS member_grade text NOT NULL DEFAULT 'normal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_scope text NOT NULL DEFAULT 'none';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_member_grade_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_member_grade_check CHECK (member_grade IN ('normal', 'vip'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_staff_scope_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_staff_scope_check CHECK (staff_scope IN ('none', 'members'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin() THEN
    IF (TG_OP = 'INSERT' AND (NEW.role <> 'customer' OR NEW.member_grade <> 'normal' OR NEW.staff_scope <> 'none')) OR
       (TG_OP = 'UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.member_grade IS DISTINCT FROM OLD.member_grade OR NEW.staff_scope IS DISTINCT FROM OLD.staff_scope)) THEN
      RAISE EXCEPTION 'Only authorized staff may change membership access' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
COMMIT;

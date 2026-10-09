-- Membership records submission, not proof of document authenticity.
CREATE OR REPLACE FUNCTION public.require_business_document()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NEW.role='wholesale' AND NOT EXISTS (
   SELECT 1 FROM public.business_documents b WHERE b.user_id=NEW.id
   AND nullif(trim(b.file_path),'') IS NOT NULL
   AND b.file_path LIKE NEW.id::text || '/%'
   AND length(trim(b.business_number))>=3
   AND b.business_number=NEW.business_number
 ) THEN
   IF TG_OP='UPDATE' THEN
     IF OLD.role='wholesale' AND NEW.business_number IS DISTINCT FROM OLD.business_number THEN
       NEW.role='customer';
       RETURN NEW;
     END IF;
   END IF;
   RAISE EXCEPTION 'Business evidence is required for business membership' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.require_business_document() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS require_business_document ON public.profiles;
CREATE TRIGGER require_business_document BEFORE INSERT OR UPDATE OF role,business_number
ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.require_business_document();

CREATE OR REPLACE FUNCTION public.reset_business_review()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN
   UPDATE public.profiles SET role='customer' WHERE id=OLD.user_id AND role='wholesale';
   RETURN OLD;
 END IF;
 UPDATE public.profiles SET
   role=CASE WHEN nullif(trim(NEW.file_path),'') IS NOT NULL
     AND NEW.file_path LIKE NEW.user_id::text || '/%'
     AND length(trim(NEW.business_number))>=3 THEN 'wholesale'::public.user_role ELSE 'customer'::public.user_role END,
   business_number=NEW.business_number
 WHERE id=NEW.user_id AND role <> 'admin';
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.reset_business_review() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS reset_business_review ON public.business_documents;
CREATE TRIGGER reset_business_review AFTER INSERT OR UPDATE OF file_path,business_number
ON public.business_documents FOR EACH ROW EXECUTE FUNCTION public.reset_business_review();
CREATE TRIGGER revoke_business_membership_on_document_delete AFTER DELETE
ON public.business_documents FOR EACH ROW EXECUTE FUNCTION public.reset_business_review();

UPDATE public.profiles p SET role='customer' WHERE p.role='wholesale' AND NOT EXISTS (
 SELECT 1 FROM public.business_documents b WHERE b.user_id=p.id
 AND nullif(trim(b.file_path),'') IS NOT NULL AND b.file_path LIKE p.id::text || '/%'
 AND length(trim(b.business_number))>=3 AND b.business_number=p.business_number
);
UPDATE public.profiles p SET role='wholesale' WHERE p.role='customer' AND EXISTS (
 SELECT 1 FROM public.business_documents b WHERE b.user_id=p.id
 AND nullif(trim(b.file_path),'') IS NOT NULL AND b.file_path LIKE p.id::text || '/%'
 AND length(trim(b.business_number))>=3 AND b.business_number=p.business_number
);
NOTIFY pgrst,'reload schema';

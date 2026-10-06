BEGIN;
CREATE TABLE public.business_documents (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 file_path text, file_name text, submitted_at timestamptz,
 website text, business_number text NOT NULL, consent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_documents FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.business_documents TO service_role;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_number text;
-- Existing customers retain login/staff/grade; wholesale access now requires fresh evidence review.
UPDATE public.profiles SET role='customer' WHERE role='wholesale';
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('business-documents','business-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png']) ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- Direct storage access is denied even if a broader storage policy exists.
CREATE POLICY business_documents_private ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated USING (bucket_id <> 'business-documents') WITH CHECK (bucket_id <> 'business-documents');
CREATE OR REPLACE FUNCTION public.require_business_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.role='wholesale' AND (TG_OP='INSERT' OR OLD.role IS DISTINCT FROM 'wholesale') AND NOT EXISTS(SELECT 1 FROM public.business_documents WHERE user_id=NEW.id AND file_path IS NOT NULL AND length(business_number)>=3) THEN
  RAISE EXCEPTION 'Business evidence is required before approval';
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER require_business_document BEFORE INSERT OR UPDATE OF role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.require_business_document();
CREATE OR REPLACE FUNCTION public.reset_business_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.profiles SET role='customer',business_number=NEW.business_number WHERE id=NEW.user_id AND role <> 'admin';
 RETURN NEW;
END; $$;
CREATE TRIGGER reset_business_review AFTER INSERT OR UPDATE ON public.business_documents FOR EACH ROW EXECUTE FUNCTION public.reset_business_review();
NOTIFY pgrst,'reload schema';
COMMIT;

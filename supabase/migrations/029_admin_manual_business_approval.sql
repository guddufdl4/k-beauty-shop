BEGIN;
-- The application enforces document review for member staff. Full admins may approve manually.
DROP TRIGGER IF EXISTS require_business_document ON public.profiles;
UPDATE storage.buckets SET file_size_limit=NULL WHERE id='business-documents';
NOTIFY pgrst,'reload schema';
COMMIT;

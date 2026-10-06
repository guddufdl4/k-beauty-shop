BEGIN;
ALTER TABLE public.business_documents
 ADD COLUMN IF NOT EXISTS ai_consent_at timestamptz,
 ADD COLUMN IF NOT EXISTS ai_result jsonb,
 ADD COLUMN IF NOT EXISTS ai_file_path text,
 ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz,
 ADD COLUMN IF NOT EXISTS ai_started_at timestamptz;
-- Saving a review must not revoke an existing business approval.
DROP TRIGGER IF EXISTS reset_business_review ON public.business_documents;
CREATE TRIGGER reset_business_review AFTER INSERT OR UPDATE OF file_path,business_number
 ON public.business_documents FOR EACH ROW EXECUTE FUNCTION public.reset_business_review();
NOTIFY pgrst,'reload schema';
COMMIT;

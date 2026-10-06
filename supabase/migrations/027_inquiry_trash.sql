BEGIN;
ALTER TABLE public.support_inquiries ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.import_inquiries ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.wholesale_inquiries ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
NOTIFY pgrst, 'reload schema';
COMMIT;

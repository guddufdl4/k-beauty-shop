BEGIN;
CREATE TABLE IF NOT EXISTS public.import_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  country text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  product text NOT NULL,
  brand text NOT NULL,
  origin text NOT NULL,
  price text NOT NULL DEFAULT '',
  quantity text NOT NULL,
  documents text NOT NULL DEFAULT '',
  message text NOT NULL,
  locale text NOT NULL DEFAULT 'en'
);
ALTER TABLE public.import_inquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.import_inquiries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_inquiries TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';

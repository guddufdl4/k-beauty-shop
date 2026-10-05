BEGIN;
CREATE TABLE IF NOT EXISTS public.wholesale_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  country text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  interested_brands text NOT NULL,
  estimated_quantity text NOT NULL,
  message text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  spam_trap text
);
ALTER TABLE public.wholesale_inquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wholesale_inquiries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wholesale_inquiries TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';

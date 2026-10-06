BEGIN;
CREATE TABLE IF NOT EXISTS public.support_inquiries (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  contact_name text NOT NULL,
  email text NOT NULL,
  category text NOT NULL CHECK (category IN ('general','account','quotation','product','other')),
  subject text NOT NULL,
  message text NOT NULL,
  order_number text,
  locale text NOT NULL DEFAULT 'en',
  privacy_accepted_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS support_inquiries_created_idx ON public.support_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS support_inquiries_email_created_idx ON public.support_inquiries(email,created_at DESC);
ALTER TABLE public.support_inquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_inquiries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_inquiries TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';

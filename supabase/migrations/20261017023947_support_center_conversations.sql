BEGIN;
ALTER TABLE public.support_inquiries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text;
ALTER TABLE public.support_inquiries ADD COLUMN IF NOT EXISTS last_reply_from_staff boolean;
CREATE INDEX IF NOT EXISTS support_inquiries_owner_created_idx ON public.support_inquiries(user_id,created_at DESC,id) WHERE deleted_at IS NULL;
CREATE TABLE public.support_inquiry_replies (
 id uuid PRIMARY KEY,
 inquiry_id uuid NOT NULL REFERENCES public.support_inquiries(id),
 author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 body text NOT NULL CHECK (length(body) BETWEEN 2 AND 5000),
 from_staff boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 email_status text NOT NULL DEFAULT 'pending' CHECK (email_status IN ('pending','sent','failed'))
);
CREATE INDEX support_inquiry_replies_parent_idx ON public.support_inquiry_replies(inquiry_id,created_at);
ALTER TABLE public.support_inquiry_replies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_inquiry_replies FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.support_inquiry_replies TO service_role;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
 VALUES ('support-attachments','support-attachments',false,3145728,ARRAY['application/pdf','image/jpeg','image/png'])
 ON CONFLICT (id) DO NOTHING;
COMMIT;
NOTIFY pgrst,'reload schema';

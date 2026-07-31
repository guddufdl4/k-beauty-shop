-- Company public contact fields and product best-seller flag

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_best_seller
  ON public.products (is_best_seller)
  WHERE status = 'active' AND is_best_seller = TRUE;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS public_email TEXT,
  ADD COLUMN IF NOT EXISTS public_phone TEXT,
  ADD COLUMN IF NOT EXISTS public_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS company_address TEXT,
  ADD COLUMN IF NOT EXISTS business_hours TEXT,
  ADD COLUMN IF NOT EXISTS avg_lead_time TEXT,
  ADD COLUMN IF NOT EXISTS company_registration TEXT;
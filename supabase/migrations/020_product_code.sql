-- Phase 2-F: public HMT product codes (HMT-000001).
-- Additive only. Do not apply remotely from this workspace unless separately approved.
-- Does not overwrite barcode or sku. Deleted codes are never reused (sequence).

CREATE SEQUENCE IF NOT EXISTS public.product_code_seq
  AS bigint
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  START WITH 1
  CACHE 1;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_code TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_product_code_format_chk'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_product_code_format_chk
      CHECK (product_code IS NULL OR product_code ~ '^HMT-[0-9]{6}$');
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS products_product_code_uidx
  ON public.products (product_code);

CREATE OR REPLACE FUNCTION public.format_hmt_product_code(n bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'HMT-' || lpad(n::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public.next_hmt_product_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  assigned text;
BEGIN
  LOOP
    assigned := public.format_hmt_product_code(nextval('public.product_code_seq'));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.products WHERE product_code = assigned
    );
  END LOOP;
  RETURN assigned;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_product_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.product_code IS NULL OR btrim(NEW.product_code) = '' THEN
    NEW.product_code := public.next_hmt_product_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_assign_product_code ON public.products;
CREATE TRIGGER trg_products_assign_product_code
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_product_code();

-- Stable one-time backfill: created_at, then id. Sequence advances so deleted numbers stay unused.
WITH numbered AS (
  SELECT
    id,
    public.format_hmt_product_code(nextval('public.product_code_seq')) AS code
  FROM public.products
  WHERE product_code IS NULL
  ORDER BY created_at ASC NULLS LAST, id ASC
)
UPDATE public.products AS p
SET product_code = numbered.code
FROM numbered
WHERE p.id = numbered.id
  AND p.product_code IS NULL;

GRANT SELECT (product_code) ON TABLE public.products TO anon;

COMMENT ON COLUMN public.products.product_code IS
  'Public HMT catalog code (HMT-000001). Independent of id, slug, barcode, and sku.';

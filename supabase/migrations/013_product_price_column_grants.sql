-- Phase 2-B: Restrict anon SELECT on products to storefront-public columns only.
-- Authenticated members retain full row SELECT (RLS still applies).
-- Admin write/read policies unchanged; service role unchanged.

REVOKE SELECT ON TABLE public.products FROM anon;

GRANT SELECT (
  id,
  category_id,
  name,
  slug,
  description,
  short_description,
  brand,
  sku,
  barcode,
  moq,
  sold_out,
  weight_grams,
  ingredients,
  how_to_use,
  country_of_origin,
  is_featured,
  is_best_seller,
  image_url,
  meta_title,
  meta_description,
  created_at,
  updated_at,
  status,
  deleted_at
) ON TABLE public.products TO anon;

-- Members (authenticated JWT) may read all columns; RLS policies unchanged.
GRANT SELECT ON TABLE public.products TO authenticated;

-- Soft-deleted rows may keep status='active'; tighten public read policy.
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

COMMENT ON TABLE public.products IS
  'Anon: column SELECT excludes price, stock, content flags, import fields. status/deleted_at granted for WHERE/RLS only.';
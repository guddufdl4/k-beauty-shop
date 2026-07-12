-- Soft delete for products: hide from storefront, recover from admin "삭제됨" tab
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_products_deleted_at
  ON public.products (deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.products.deleted_at IS
  'When set, product is hidden from storefront and admin active list; restore clears this column.';
alter table public.products
  add column admin_missing_price boolean generated always as (coalesce(wholesale_price,0) <= 0 or coalesce(compare_at_price,0) <= 0) stored,
  add column admin_missing_barcode boolean generated always as (coalesce(btrim(barcode),'') !~ '^([0-9]{8}|[0-9]{12,14})$') stored,
  add column admin_name_needs_review boolean generated always as (btrim(coalesce(name,'')) = '' or regexp_replace(lower(coalesce(name,'')), '[^a-z0-9가-힣]', '', 'g') = regexp_replace(lower(coalesce(brand,'')), '[^a-z0-9가-힣]', '', 'g') or coalesce(source_row->>'__name_review','') = 'required') stored;
create index products_admin_review_idx on public.products(admin_missing_price,admin_missing_barcode,admin_name_needs_review,needs_image) where deleted_at is null;

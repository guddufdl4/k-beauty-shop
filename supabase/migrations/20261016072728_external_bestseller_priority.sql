alter table public.products add column external_best_rank integer check (external_best_rank > 0);
create index products_storefront_external_best_idx
 on public.products(sold_out asc,external_best_rank asc nulls last,created_at desc,id desc)
 where status='active' and deleted_at is null;
comment on column public.products.external_best_rank is 'Evidence-based external bestseller recommendation order; not HMT sales volume.';

-- Return the same active brand set without downloading every product row.
set lock_timeout = '3s';
create index if not exists products_active_brand_created_idx
  on public.products (brand, created_at desc, id)
  where status = 'active' and deleted_at is null;

create or replace function public.storefront_active_brand_names()
returns table (brand text)
language sql stable security invoker
set search_path = ''
as $$
  select distinct p.brand
  from public.products as p
  where p.status = 'active' and p.deleted_at is null
    and p.brand is not null and pg_catalog.btrim(p.brand) <> ''
  order by p.brand;
$$;
-- Server-only read function. No new browser privileges or RLS bypass.
revoke all on function public.storefront_active_brand_names() from public, anon, authenticated;
grant execute on function public.storefront_active_brand_names() to service_role;

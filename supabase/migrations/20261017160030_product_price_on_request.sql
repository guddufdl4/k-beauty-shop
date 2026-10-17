alter table public.products add column price_on_request boolean not null default false;
comment on column public.products.price_on_request is 'Supplier-listed product sold by individual price inquiry; never use legacy price as a supply price.';
grant select (price_on_request) on public.products to anon;
-- A later confirmed supply price automatically restores ordinary quotation behavior.
create function public.clear_price_request_when_priced() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.wholesale_price > 1 then new.price_on_request := false; end if;
  return new;
end;
$$;
revoke all on function public.clear_price_request_when_priced() from public, anon, authenticated;
create trigger products_clear_price_request before insert or update of wholesale_price, price_on_request
on public.products for each row execute function public.clear_price_request_when_priced();
notify pgrst, 'reload schema';

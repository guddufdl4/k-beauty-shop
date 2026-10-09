create table public.order_admin_workflow (
  order_id uuid primary key references public.orders(id) on delete cascade,
  stage text not null default 'new' check (stage in ('new','reviewing','quoted','waiting','confirmed','shipped')),
  assignee_id uuid references public.profiles(id) on delete set null,
  internal_note text not null default '' check (char_length(internal_note) <= 5000),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
alter table public.order_admin_workflow enable row level security;
revoke all on public.order_admin_workflow from public, anon, authenticated;
grant all on public.order_admin_workflow to service_role;
create index order_admin_workflow_assignee_idx on public.order_admin_workflow(assignee_id);
comment on table public.order_admin_workflow is 'Private admin workflow; never exposed through customer order snapshots.';
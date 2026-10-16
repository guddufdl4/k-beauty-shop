create table public.notification_inbox (
 user_id uuid not null references auth.users(id) on delete cascade,
 scope text not null check (scope in ('admin','account')),
 notification_id text not null,
 payload jsonb not null,
 received_at timestamptz not null default now(),
 read_at timestamptz,
 primary key (user_id,scope,notification_id)
);
alter table public.notification_inbox enable row level security;
revoke all on public.notification_inbox from anon, authenticated;
grant select on public.notification_inbox to authenticated;
grant all on public.notification_inbox to service_role;
create policy notification_owner_read on public.notification_inbox for select to authenticated
 using ((select auth.uid()) = user_id and (scope = 'account' or exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')));
create index notification_inbox_owner_received_idx on public.notification_inbox(user_id,scope,received_at desc);

create table public.push_subscriptions (
    id uuid default gen_random_uuid() primary key,
    endpoint text not null unique,
    auth text not null,
    p256dh text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS policies
alter table public.push_subscriptions enable row level security;

-- Allow anonymous inserts and reads (since there is no auth)
create policy "Allow anonymous insert"
on public.push_subscriptions
for insert
to anon
with check (true);

create policy "Allow anonymous select"
on public.push_subscriptions
for select
to anon
using (true);

create policy "Allow anonymous update"
on public.push_subscriptions
for update
to anon
using (true);

create policy "Allow anonymous delete"
on public.push_subscriptions
for delete
to anon
using (true);

-- Run in your own Supabase SQL editor. No demo rows are inserted.
create table if not exists public.robot_telemetry (
 id bigint generated always as identity primary key,
 robot_id text not null check (robot_id = 'rc-01'),
 payload jsonb not null,
 received_at bigint not null
);
create index if not exists robot_telemetry_latest on public.robot_telemetry (robot_id, received_at desc);
alter table public.robot_telemetry enable row level security;
-- No anon/user policies: only the server's service role may access this table.
-- A scheduled maintenance query may prune packets older than your chosen retention.

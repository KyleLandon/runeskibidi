-- Minimal tables for server presence and positions
create table if not exists public.player_presence (
  player_id uuid primary key,
  session_id text not null,
  status text not null check (status in ('online','offline')),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_position (
  player_id uuid primary key,
  x double precision not null default 0,
  y double precision not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.player_presence enable row level security;
alter table public.player_position enable row level security;

-- Admin service role will bypass RLS; client access can be added later if needed.


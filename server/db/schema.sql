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

-- Inventory and equipment (simplified)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slot text, -- if equippable, e.g., 'head','chest','legs','weapon','shield','shoulders','belt','ring','amulet'
  stackable boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.player_inventory (
  player_id uuid not null,
  slot_index int not null,
  item_id uuid not null references public.items(id) on delete restrict,
  quantity int not null default 1,
  primary key (player_id, slot_index)
);

create table if not exists public.player_equipment (
  player_id uuid not null,
  slot text not null,
  item_id uuid not null references public.items(id) on delete restrict,
  primary key (player_id, slot)
);

-- Ability cooldowns
create table if not exists public.ability_cooldowns (
  player_id uuid not null,
  ability_id text not null,
  last_used_at timestamptz not null,
  primary key (player_id, ability_id)
);

alter table public.player_inventory enable row level security;
alter table public.player_equipment enable row level security;
alter table public.items enable row level security;
alter table public.ability_cooldowns enable row level security;


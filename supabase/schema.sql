-- Project Civciv (boyorgirl.party) — Supabase PostgreSQL Schema
-- Run this SQL in your Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

-- 1. Orders (Lemon Squeezy / Manual / Mock)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('lemonsqueezy', 'mock', 'manual')),
  provider_order_id text unique,
  customer_email text not null,
  tier text not null check (tier in ('mini', 'party', 'mega')),
  max_guests integer not null check (max_guests > 0),
  amount_cents integer not null default 0,
  currency text not null default 'TRY',
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  locale text not null default 'tr',
  created_at timestamptz not null default now()
);

-- 2. Redeem Codes (8-char unambiguous product codes)
create table if not exists public.redeem_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  order_id uuid references public.orders(id) on delete set null,
  tier text not null check (tier in ('mini', 'party', 'mega')),
  max_guests integer not null check (max_guests > 0),
  customer_email text,
  status text not null default 'unused' check (status in ('unused', 'redeemed', 'revoked')),
  redeemed_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

-- 3. Party Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  redeem_code_id uuid unique references public.redeem_codes(id) on delete set null,
  room_code text not null unique,
  host_token_hash text not null unique,
  secret_token_hash text unique,
  secret_locked_at timestamptz,
  host_email text,
  title text not null,
  locale text not null default 'tr',
  gender_mode text not null check (gender_mode in ('host', 'secret_keeper')),
  -- Zero-leak rule: never select/expose true_gender to clients until phase = 'revealed'
  true_gender text check (true_gender in ('boy', 'girl')),
  phase text not null default 'lobby' check (phase in ('setup', 'lobby', 'color_show', 'countdown', 'revealed')),
  countdown_seconds integer not null default 10 check (countdown_seconds between 3 and 30),
  countdown_ends_at timestamptz,
  revealed_at timestamptz,
  allow_guest_collage boolean not null default true,
  max_guests integer not null default 25 check (max_guests > 0),
  photos_expires_at timestamptz not null default (now() + interval '30 days'),
  photos_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Party Participants (Guests)
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_token_hash text not null,
  name text not null,
  prediction text not null check (prediction in ('boy', 'girl')),
  selfie_path text,
  is_removed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, guest_token_hash)
);

-- Indexes
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_redeem_codes_code on public.redeem_codes (code);
create index if not exists idx_redeem_codes_status on public.redeem_codes (status);
create index if not exists idx_events_room_code on public.events (room_code);
create index if not exists idx_events_photos_expires on public.events (photos_expires_at) where photos_deleted_at is null;
create index if not exists idx_participants_event_active on public.participants (event_id, is_removed);

-- Updated_at trigger for events
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- Row Level Security: deny all direct anon access.
-- All reads/writes go strictly through server-side Next.js API routes using service_role.
alter table public.orders enable row level security;
alter table public.redeem_codes enable row level security;
alter table public.events enable row level security;
alter table public.participants enable row level security;

-- Storage bucket for guest selfies (private bucket; served via signed URLs or API proxy)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'selfies',
  'selfies',
  false,
  2097152, -- 2 MB max per compressed selfie
  array['image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do nothing;

-- Digital Heroes Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'subscriber' check (role in ('visitor', 'subscriber', 'admin')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- Charities
create table public.charities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

-- Charity events
create table public.charity_events (
  id uuid primary key default uuid_generate_v4(),
  charity_id uuid not null references public.charities(id) on delete cascade,
  title text not null,
  event_date date not null,
  description text,
  created_at timestamptz not null default now()
);

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_subscription_id text unique,
  plan text not null check (plan in ('monthly', 'yearly')),
  status text not null check (status in ('active', 'canceled', 'past_due', 'incomplete')),
  charity_id uuid references public.charities(id),
  charity_pct integer not null default 10 check (charity_pct >= 10 and charity_pct <= 100),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- Scores
create table public.scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  value integer not null check (value >= 1 and value <= 45),
  played_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, played_on)
);

-- Draws
create table public.draws (
  id uuid primary key default uuid_generate_v4(),
  month text not null unique, -- YYYY-MM
  mode text not null check (mode in ('random', 'weighted')),
  status text not null default 'draft' check (status in ('draft', 'simulated', 'published')),
  prize_pool_pence bigint not null default 0,
  rollover_pence bigint not null default 0, -- unclaimed tier-5 jackpot carried forward
  winning_numbers integer[],
  is_simulation_run boolean not null default false,
  created_at timestamptz not null default now()
);

-- Draw entries
create table public.draw_entries (
  id uuid primary key default uuid_generate_v4(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  numbers integer[] not null,
  weight integer not null default 1,
  unique (draw_id, user_id)
);

-- Winners
create table public.winners (
  id uuid primary key default uuid_generate_v4(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  tier integer not null check (tier in (3, 4, 5)),
  prize_pence bigint not null default 0,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'rejected')),
  proof_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Donations (one-off, decoupled from subscription)
create table public.donations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  charity_id uuid not null references public.charities(id),
  amount_pence bigint not null check (amount_pence > 0),
  stripe_payment_id text unique,
  created_at timestamptz not null default now()
);

-- Proof uploads (Supabase Storage object paths)
create table public.proof_uploads (
  id uuid primary key default uuid_generate_v4(),
  winner_id uuid not null references public.winners(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default now()
);
alter table public.proof_uploads enable row level security;
create policy "proof_own" on public.proof_uploads for all using (
  auth.uid() = (select user_id from public.winners where id = winner_id)
);

-- ── Supabase Storage ──────────────────────────────────────────────────────────
-- Create a storage bucket named 'winner-proofs' in the Supabase dashboard
-- (Storage → New bucket → name: winner-proofs → Public: true)
-- Then add this policy so only the winner can upload their own proof:
--
-- insert policy on storage.objects:
--   bucket_id = 'winner-proofs'
--   auth.uid()::text = (storage.foldername(name))[1]  -- optional path-based check
--
-- The backend uses the service role key so it bypasses storage RLS for uploads.

-- Row Level Security
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.scores enable row level security;
alter table public.charities enable row level security;
alter table public.charity_events enable row level security;
alter table public.draws enable row level security;
alter table public.draw_entries enable row level security;
alter table public.winners enable row level security;
alter table public.donations enable row level security;

-- RLS Policies (service role bypasses all — backend uses service role key)
-- Users can read/update their own data
create policy "users_own" on public.users for all using (auth.uid() = id);
create policy "subscriptions_own" on public.subscriptions for all using (auth.uid() = user_id);
create policy "scores_own" on public.scores for all using (auth.uid() = user_id);
create policy "charities_public_read" on public.charities for select using (true);
create policy "charity_events_public_read" on public.charity_events for select using (true);
create policy "draws_public_read" on public.draws for select using (status = 'published');
create policy "winners_own" on public.winners for select using (auth.uid() = user_id);
create policy "donations_own" on public.donations for all using (auth.uid() = user_id);

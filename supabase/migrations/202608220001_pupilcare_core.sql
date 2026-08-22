create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  age_label text,
  sex text,
  weight_label text,
  emoji text not null default '🐾',
  color text not null default '#dff6ff',
  health_score integer not null default 72 check (health_score between 0 and 100),
  allergies text,
  medications text,
  conditions text,
  veterinarian text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vaccines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  name text not null,
  administered_on date,
  next_due_on date,
  status text not null default 'ok' check (status in ('ok', 'soon', 'missing')),
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  title text not null,
  visit_type text not null,
  visit_date date,
  visit_time time,
  place text,
  status text not null default 'planned' check (status in ('requested', 'confirmed', 'planned', 'completed', 'cancelled')),
  source text not null default 'pupilcare',
  external_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  name text not null,
  kind text not null default 'Inne',
  storage_path text,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  provider text not null,
  provider_booking_id text,
  partner_name text,
  service_name text,
  starts_at timestamptz,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  service_fee_grosz integer not null check (service_fee_grosz in (499, 999)),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  doctor_id uuid,
  symptoms text not null,
  duration text,
  status text not null default 'intake' check (status in ('intake', 'payment', 'queued', 'in_call', 'completed', 'cancelled')),
  price_grosz integer not null check (price_grosz in (4999, 8999)),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'failed')),
  summary text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  provider_customer_id text,
  provider_subscription_id text unique,
  status text not null default 'inactive' check (status in ('inactive', 'trialing', 'active', 'past_due', 'cancelled')),
  price_grosz integer not null default 3999 check (price_grosz = 3999),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage_monthly (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,
  conversations integer not null default 0 check (conversations >= 0),
  primary key (owner_id, month)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists pets_set_updated_at on public.pets;
create trigger pets_set_updated_at before update on public.pets
for each row execute function public.set_updated_at();
drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.vaccines enable row level security;
alter table public.visits enable row level security;
alter table public.documents enable row level security;
alter table public.bookings enable row level security;
alter table public.consultations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.ai_usage_monthly enable row level security;

drop policy if exists "profiles_own_rows" on public.profiles;
create policy "profiles_own_rows" on public.profiles for all
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "pets_own_rows" on public.pets;
create policy "pets_own_rows" on public.pets for all
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "vaccines_own_rows" on public.vaccines;
create policy "vaccines_own_rows" on public.vaccines for all
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "visits_own_rows" on public.visits;
create policy "visits_own_rows" on public.visits for all
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "documents_own_rows" on public.documents;
create policy "documents_own_rows" on public.documents for all
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "bookings_own_rows" on public.bookings;
create policy "bookings_own_rows" on public.bookings for all
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "consultations_own_rows" on public.consultations;
create policy "consultations_own_rows" on public.consultations for all
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "subscriptions_own_rows" on public.subscriptions;
create policy "subscriptions_own_rows" on public.subscriptions for select
using ((select auth.uid()) = owner_id);
drop policy if exists "ai_usage_own_rows" on public.ai_usage_monthly;
create policy "ai_usage_own_rows" on public.ai_usage_monthly for select
using ((select auth.uid()) = owner_id);

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists visits_pet_id_idx on public.visits(pet_id, visit_date);
create index if not exists vaccines_pet_id_idx on public.vaccines(pet_id, next_due_on);
create index if not exists documents_pet_id_idx on public.documents(pet_id, created_at);
create index if not exists bookings_owner_id_idx on public.bookings(owner_id, created_at);
create index if not exists consultations_owner_id_idx on public.consultations(owner_id, created_at);

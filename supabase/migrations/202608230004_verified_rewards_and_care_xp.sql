-- Separate self-reported care XP from spendable, verified PupilPoints.

create table if not exists public.care_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  amount integer not null check (amount > 0),
  source text not null,
  reference_id uuid not null,
  description text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, source, reference_id)
);

create table if not exists public.verified_reward_actions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  action_type text not null check (action_type in ('booking', 'vet24', 'order', 'premium', 'referral', 'gps', 'photo', 'video')),
  external_reference text,
  points integer not null check (points > 0),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  evidence jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.care_level_rewards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  level smallint not null check (level between 2 and 5),
  points integer not null check (points > 0),
  created_at timestamptz not null default now(),
  unique (owner_id, level)
);

alter table public.care_tasks add column if not exists verification_type text not null default 'self_reported';
alter table public.care_tasks add column if not exists verification_status text not null default 'not_required';
alter table public.care_tasks add column if not exists proof_path text;

alter table public.care_xp_ledger enable row level security;
alter table public.verified_reward_actions enable row level security;
alter table public.care_level_rewards enable row level security;

drop policy if exists "care_xp_ledger_own_rows" on public.care_xp_ledger;
create policy "care_xp_ledger_own_rows" on public.care_xp_ledger for select to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "verified_reward_actions_own_rows" on public.verified_reward_actions;
create policy "verified_reward_actions_own_rows" on public.verified_reward_actions for select to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "care_level_rewards_own_rows" on public.care_level_rewards;
create policy "care_level_rewards_own_rows" on public.care_level_rewards for select to authenticated
using ((select auth.uid()) = owner_id);

-- Move any previously awarded self-reported points into non-spendable care XP.
insert into public.care_xp_ledger (owner_id, pet_id, amount, source, reference_id, description, created_at)
select owner_id, pet_id, amount, source, reference_id, description, created_at
from public.reward_ledger
where source in ('care_task', 'pet_checkin') and amount > 0
on conflict (owner_id, source, reference_id) do nothing;

delete from public.reward_ledger where source in ('care_task', 'pet_checkin');

create or replace function public.award_care_level_rewards()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  total_xp integer;
  level_row record;
  reward_id uuid;
begin
  select coalesce(sum(amount), 0)::integer into total_xp
  from public.care_xp_ledger
  where owner_id = new.owner_id;

  for level_row in
    select * from (values (2, 50, 10), (3, 150, 20), (4, 300, 30), (5, 600, 50))
      as levels(level_number, xp_required, reward_points)
    where total_xp >= xp_required
  loop
    insert into public.care_level_rewards (owner_id, level, points)
    values (new.owner_id, level_row.level_number, level_row.reward_points)
    on conflict (owner_id, level) do nothing
    returning id into reward_id;

    if reward_id is not null then
      insert into public.reward_ledger (owner_id, amount, source, reference_id, description)
      values (new.owner_id, level_row.reward_points, 'care_level', reward_id, 'Nagroda za poziom opieki ' || level_row.level_number);
      reward_id := null;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists care_xp_award_levels on public.care_xp_ledger;
create trigger care_xp_award_levels
after insert on public.care_xp_ledger
for each row execute function public.award_care_level_rewards();

-- Award one-time level bonuses for XP migrated just above, if applicable.
with xp_balances as (
  select owner_id, sum(amount)::integer as total_xp
  from public.care_xp_ledger
  group by owner_id
), eligible as (
  select balances.owner_id, levels.level_number, levels.reward_points
  from xp_balances balances
  cross join (values (2, 50, 10), (3, 150, 20), (4, 300, 30), (5, 600, 50))
    as levels(level_number, xp_required, reward_points)
  where balances.total_xp >= levels.xp_required
), inserted as (
  insert into public.care_level_rewards (owner_id, level, points)
  select owner_id, level_number, reward_points from eligible
  on conflict (owner_id, level) do nothing
  returning id, owner_id, level, points
)
insert into public.reward_ledger (owner_id, amount, source, reference_id, description)
select owner_id, points, 'care_level', id, 'Nagroda za poziom opieki ' || level
from inserted;

create or replace function public.award_completed_care_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  xp_amount integer;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    xp_amount := case new.task_key
      when 'water' then 5
      when 'activity' then 10
      when 'training' then 15
      else 5
    end;

    new.completed_at := coalesce(new.completed_at, now());
    insert into public.care_xp_ledger (owner_id, pet_id, amount, source, reference_id, description)
    values (new.owner_id, new.pet_id, xp_amount, 'care_task', new.id, 'Wykonane zadanie: ' || new.title)
    on conflict (owner_id, source, reference_id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.award_pet_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.care_xp_ledger (owner_id, pet_id, amount, source, reference_id, description)
  values (new.owner_id, new.pet_id, 10, 'pet_checkin', new.id, 'Check-in samopoczucia')
  on conflict (owner_id, source, reference_id) do nothing;
  return new;
end;
$$;

create or replace function public.award_verified_reward_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'verified' and old.status <> 'verified' then
    new.verified_at := coalesce(new.verified_at, now());
    insert into public.reward_ledger (owner_id, pet_id, amount, source, reference_id, description)
    values (new.owner_id, new.pet_id, new.points, 'verified_' || new.action_type, new.id, 'Zweryfikowana aktywność: ' || new.action_type)
    on conflict (owner_id, source, reference_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists verified_reward_action_award on public.verified_reward_actions;
create trigger verified_reward_action_award
before update on public.verified_reward_actions
for each row execute function public.award_verified_reward_action();

revoke all on function public.award_verified_reward_action() from public;
revoke all on function public.award_care_level_rewards() from public;
grant select on public.care_xp_ledger, public.verified_reward_actions, public.care_level_rewards to authenticated;

create index if not exists care_xp_ledger_owner_created_idx on public.care_xp_ledger(owner_id, created_at desc);
create index if not exists verified_reward_actions_owner_created_idx on public.verified_reward_actions(owner_id, created_at desc);
create index if not exists care_level_rewards_owner_created_idx on public.care_level_rewards(owner_id, created_at desc);

notify pgrst, 'reload schema';

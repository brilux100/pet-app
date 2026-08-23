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

alter table public.care_tasks add column if not exists verification_type text not null default 'self_reported';
alter table public.care_tasks add column if not exists verification_status text not null default 'not_required';
alter table public.care_tasks add column if not exists proof_path text;

alter table public.care_xp_ledger enable row level security;
alter table public.verified_reward_actions enable row level security;

drop policy if exists "care_xp_ledger_own_rows" on public.care_xp_ledger;
create policy "care_xp_ledger_own_rows" on public.care_xp_ledger for select to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "verified_reward_actions_own_rows" on public.verified_reward_actions;
create policy "verified_reward_actions_own_rows" on public.verified_reward_actions for select to authenticated
using ((select auth.uid()) = owner_id);

-- Move any previously awarded self-reported points into non-spendable care XP.
insert into public.care_xp_ledger (owner_id, pet_id, amount, source, reference_id, description, created_at)
select owner_id, pet_id, amount, source, reference_id, description, created_at
from public.reward_ledger
where source in ('care_task', 'pet_checkin') and amount > 0
on conflict (owner_id, source, reference_id) do nothing;

delete from public.reward_ledger where source in ('care_task', 'pet_checkin');

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
grant select on public.care_xp_ledger, public.verified_reward_actions to authenticated;

create index if not exists care_xp_ledger_owner_created_idx on public.care_xp_ledger(owner_id, created_at desc);
create index if not exists verified_reward_actions_owner_created_idx on public.verified_reward_actions(owner_id, created_at desc);

notify pgrst, 'reload schema';

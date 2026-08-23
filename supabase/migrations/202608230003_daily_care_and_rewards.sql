-- Daily care, wellbeing check-ins and secure PupilPoints ledger.

create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  task_key text not null check (task_key in ('water', 'activity', 'training')),
  title text not null,
  category text not null,
  scheduled_for date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (pet_id, scheduled_for, task_key)
);

create table if not exists public.pet_checkins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null references public.pets(id) on delete cascade,
  checked_on date not null default current_date,
  appetite smallint not null check (appetite between 1 and 3),
  energy smallint not null check (energy between 1 and 3),
  digestion smallint not null check (digestion between 1 and 3),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pet_id, checked_on)
);

create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  amount integer not null check (amount <> 0),
  source text not null,
  reference_id uuid not null,
  description text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, source, reference_id)
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  reward_code text not null check (reward_code in ('ai_chat', 'service_fee', 'vet24_discount')),
  cost_points integer not null,
  status text not null default 'available' check (status in ('available', 'used', 'expired')),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.care_tasks enable row level security;
alter table public.pet_checkins enable row level security;
alter table public.reward_ledger enable row level security;
alter table public.reward_redemptions enable row level security;

drop policy if exists "care_tasks_own_rows" on public.care_tasks;
create policy "care_tasks_own_rows" on public.care_tasks for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "pet_checkins_own_rows" on public.pet_checkins;
create policy "pet_checkins_own_rows" on public.pet_checkins for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "reward_ledger_own_rows" on public.reward_ledger;
create policy "reward_ledger_own_rows" on public.reward_ledger for select to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "reward_redemptions_own_rows" on public.reward_redemptions;
create policy "reward_redemptions_own_rows" on public.reward_redemptions for select to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.award_completed_care_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reward_amount integer;
begin
  if new.status = 'completed' and old.status <> 'completed' then
    reward_amount := case new.task_key
      when 'water' then 5
      when 'activity' then 10
      when 'training' then 15
      else 5
    end;

    new.completed_at := coalesce(new.completed_at, now());
    insert into public.reward_ledger (owner_id, pet_id, amount, source, reference_id, description)
    values (new.owner_id, new.pet_id, reward_amount, 'care_task', new.id, 'Wykonane zadanie: ' || new.title)
    on conflict (owner_id, source, reference_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists care_task_award_points on public.care_tasks;
create trigger care_task_award_points
before update on public.care_tasks
for each row execute function public.award_completed_care_task();

create or replace function public.award_pet_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.reward_ledger (owner_id, pet_id, amount, source, reference_id, description)
  values (new.owner_id, new.pet_id, 10, 'pet_checkin', new.id, 'Check-in samopoczucia')
  on conflict (owner_id, source, reference_id) do nothing;
  return new;
end;
$$;

drop trigger if exists pet_checkin_award_points on public.pet_checkins;
create trigger pet_checkin_award_points
after insert on public.pet_checkins
for each row execute function public.award_pet_checkin();

drop trigger if exists pet_checkins_set_updated_at on public.pet_checkins;
create trigger pet_checkins_set_updated_at before update on public.pet_checkins
for each row execute function public.set_updated_at();

create or replace function public.redeem_pupil_reward(p_reward_code text)
returns table (new_balance integer, redemption_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reward_cost integer;
  current_balance integer;
  new_redemption_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  reward_cost := case p_reward_code
    when 'ai_chat' then 100
    when 'service_fee' then 300
    when 'vet24_discount' then 500
    else null
  end;

  if reward_cost is null then
    raise exception 'Unknown reward';
  end if;

  select coalesce(sum(amount), 0)::integer
  into current_balance
  from public.reward_ledger
  where owner_id = (select auth.uid());

  if current_balance < reward_cost then
    raise exception 'Not enough points';
  end if;

  insert into public.reward_redemptions (owner_id, reward_code, cost_points)
  values ((select auth.uid()), p_reward_code, reward_cost)
  returning id into new_redemption_id;

  insert into public.reward_ledger (owner_id, amount, source, reference_id, description)
  values ((select auth.uid()), -reward_cost, 'reward_redemption', new_redemption_id, 'Odebrana nagroda: ' || p_reward_code);

  return query select current_balance - reward_cost, new_redemption_id;
end;
$$;

revoke all on function public.redeem_pupil_reward(text) from public;
grant execute on function public.redeem_pupil_reward(text) to authenticated;

create or replace function public.use_pupil_reward(p_reward_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_id uuid;
begin
  select id into selected_id
  from public.reward_redemptions
  where owner_id = (select auth.uid())
    and reward_code = p_reward_code
    and status = 'available'
  order by created_at
  limit 1
  for update skip locked;

  if selected_id is null then
    return false;
  end if;

  update public.reward_redemptions
  set status = 'used', used_at = now()
  where id = selected_id;
  return true;
end;
$$;

revoke all on function public.use_pupil_reward(text) from public;
grant execute on function public.use_pupil_reward(text) to authenticated;

grant select, insert, update, delete on public.care_tasks, public.pet_checkins to authenticated;
grant select on public.reward_ledger, public.reward_redemptions to authenticated;

create index if not exists care_tasks_owner_day_idx on public.care_tasks(owner_id, scheduled_for);
create index if not exists care_tasks_pet_day_idx on public.care_tasks(pet_id, scheduled_for);
create index if not exists pet_checkins_pet_day_idx on public.pet_checkins(pet_id, checked_on);
create index if not exists reward_ledger_owner_created_idx on public.reward_ledger(owner_id, created_at desc);

notify pgrst, 'reload schema';

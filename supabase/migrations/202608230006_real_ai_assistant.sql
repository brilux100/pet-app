-- Real PupilCare AI: private conversation history and atomic monthly limits.

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  urgency text not null default 'routine' check (urgency in ('routine', 'vet_soon', 'emergency')),
  created_at timestamptz not null default now()
);

alter table public.ai_messages enable row level security;

drop policy if exists "ai_messages_own_rows" on public.ai_messages;
create policy "ai_messages_own_rows" on public.ai_messages
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

grant select, insert, delete on public.ai_messages to authenticated;

create index if not exists ai_messages_owner_created_idx
  on public.ai_messages(owner_id, created_at desc);
create index if not exists ai_messages_pet_created_idx
  on public.ai_messages(pet_id, created_at desc);

create or replace function public.consume_ai_conversation(p_use_reward boolean default false)
returns table (
  allowed boolean,
  used integer,
  remaining integer,
  plan text,
  used_reward boolean,
  reward_redemption_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_month date := date_trunc('month', current_date)::date;
  current_plan text;
  current_used integer;
  selected_reward_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(p.plan, 'free')
    into current_plan
  from public.profiles p
  where p.id = current_user_id;

  current_plan := coalesce(current_plan, 'free');

  insert into public.ai_usage_monthly (owner_id, month, conversations)
  values (current_user_id, current_month, 0)
  on conflict (owner_id, month) do nothing;

  select a.conversations
    into current_used
  from public.ai_usage_monthly a
  where a.owner_id = current_user_id and a.month = current_month
  for update;

  current_used := coalesce(current_used, 0);

  if current_plan = 'premium' then
    update public.ai_usage_monthly a
      set conversations = a.conversations + 1
    where a.owner_id = current_user_id and a.month = current_month;
    return query select true, current_used + 1, -1, current_plan, false, null::uuid;
    return;
  end if;

  if current_used < 5 then
    update public.ai_usage_monthly a
      set conversations = a.conversations + 1
    where a.owner_id = current_user_id and a.month = current_month;
    return query select true, current_used + 1, 5 - (current_used + 1), current_plan, false, null::uuid;
    return;
  end if;

  if p_use_reward then
    select r.id
      into selected_reward_id
    from public.reward_redemptions r
    where r.owner_id = current_user_id
      and r.reward_code = 'ai_chat'
      and r.status = 'available'
    order by r.created_at
    limit 1
    for update skip locked;

    if selected_reward_id is not null then
      update public.reward_redemptions
        set status = 'used', used_at = now()
      where id = selected_reward_id and owner_id = current_user_id;
      return query select true, current_used, 0, current_plan, true, selected_reward_id;
      return;
    end if;
  end if;

  return query select false, current_used, 0, current_plan, false, null::uuid;
end;
$$;

create or replace function public.refund_ai_conversation(p_reward_redemption_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_month date := date_trunc('month', current_date)::date;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_reward_redemption_id is not null then
    update public.reward_redemptions
      set status = 'available', used_at = null
    where id = p_reward_redemption_id
      and owner_id = current_user_id
      and reward_code = 'ai_chat'
      and status = 'used';
  else
    update public.ai_usage_monthly a
      set conversations = greatest(0, a.conversations - 1)
    where a.owner_id = current_user_id and a.month = current_month;
  end if;
end;
$$;

revoke all on function public.consume_ai_conversation(boolean) from public;
grant execute on function public.consume_ai_conversation(boolean) to authenticated;
revoke all on function public.refund_ai_conversation(uuid) from public;
grant execute on function public.refund_ai_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';

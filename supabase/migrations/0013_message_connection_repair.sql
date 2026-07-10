-- Phase 6+ hardening: repair direct conversations for existing connections and
-- expose a safe, participant-checked way for the mobile app to open a chat.

insert into public.conversations (
  match_id,
  conversation_type,
  created_by_profile_id
)
select
  match.id,
  'direct',
  match.profile_one_id
from public.matches match
where match.match_type = 'person'
  and match.status = 'active'
  and not exists (
    select 1
    from public.conversations conversation
    where conversation.match_id = match.id
  )
on conflict (match_id) do nothing;

insert into public.conversation_members (
  conversation_id,
  profile_id,
  participant_role
)
select
  conversation.id,
  member.profile_id,
  'connection'
from public.conversations conversation
join public.matches match on match.id = conversation.match_id
cross join lateral (
  values (match.profile_one_id), (match.profile_two_id)
) as member(profile_id)
where conversation.conversation_type = 'direct'
  and match.match_type = 'person'
  and match.status = 'active'
on conflict (conversation_id, profile_id) do nothing;

create or replace function public.phase5_open_direct_conversation(
  target_connection_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := auth.uid();
  target_connection public.matches;
  saved_conversation_id uuid;
begin
  if current_profile_id is null then
    raise exception 'Sign in again to open this conversation.';
  end if;

  select *
  into target_connection
  from public.matches match
  where match.id = target_connection_id
    and match.match_type = 'person'
    and match.status = 'active';

  if target_connection.id is null
    or current_profile_id not in (
      target_connection.profile_one_id,
      target_connection.profile_two_id
    ) then
    raise exception 'This connection is not available.';
  end if;

  if public.phase5_profiles_blocked(
    target_connection.profile_one_id,
    target_connection.profile_two_id
  ) then
    raise exception 'Messaging is unavailable for this connection.';
  end if;

  insert into public.conversations (
    match_id,
    conversation_type,
    created_by_profile_id
  )
  values (
    target_connection.id,
    'direct',
    current_profile_id
  )
  on conflict (match_id)
  do update set updated_at = public.conversations.updated_at
  returning id into saved_conversation_id;

  insert into public.conversation_members (
    conversation_id,
    profile_id,
    participant_role
  )
  values
    (saved_conversation_id, target_connection.profile_one_id, 'connection'),
    (saved_conversation_id, target_connection.profile_two_id, 'connection')
  on conflict (conversation_id, profile_id) do nothing;

  return saved_conversation_id;
end;
$$;

revoke all on function public.phase5_open_direct_conversation(uuid) from public;
grant execute on function public.phase5_open_direct_conversation(uuid) to authenticated;

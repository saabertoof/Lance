-- Lance Phase 1 Row Level Security.
-- These policies protect ownership, matching, messaging, reporting, and moderation records.

create or replace function public.is_self(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = profile_id;
$$;

create or replace function public.owns_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.owner_profile_id = auth.uid()
      and b.deleted_at is null
  );
$$;

create or replace function public.owns_opportunity(target_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.opportunities o
    where o.id = target_opportunity_id
      and o.owner_profile_id = auth.uid()
      and o.deleted_at is null
  );
$$;

create or replace function public.are_profiles_matched(first_profile_id uuid, second_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches m
    where m.status = 'active'
      and (
        (m.profile_one_id = first_profile_id and m.profile_two_id = second_profile_id)
        or (m.profile_one_id = second_profile_id and m.profile_two_id = first_profile_id)
      )
  );
$$;

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.profile_id = auth.uid()
  );
$$;

create or replace function public.is_conversation_blocked(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members mine
    join public.conversation_members theirs
      on theirs.conversation_id = mine.conversation_id
     and theirs.profile_id <> mine.profile_id
    join public.blocks b
      on (
        (b.blocker_profile_id = mine.profile_id and b.blocked_profile_id = theirs.profile_id)
        or (b.blocker_profile_id = theirs.profile_id and b.blocked_profile_id = mine.profile_id)
      )
    where mine.conversation_id = target_conversation_id
      and mine.profile_id = auth.uid()
  );
$$;

create or replace function public.can_create_match(
  target_match_type public.match_type,
  first_profile_id uuid,
  second_profile_id uuid,
  target_opportunity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() in (first_profile_id, second_profile_id)
    and (
      (
        target_match_type = 'person'
        and exists (
          select 1
          from public.swipes s1
          where s1.actor_profile_id = first_profile_id
            and s1.target_profile_id = second_profile_id
            and s1.direction = 'interested'
        )
        and exists (
          select 1
          from public.swipes s2
          where s2.actor_profile_id = second_profile_id
            and s2.target_profile_id = first_profile_id
            and s2.direction = 'interested'
        )
      )
      or
      (
        target_match_type = 'opportunity'
        and target_opportunity_id is not null
        and exists (
          select 1
          from public.opportunity_interests oi
          where oi.opportunity_id = target_opportunity_id
            and oi.status = 'matched'
            and oi.interested_profile_id in (first_profile_id, second_profile_id)
            and oi.owner_profile_id in (first_profile_id, second_profile_id)
        )
      )
    );
$$;

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.user_links enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_skills enable row level security;
alter table public.swipes enable row level security;
alter table public.opportunity_interests enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.saved_profiles enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.terms_acceptances enable row level security;
alter table public.portfolio_items enable row level security;

-- Profiles: signed-in users can discover visible profiles, but can only create or edit their own row.
create policy "Profiles are readable for discovery"
on public.profiles for select
to authenticated
using (deleted_at is null);

create policy "Users create their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Users update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Skills: app users can read the shared skill list; writes should happen through admin tools or migrations.
create policy "Skills are readable"
on public.skills for select
to authenticated
using (true);

-- Profile skills: skills are visible with profiles, but only the owner can attach or remove their own skills.
create policy "Profile skills are readable"
on public.profile_skills for select
to authenticated
using (true);

create policy "Users manage their own profile skills"
on public.profile_skills for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Links: public links are discoverable; matches-only links require a confirmed match; owners see and manage all their links.
create policy "Links are readable by owner public or matched users"
on public.user_links for select
to authenticated
using (
  profile_id = auth.uid()
  or visibility = 'public'
  or (visibility = 'matches_only' and public.are_profiles_matched(profile_id, auth.uid()))
);

create policy "Users manage their own links"
on public.user_links for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Businesses: active business pages are visible; only the owner can create, edit, or remove them.
create policy "Active businesses are readable"
on public.businesses for select
to authenticated
using (deleted_at is null and status = 'active');

create policy "Users create owned businesses"
on public.businesses for insert
to authenticated
with check (owner_profile_id = auth.uid());

create policy "Business owners update businesses"
on public.businesses for update
to authenticated
using (owner_profile_id = auth.uid())
with check (owner_profile_id = auth.uid());

create policy "Business owners delete businesses"
on public.businesses for delete
to authenticated
using (owner_profile_id = auth.uid());

-- Business members: owner-only in the MVP, but kept separate so team permissions can expand later.
create policy "Business members visible to owner and member"
on public.business_members for select
to authenticated
using (profile_id = auth.uid() or public.owns_business(business_id));

create policy "Business owners manage members"
on public.business_members for all
to authenticated
using (public.owns_business(business_id))
with check (public.owns_business(business_id));

-- Opportunities: published opportunities are discoverable; owners can work with their own drafts and postings.
create policy "Published opportunities are readable"
on public.opportunities for select
to authenticated
using (
  deleted_at is null
  and (status = 'published' or owner_profile_id = auth.uid())
);

create policy "Users create owned opportunities"
on public.opportunities for insert
to authenticated
with check (
  owner_profile_id = auth.uid()
  and (business_id is null or public.owns_business(business_id))
);

create policy "Opportunity owners update opportunities"
on public.opportunities for update
to authenticated
using (owner_profile_id = auth.uid())
with check (
  owner_profile_id = auth.uid()
  and (business_id is null or public.owns_business(business_id))
);

create policy "Opportunity owners delete opportunities"
on public.opportunities for delete
to authenticated
using (owner_profile_id = auth.uid());

create policy "Opportunity skills are readable"
on public.opportunity_skills for select
to authenticated
using (true);

create policy "Opportunity owners manage opportunity skills"
on public.opportunity_skills for all
to authenticated
using (public.owns_opportunity(opportunity_id))
with check (public.owns_opportunity(opportunity_id));

-- Swipes: users can submit and review their own swipe decisions; targets can see incoming interest later.
create policy "Users can read relevant swipes"
on public.swipes for select
to authenticated
using (actor_profile_id = auth.uid() or target_profile_id = auth.uid());

create policy "Users create their own swipes"
on public.swipes for insert
to authenticated
with check (actor_profile_id = auth.uid());

create policy "Users update their own swipes"
on public.swipes for update
to authenticated
using (actor_profile_id = auth.uid())
with check (actor_profile_id = auth.uid());

-- Opportunity interest: users can express interest; opportunity owners can accept or pass that interest.
create policy "Opportunity interest visible to participant or owner"
on public.opportunity_interests for select
to authenticated
using (interested_profile_id = auth.uid() or owner_profile_id = auth.uid());

create policy "Users create their own opportunity interest"
on public.opportunity_interests for insert
to authenticated
with check (
  interested_profile_id = auth.uid()
  and exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_id
      and o.status = 'published'
      and o.deleted_at is null
      and o.owner_profile_id = owner_profile_id
      and o.owner_profile_id <> auth.uid()
  )
);

create policy "Opportunity owners and interested users update interest"
on public.opportunity_interests for update
to authenticated
using (interested_profile_id = auth.uid() or owner_profile_id = auth.uid())
with check (interested_profile_id = auth.uid() or owner_profile_id = auth.uid());

-- Matches: users can only see matches they are in; creating a match requires mutual person interest or accepted opportunity interest.
create policy "Match participants can read matches"
on public.matches for select
to authenticated
using (profile_one_id = auth.uid() or profile_two_id = auth.uid());

create policy "Create person or opportunity match only after confirmed interest"
on public.matches for insert
to authenticated
with check (public.can_create_match(match_type, profile_one_id, profile_two_id, opportunity_id));

create policy "Match participants can unmatch"
on public.matches for update
to authenticated
using (profile_one_id = auth.uid() or profile_two_id = auth.uid())
with check (profile_one_id = auth.uid() or profile_two_id = auth.uid());

-- Conversations and members: users can only read conversations in which they are members.
create policy "Conversation members can read conversations"
on public.conversations for select
to authenticated
using (public.is_conversation_member(id));

create policy "Match participants can create conversations"
on public.conversations for insert
to authenticated
with check (
  exists (
    select 1
    from public.matches m
    where m.id = match_id
      and m.status = 'active'
      and auth.uid() in (m.profile_one_id, m.profile_two_id)
  )
);

create policy "Conversation members can update conversations"
on public.conversations for update
to authenticated
using (public.is_conversation_member(id))
with check (public.is_conversation_member(id));

create policy "Conversation members can read members"
on public.conversation_members for select
to authenticated
using (public.is_conversation_member(conversation_id));

create policy "Match participants can add themselves to conversations"
on public.conversation_members for insert
to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1
    from public.conversations c
    join public.matches m on m.id = c.match_id
    where c.id = conversation_id
      and m.status = 'active'
      and auth.uid() in (m.profile_one_id, m.profile_two_id)
  )
);

create policy "Conversation members update their own member row"
on public.conversation_members for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Messages: only conversation members can read/send, and active blocks stop new messages.
create policy "Conversation members can read messages"
on public.messages for select
to authenticated
using (public.is_conversation_member(conversation_id));

create policy "Conversation members can send messages when not blocked"
on public.messages for insert
to authenticated
with check (
  sender_profile_id = auth.uid()
  and public.is_conversation_member(conversation_id)
  and not public.is_conversation_blocked(conversation_id)
);

create policy "Senders can soft edit their messages"
on public.messages for update
to authenticated
using (sender_profile_id = auth.uid())
with check (sender_profile_id = auth.uid());

-- Saved items: users can only see and manage their own saved profiles and opportunities.
create policy "Users manage their saved profiles"
on public.saved_profiles for all
to authenticated
using (saver_profile_id = auth.uid())
with check (saver_profile_id = auth.uid());

create policy "Users manage their saved opportunities"
on public.saved_opportunities for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Blocks: a blocker can see and manage only their own block records.
create policy "Users manage their own blocks"
on public.blocks for all
to authenticated
using (blocker_profile_id = auth.uid())
with check (blocker_profile_id = auth.uid());

-- Reports: users can file reports and later read only their own report submissions.
create policy "Users create their own reports"
on public.reports for insert
to authenticated
with check (reporter_profile_id = auth.uid());

create policy "Users read their own reports"
on public.reports for select
to authenticated
using (reporter_profile_id = auth.uid());

-- Notifications and terms: private account-level records belong only to the signed-in user.
create policy "Users manage their notifications"
on public.notifications for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy "Users manage their own acceptances"
on public.terms_acceptances for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Portfolio: public work can be seen in discovery; matches-only work requires a match; owners manage their own items.
create policy "Portfolio items visible by owner public or matched users"
on public.portfolio_items for select
to authenticated
using (
  profile_id = auth.uid()
  or visibility = 'public'
  or (visibility = 'matches_only' and public.are_profiles_matched(profile_id, auth.uid()))
);

create policy "Users manage their own portfolio"
on public.portfolio_items for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Phase 11: messaging and notifications

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text,
  conversation_type text not null default 'direct' check (
    conversation_type in ('direct', 'group')
  ),
  status text not null default 'active' check (
    status in ('active', 'archived', 'hidden')
  )
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  last_read_at timestamptz,
  is_muted boolean not null default false,
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  unique (conversation_id, user_id)
);

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_members.conversation_id = target_conversation_id
      and conversation_members.user_id = auth.uid()
      and conversation_members.status = 'active'
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  status text not null default 'sent' check (status in ('sent', 'hidden', 'deleted'))
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null default 'message' check (
    type in (
      'message',
      'reply',
      'best_answer',
      'group_post',
      'job_application',
      'event_registration',
      'system'
    )
  ),
  title text not null,
  body text,
  href text,
  is_read boolean not null default false,
  status text not null default 'active' check (status in ('active', 'dismissed'))
);

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

create or replace function public.touch_conversation_for_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = new.created_at
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists touch_conversation_after_message on public.messages;
create trigger touch_conversation_after_message
after insert on public.messages
for each row execute function public.touch_conversation_for_message();

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Conversation members can view conversations" on public.conversations;
create policy "Conversation members can view conversations"
on public.conversations for select
using (public.is_conversation_member(id));

drop policy if exists "Users can create conversations" on public.conversations;
create policy "Users can create conversations"
on public.conversations for insert
with check (auth.uid() = created_by);

drop policy if exists "Conversation members can update conversations" on public.conversations;
create policy "Conversation members can update conversations"
on public.conversations for update
using (public.is_conversation_member(id))
with check (public.is_conversation_member(id));

drop policy if exists "Conversation members can view members" on public.conversation_members;
create policy "Conversation members can view members"
on public.conversation_members for select
using (public.is_conversation_member(conversation_id));

drop policy if exists "Conversation members can add members" on public.conversation_members;
create policy "Conversation members can add members"
on public.conversation_members for insert
with check (
  auth.uid() = user_id
  or public.is_conversation_member(conversation_id)
);

drop policy if exists "Users can update their own conversation membership" on public.conversation_members;
create policy "Users can update their own conversation membership"
on public.conversation_members for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Conversation members can view messages" on public.messages;
create policy "Conversation members can view messages"
on public.messages for select
using (
  status = 'sent'
  and public.is_conversation_member(conversation_id)
);

drop policy if exists "Conversation members can send messages" on public.messages;
create policy "Conversation members can send messages"
on public.messages for insert
with check (
  auth.uid() = sender_id
  and public.is_conversation_member(conversation_id)
);

drop policy if exists "Users can update their own messages" on public.messages;
create policy "Users can update their own messages"
on public.messages for update
using (auth.uid() = sender_id)
with check (auth.uid() = sender_id);

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications"
on public.notifications for select
using (auth.uid() = user_id);

drop policy if exists "Users can create notifications they trigger" on public.notifications;
create policy "Users can create notifications they trigger"
on public.notifications for insert
with check (auth.uid() = actor_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their notifications" on public.notifications;
create policy "Users can delete their notifications"
on public.notifications for delete
using (auth.uid() = user_id);

create index if not exists conversations_updated_at_idx on public.conversations (updated_at desc);
create index if not exists conversations_created_by_idx on public.conversations (created_by);
create index if not exists conversation_members_conversation_id_idx
on public.conversation_members (conversation_id);
create index if not exists conversation_members_user_id_idx
on public.conversation_members (user_id, status);
create index if not exists messages_conversation_created_idx
on public.messages (conversation_id, created_at);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists notifications_user_created_idx
on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
on public.notifications (user_id, is_read, status);

create or replace function public.create_direct_conversation(
  target_user_id uuid,
  first_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_message text := trim(first_message);
  new_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'You must be logged in to start a conversation.';
  end if;

  if target_user_id is null then
    raise exception 'Choose a member to message.';
  end if;

  if clean_message is null or char_length(clean_message) = 0 then
    raise exception 'Write a message before starting a conversation.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = target_user_id
  ) then
    raise exception 'That member profile could not be found.';
  end if;

  insert into public.conversations (created_by, conversation_type, status)
  values (current_user_id, 'direct', 'active')
  returning id into new_conversation_id;

  insert into public.conversation_members (
    conversation_id,
    user_id,
    role,
    last_read_at,
    status
  )
  values (
    new_conversation_id,
    current_user_id,
    'owner',
    now(),
    'active'
  )
  on conflict (conversation_id, user_id)
  do update set status = 'active', last_read_at = now();

  if target_user_id <> current_user_id then
    insert into public.conversation_members (
      conversation_id,
      user_id,
      role,
      status
    )
    values (
      new_conversation_id,
      target_user_id,
      'member',
      'active'
    )
    on conflict (conversation_id, user_id)
    do update set status = 'active';
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    content,
    status
  )
  values (
    new_conversation_id,
    current_user_id,
    clean_message,
    'sent'
  );

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    href
  )
  values (
    target_user_id,
    current_user_id,
    'message',
    'New message',
    left(clean_message, 180),
    '/messages'
  );

  return new_conversation_id;
end;
$$;

grant execute on function public.create_direct_conversation(uuid, text) to authenticated;

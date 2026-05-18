-- Phase 8: events directory

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null check (char_length(trim(description)) between 1 and 6000),
  event_type text not null default 'webinar' check (
    event_type in (
      'webinar',
      'fam_trip',
      'roadshow',
      'conference',
      'training_day',
      'networking',
      'virtual_event',
      'trade_show'
    )
  ),
  delivery_format text not null default 'online' check (
    delivery_format in ('online', 'in_person', 'hybrid')
  ),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Europe/London',
  venue_name text,
  location text,
  registration_url text,
  capacity integer check (capacity is null or capacity > 0),
  image_url text,
  is_featured boolean not null default false,
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  status text not null default 'published' check (
    status in ('draft', 'published', 'cancelled', 'hidden', 'archived')
  )
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  status text not null default 'registered' check (
    status in ('interested', 'registered', 'cancelled', 'attended')
  ),
  unique (event_id, user_id)
);

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.event_registrations enable row level security;

drop policy if exists "Members can view published events" on public.events;
create policy "Members can view published events"
on public.events for select
using (auth.role() = 'authenticated' and status = 'published');

drop policy if exists "Users can create their own events" on public.events;
create policy "Users can create their own events"
on public.events for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update their own events" on public.events;
create policy "Users can update their own events"
on public.events for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own events" on public.events;
create policy "Users can delete their own events"
on public.events for delete
using (auth.uid() = created_by);

drop policy if exists "Users can view relevant event registrations" on public.event_registrations;
create policy "Users can view relevant event registrations"
on public.event_registrations for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.events
    where events.id = event_registrations.event_id
      and events.created_by = auth.uid()
  )
);

drop policy if exists "Users can register for events as themselves" on public.event_registrations;
create policy "Users can register for events as themselves"
on public.event_registrations for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own event registrations" on public.event_registrations;
create policy "Users can update their own event registrations"
on public.event_registrations for update
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.events
    where events.id = event_registrations.event_id
      and events.created_by = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.events
    where events.id = event_registrations.event_id
      and events.created_by = auth.uid()
  )
);

drop policy if exists "Users can remove their own event registrations" on public.event_registrations;
create policy "Users can remove their own event registrations"
on public.event_registrations for delete
using (auth.uid() = user_id);

create index if not exists events_slug_idx on public.events (slug);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_event_type_idx on public.events (event_type);
create index if not exists events_delivery_format_idx on public.events (delivery_format);
create index if not exists events_company_id_idx on public.events (company_id);
create index if not exists event_registrations_event_id_idx on public.event_registrations (event_id);
create index if not exists event_registrations_user_id_idx on public.event_registrations (user_id);

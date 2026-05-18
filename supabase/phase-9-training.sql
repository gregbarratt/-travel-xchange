-- Phase 9: training academy

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text not null check (char_length(trim(description)) between 1 and 5000),
  category text not null default 'new_starter' check (
    category in (
      'destination',
      'cruise',
      'sales_marketing',
      'compliance',
      'technology',
      'supplier_training',
      'new_starter',
      'leadership'
    )
  ),
  level text not null default 'beginner' check (
    level in ('beginner', 'intermediate', 'advanced')
  ),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  image_url text,
  is_supplier_sponsored boolean not null default false,
  certificate_available boolean not null default false,
  monetisation_type text not null default 'free' check (
    monetisation_type in ('free', 'premium_placeholder', 'sponsored')
  ),
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  status text not null default 'published' check (
    status in ('draft', 'published', 'hidden', 'archived')
  )
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  slug text not null,
  summary text,
  content text not null check (char_length(trim(content)) between 1 and 8000),
  video_url text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  display_order integer not null default 1,
  status text not null default 'published' check (
    status in ('draft', 'published', 'hidden')
  ),
  unique (course_id, slug)
);

create table if not exists public.course_enrolments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (
    status in ('active', 'completed', 'cancelled')
  ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, user_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started' check (
    status in ('not_started', 'in_progress', 'completed')
  ),
  completed_at timestamptz,
  unique (lesson_id, user_id)
);

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

drop trigger if exists set_lesson_progress_updated_at on public.lesson_progress;
create trigger set_lesson_progress_updated_at
before update on public.lesson_progress
for each row execute function public.set_updated_at();

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.course_enrolments enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists "Members can view published courses" on public.courses;
create policy "Members can view published courses"
on public.courses for select
using (auth.role() = 'authenticated' and status = 'published');

drop policy if exists "Users can create their own courses" on public.courses;
create policy "Users can create their own courses"
on public.courses for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update their own courses" on public.courses;
create policy "Users can update their own courses"
on public.courses for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own courses" on public.courses;
create policy "Users can delete their own courses"
on public.courses for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view published lessons" on public.lessons;
create policy "Members can view published lessons"
on public.lessons for select
using (
  auth.role() = 'authenticated'
  and status = 'published'
  and exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.status = 'published'
  )
);

drop policy if exists "Course owners can create lessons" on public.lessons;
create policy "Course owners can create lessons"
on public.lessons for insert
with check (
  exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.created_by = auth.uid()
  )
);

drop policy if exists "Course owners can update lessons" on public.lessons;
create policy "Course owners can update lessons"
on public.lessons for update
using (
  exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.created_by = auth.uid()
  )
);

drop policy if exists "Course owners can delete lessons" on public.lessons;
create policy "Course owners can delete lessons"
on public.lessons for delete
using (
  exists (
    select 1
    from public.courses
    where courses.id = lessons.course_id
      and courses.created_by = auth.uid()
  )
);

drop policy if exists "Users can view relevant course enrolments" on public.course_enrolments;
create policy "Users can view relevant course enrolments"
on public.course_enrolments for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.courses
    where courses.id = course_enrolments.course_id
      and courses.created_by = auth.uid()
  )
);

drop policy if exists "Users can enrol as themselves" on public.course_enrolments;
create policy "Users can enrol as themselves"
on public.course_enrolments for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.courses
    where courses.id = course_enrolments.course_id
      and courses.status = 'published'
  )
);

drop policy if exists "Users can update their own enrolments" on public.course_enrolments;
create policy "Users can update their own enrolments"
on public.course_enrolments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own enrolments" on public.course_enrolments;
create policy "Users can delete their own enrolments"
on public.course_enrolments for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view their own lesson progress" on public.lesson_progress;
create policy "Users can view their own lesson progress"
on public.lesson_progress for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own lesson progress" on public.lesson_progress;
create policy "Users can create their own lesson progress"
on public.lesson_progress for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own lesson progress" on public.lesson_progress;
create policy "Users can update their own lesson progress"
on public.lesson_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own lesson progress" on public.lesson_progress;
create policy "Users can delete their own lesson progress"
on public.lesson_progress for delete
using (auth.uid() = user_id);

create index if not exists courses_slug_idx on public.courses (slug);
create index if not exists courses_category_idx on public.courses (category);
create index if not exists courses_company_id_idx on public.courses (company_id);
create index if not exists lessons_course_id_idx on public.lessons (course_id, display_order);
create index if not exists course_enrolments_course_id_idx on public.course_enrolments (course_id);
create index if not exists course_enrolments_user_id_idx on public.course_enrolments (user_id);
create index if not exists lesson_progress_course_id_idx on public.lesson_progress (course_id);
create index if not exists lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);
create index if not exists lesson_progress_user_id_idx on public.lesson_progress (user_id);

insert into public.courses (
  id,
  title,
  slug,
  description,
  category,
  level,
  duration_minutes,
  is_supplier_sponsored,
  certificate_available,
  monetisation_type,
  visibility,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000901',
    'New Starter Travel Agent Essentials',
    'new-starter-travel-agent-essentials',
    'A practical foundation course for new entrants covering customer discovery, supplier basics, quoting, and confident next steps.',
    'new_starter',
    'beginner',
    75,
    false,
    true,
    'free',
    'members',
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000902',
    'Cruise Selling Essentials',
    'cruise-selling-essentials',
    'Build confidence with cruise terminology, customer matching, onboard value, and first-time cruise objections.',
    'cruise',
    'beginner',
    90,
    true,
    true,
    'sponsored',
    'members',
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000903',
    'ATOL and Package Travel Basics',
    'atol-and-package-travel-basics',
    'A starter compliance module covering package travel responsibilities, customer information, complaints, and where to get help.',
    'compliance',
    'intermediate',
    60,
    false,
    true,
    'free',
    'members',
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000904',
    'Travel Technology Toolkit',
    'travel-technology-toolkit',
    'Understand the core technology stack used by modern travel professionals, including CRM, booking tools, payments, and marketing systems.',
    'technology',
    'beginner',
    50,
    false,
    false,
    'premium_placeholder',
    'members',
    'published'
  )
on conflict (slug) do nothing;

insert into public.lessons (
  id,
  course_id,
  title,
  slug,
  summary,
  content,
  duration_minutes,
  display_order,
  status
)
values
  (
    '00000000-0000-4000-8000-000000000911',
    '00000000-0000-4000-8000-000000000901',
    'Understanding the Travel Trade',
    'understanding-the-travel-trade',
    'A quick map of agents, suppliers, operators, and industry partners.',
    'The travel trade connects customers with the right suppliers, products, destinations, and service. In this starter lesson, focus on the basic roles: agents advise and sell, suppliers create or provide the product, tour operators package services, and technology providers help the work happen efficiently. Travel Xchange will become a shared hub for these professional groups.',
    20,
    1,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000912',
    '00000000-0000-4000-8000-000000000901',
    'Asking Better Client Questions',
    'asking-better-client-questions',
    'Use discovery questions to build stronger quotes.',
    'Good travel selling starts with discovery. Ask about budget, dates, flexibility, previous trips, travel style, non-negotiables, and what would make the holiday feel successful. Strong questions reduce wasted quoting time and help you recommend with confidence.',
    25,
    2,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000913',
    '00000000-0000-4000-8000-000000000902',
    'Cruise Product Basics',
    'cruise-product-basics',
    'Learn the language of ship, itinerary, cabin, and onboard value.',
    'Cruise selling becomes easier when you can explain the basics clearly: ship size, itinerary style, cabin type, dining, inclusions, excursions, gratuities, and onboard experience. Match the ship and itinerary to the customer rather than selling cruise as one generic product.',
    30,
    1,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000914',
    '00000000-0000-4000-8000-000000000902',
    'Handling First-Time Cruise Objections',
    'handling-first-time-cruise-objections',
    'Respond to common worries from customers new to cruise.',
    'First-time cruise customers often worry about feeling trapped, dress codes, seasickness, cost, or whether they will enjoy the onboard atmosphere. Listen first, then match the concern to the right cruise style, ship, itinerary, and cabin choice.',
    30,
    2,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000915',
    '00000000-0000-4000-8000-000000000903',
    'Package Travel Responsibilities',
    'package-travel-responsibilities',
    'A simple overview of why compliance matters in package travel.',
    'Compliance protects customers, agencies, and suppliers. This lesson introduces the idea that package travel brings responsibilities around information, financial protection, supplier clarity, and support when things change.',
    25,
    1,
    'published'
  ),
  (
    '00000000-0000-4000-8000-000000000916',
    '00000000-0000-4000-8000-000000000904',
    'Choosing Your Core Tech Stack',
    'choosing-your-core-tech-stack',
    'Understand the main tools a travel professional uses day to day.',
    'A practical travel technology stack usually includes customer records, enquiry tracking, quoting, supplier booking tools, payment handling, marketing, and reporting. Start simple, keep customer notes organised, and avoid duplicating work across too many systems.',
    25,
    1,
    'published'
  )
on conflict (course_id, slug) do nothing;

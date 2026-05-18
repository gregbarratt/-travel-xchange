-- Phase 10: support and Q&A hub

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null unique,
  content text not null check (char_length(trim(content)) between 1 and 6000),
  category text not null default 'new_starter_help' check (
    category in (
      'booking_systems',
      'suppliers',
      'payments',
      'atol_compliance',
      'marketing',
      'cruise',
      'long_haul',
      'complaints_handling',
      'new_starter_help'
    )
  ),
  best_answer_id uuid,
  visibility text not null default 'members' check (visibility in ('public', 'members')),
  status text not null default 'published' check (
    status in ('draft', 'published', 'resolved', 'hidden', 'deleted')
  )
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  question_id uuid not null references public.questions(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 6000),
  is_best_answer boolean not null default false,
  status text not null default 'published' check (
    status in ('published', 'hidden', 'deleted')
  )
);

create table if not exists public.question_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null default 'helpful' check (vote_type in ('upvote', 'helpful'))
);

drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

drop trigger if exists set_answers_updated_at on public.answers;
create trigger set_answers_updated_at
before update on public.answers
for each row execute function public.set_updated_at();

alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.question_votes enable row level security;

drop policy if exists "Members can view visible questions" on public.questions;
create policy "Members can view visible questions"
on public.questions for select
using (
  auth.role() = 'authenticated'
  and status in ('published', 'resolved')
);

drop policy if exists "Users can create their own questions" on public.questions;
create policy "Users can create their own questions"
on public.questions for insert
with check (auth.uid() = created_by);

drop policy if exists "Users can update their own questions" on public.questions;
create policy "Users can update their own questions"
on public.questions for update
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "Users can delete their own questions" on public.questions;
create policy "Users can delete their own questions"
on public.questions for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view published answers" on public.answers;
create policy "Members can view published answers"
on public.answers for select
using (
  auth.role() = 'authenticated'
  and status = 'published'
  and exists (
    select 1
    from public.questions
    where questions.id = answers.question_id
      and questions.status in ('published', 'resolved')
  )
);

drop policy if exists "Users can answer visible questions" on public.answers;
create policy "Users can answer visible questions"
on public.answers for insert
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from public.questions
    where questions.id = answers.question_id
      and questions.status in ('published', 'resolved')
  )
);

drop policy if exists "Answer owners and question owners can update answers" on public.answers;
drop policy if exists "Question owners can choose best answers" on public.answers;
create policy "Question owners can choose best answers"
on public.answers for update
using (
  exists (
    select 1
    from public.questions
    where questions.id = answers.question_id
      and questions.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.questions
    where questions.id = answers.question_id
      and questions.created_by = auth.uid()
  )
);

drop policy if exists "Users can delete their own answers" on public.answers;
create policy "Users can delete their own answers"
on public.answers for delete
using (auth.uid() = created_by);

drop policy if exists "Members can view votes on visible questions" on public.question_votes;
create policy "Members can view votes on visible questions"
on public.question_votes for select
using (
  auth.role() = 'authenticated'
  and exists (
    select 1
    from public.questions
    where questions.id = question_votes.question_id
      and questions.status in ('published', 'resolved')
  )
);

drop policy if exists "Users can vote as themselves" on public.question_votes;
create policy "Users can vote as themselves"
on public.question_votes for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.questions
    where questions.id = question_votes.question_id
      and questions.status in ('published', 'resolved')
  )
);

drop policy if exists "Users can remove their own votes" on public.question_votes;
create policy "Users can remove their own votes"
on public.question_votes for delete
using (auth.uid() = user_id);

create index if not exists questions_slug_idx on public.questions (slug);
create index if not exists questions_created_at_idx on public.questions (created_at desc);
create index if not exists questions_category_idx on public.questions (category);
create index if not exists questions_created_by_idx on public.questions (created_by);
create index if not exists answers_question_id_idx on public.answers (question_id, created_at);
create index if not exists answers_created_by_idx on public.answers (created_by);
create index if not exists question_votes_question_id_idx on public.question_votes (question_id);
create index if not exists question_votes_answer_id_idx on public.question_votes (answer_id);
create index if not exists question_votes_user_id_idx on public.question_votes (user_id);

create unique index if not exists question_votes_question_user_upvote_idx
on public.question_votes (question_id, user_id)
where answer_id is null and vote_type = 'upvote';

create unique index if not exists question_votes_answer_user_helpful_idx
on public.question_votes (answer_id, user_id)
where answer_id is not null and vote_type = 'helpful';

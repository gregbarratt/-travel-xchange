-- Phase 27: Seed external travel job listings
-- Run this in Supabase after Phase 6 jobs has been installed.
-- It adds five external-application job listings and does not overwrite
-- existing jobs. Each insert is skipped when the slug already exists.

alter table public.jobs
add column if not exists recruiter_name text;

alter table public.jobs
add column if not exists salary_label text;

alter table public.jobs
add column if not exists job_type_label text;

alter table public.jobs
add column if not exists work_style text;

alter table public.jobs
add column if not exists ideal_candidate text;

alter table public.jobs
add column if not exists key_skills text[] not null default '{}';

alter table public.jobs
add column if not exists source_note text;

alter table public.jobs
add column if not exists source_url text not null default '';

alter table public.jobs
add column if not exists posted_date date;

alter table public.jobs
add column if not exists expiry_date date;

alter table public.jobs
add column if not exists application_type text not null default 'internal_interest';

alter table public.jobs
drop constraint if exists jobs_status_check;

alter table public.jobs
add constraint jobs_status_check
check (status in ('draft', 'published', 'active', 'closed', 'hidden', 'deleted'));

alter table public.jobs
drop constraint if exists jobs_application_type_check;

alter table public.jobs
add constraint jobs_application_type_check
check (application_type in ('internal_interest', 'external'));

drop policy if exists "Members can view published jobs" on public.jobs;
create policy "Members can view published jobs"
on public.jobs for select
using (
  auth.role() = 'authenticated'
  and status in ('published', 'active')
  and (expiry_date is null or expiry_date >= current_date)
);

create index if not exists jobs_status_expiry_date_idx
on public.jobs (status, expiry_date);

do $$
declare
  seed_actor uuid;
begin
  select id
  into seed_actor
  from public.profiles
  where role in ('super_admin', 'admin', 'moderator')
  order by created_at
  limit 1;

  if seed_actor is null then
    select id
    into seed_actor
    from public.profiles
    order by created_at
    limit 1;
  end if;

  if seed_actor is null then
    raise notice 'No profiles exist yet, so external jobs were not seeded.';
    return;
  end if;

  insert into public.jobs (
    created_at,
    updated_at,
    created_by,
    recruiter_name,
    title,
    slug,
    category,
    employment_type,
    location,
    is_remote,
    salary_min,
    salary_max,
    salary_currency,
    salary_label,
    job_type_label,
    work_style,
    description,
    requirements,
    ideal_candidate,
    key_skills,
    source_note,
    source_url,
    posted_date,
    expiry_date,
    application_type,
    application_url,
    contact_email,
    package_type,
    is_featured,
    visibility,
    status
  )
  values
    (
      '2026-05-22'::timestamptz,
      now(),
      seed_actor,
      'RecruitmentRevolution.com',
      'Remote Travel Business Development Coach',
      'remote-travel-business-development-coach',
      'business_development',
      'full_time',
      'Remote / London, occasional Bournemouth HQ visits',
      true,
      35000,
      null,
      'GBP',
      'GBP 35,000',
      'Permanent, full-time',
      'Remote',
      'A remote opportunity for an experienced travel industry professional to support and coach a network of independent travel consultants. The role focuses on mentoring business owners, improving sales performance, supporting lead generation, and helping consultants grow sustainable travel businesses.',
      'Key skills: Travel sales, Coaching, Business development, Franchise support, Remote team support, CRM, Social media marketing, Performance management.',
      'This role would suit someone with strong travel industry experience, a background in sales, coaching or business development, and confidence supporting remote travel consultants.',
      array['Travel sales', 'Coaching', 'Business development', 'Franchise support', 'Remote team support', 'CRM', 'Social media marketing', 'Performance management'],
      'Apply via original recruiter/job board.',
      '',
      '2026-05-22',
      '2026-06-21',
      'external',
      null,
      null,
      'basic',
      false,
      'members',
      'active'
    ),
    (
      '2026-05-23'::timestamptz,
      now(),
      seed_actor,
      'Euro London',
      'German Speaking Travel Consultant',
      'german-speaking-travel-consultant',
      'travel_sales',
      'full_time',
      'London / Work from home',
      true,
      30000,
      36000,
      'GBP',
      'GBP 30,000 to GBP 36,000',
      'Permanent, full-time',
      'Hybrid / Work from home',
      'A German-speaking travel consultant role supporting premium customers with luxury travel enquiries. The position involves advising clients in German and English, preparing bespoke quotes, booking travel services, producing itineraries, and selling exclusive travel offers.',
      'Key skills: German language, Luxury travel, Customer service, Itinerary planning, Amadeus, Travel reservations, Premium client support.',
      'Best suited to a travel professional with fluent German and English, previous travel industry experience, strong destination knowledge, and ideally GDS experience, especially Amadeus.',
      array['German language', 'Luxury travel', 'Customer service', 'Itinerary planning', 'Amadeus', 'Travel reservations', 'Premium client support'],
      'Apply via original recruiter/job board.',
      '',
      '2026-05-23',
      '2026-06-22',
      'external',
      null,
      null,
      'basic',
      false,
      'members',
      'active'
    ),
    (
      '2026-05-11'::timestamptz,
      now(),
      seed_actor,
      'C&M Travel Recruitment',
      'Marine Business Travel Consultant',
      'marine-business-travel-consultant',
      'operations',
      'full_time',
      'London / Home based',
      true,
      30000,
      32000,
      'GBP',
      'GBP 30,000 to GBP 32,000',
      'Permanent, full-time',
      'Home based',
      'A home-based business travel role supporting marine, offshore, oil and gas, or crew travel accounts. The position includes arranging worldwide travel, managing crew movements, booking flights, hotels and ground arrangements, and handling disruption support.',
      'Key skills: Business travel, Marine travel, Offshore travel, GDS, Amadeus, Crew movements, Disruption handling, Flight bookings, Accommodation bookings.',
      'Suitable for a business travel consultant with marine, offshore, crew travel, logistics or GDS experience. Amadeus is preferred, although cross-training may be considered for candidates with Galileo or Sabre experience.',
      array['Business travel', 'Marine travel', 'Offshore travel', 'GDS', 'Amadeus', 'Crew movements', 'Disruption handling', 'Flight bookings', 'Accommodation bookings'],
      'Apply via original recruiter/job board.',
      '',
      '2026-05-11',
      '2026-06-10',
      'external',
      null,
      null,
      'basic',
      false,
      'members',
      'active'
    ),
    (
      '2026-05-07'::timestamptz,
      now(),
      seed_actor,
      'C&M Travel Recruitment',
      'Europe / Nordics Travel Consultant',
      'europe-nordics-travel-consultant',
      'tour_operator',
      'full_time',
      'Twickenham / Remote or hybrid',
      true,
      30000,
      null,
      'GBP',
      'Circa GBP 30,000',
      'Permanent, full-time',
      'Remote / Hybrid',
      'A specialist travel consultant role with an established independent tour operator, focused on creating and costing bespoke trips to Europe and the Nordics. Responsibilities include advising clients and agents, liaising with overseas suppliers, preparing travel packs, invoicing, ticketing, and supporting brochure or website updates.',
      'Key skills: Europe travel, Nordics, Tailor-made travel, Reservations, Travel sales, Supplier liaison, Invoicing, Ticketing, Amadeus.',
      'A good fit for someone with previous travel sales or reservations experience, strong knowledge of European or Nordic destinations, and ideally some GDS experience.',
      array['Europe travel', 'Nordics', 'Tailor-made travel', 'Reservations', 'Travel sales', 'Supplier liaison', 'Invoicing', 'Ticketing', 'Amadeus'],
      'Apply via original recruiter/job board.',
      '',
      '2026-05-07',
      '2026-06-06',
      'external',
      null,
      null,
      'basic',
      false,
      'members',
      'active'
    ),
    (
      '2026-05-05'::timestamptz,
      now(),
      seed_actor,
      'Travel Trade Recruitment',
      'Adventure Travel Expert',
      'adventure-travel-expert',
      'travel_sales',
      'full_time',
      'South West London / Work from home',
      true,
      26000,
      30000,
      'GBP',
      'GBP 26,000 to GBP 30,000 plus commission',
      'Permanent, full-time',
      'Work from home',
      'A travel sales role focused on adventure and experience-led holidays. The role involves handling customer enquiries across phone, email and chat, converting leads, building repeat customer relationships, cross-selling accommodation and transfers, and working with travel booking systems.',
      'Key skills: Adventure travel, Travel sales, Customer service, Lead conversion, Phone sales, Email sales, Chat support, ATOL awareness, Package Travel Regulations.',
      'Best suited to someone with at least two years of sales experience, ideally within adventure, activity, long-haul or wider travel sectors. Knowledge of GDS, flight sales, Package Travel Regulations and ATOL would be beneficial.',
      array['Adventure travel', 'Travel sales', 'Customer service', 'Lead conversion', 'Phone sales', 'Email sales', 'Chat support', 'ATOL awareness', 'Package Travel Regulations'],
      'Apply via original recruiter/job board.',
      '',
      '2026-05-05',
      '2026-06-04',
      'external',
      null,
      null,
      'basic',
      false,
      'members',
      'active'
    )
  on conflict (slug) do nothing;
end $$;

create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'instructor', 'administrator', 'super_admin');
create type public.course_status as enum ('draft', 'review', 'published', 'archived');
create type public.enrollment_status as enum ('pending_payment', 'active', 'completed', 'cancelled');

create table public.admin_allowlist (
  email text primary key check (email = lower(email)),
  role public.app_role not null default 'super_admin' check (role in ('administrator', 'super_admin')),
  created_at timestamptz not null default now()
);

insert into public.admin_allowlist (email, role)
values ('akin.sokpah.link@gmail.com', 'super_admin')
on conflict (email) do update set role = excluded.role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  legal_name text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_auth_user_created()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  granted_role public.app_role := 'student';
begin
  select role into granted_role
  from public.admin_allowlist
  where email = lower(coalesce(new.email, ''));

  insert into public.profiles (id, email, display_name, legal_name, role)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(granted_role, 'student')
  );
  return new;
end;
$$;

create trigger auth_user_created_profile
after insert on auth.users for each row execute function public.handle_auth_user_created();

create or replace function public.has_role(required_roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(required_roles)
  );
$$;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 255),
  description text not null check (char_length(description) between 30 and 10000),
  category text not null,
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  learning_objectives jsonb not null default '[]'::jsonb,
  requirements jsonb not null default '[]'::jsonb,
  certificate_eligible boolean not null default true,
  status public.course_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null check (position >= 0),
  unique (course_id, position)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  kind text not null check (kind in ('video', 'article', 'flashcards', 'quiz', 'test', 'final_exam')),
  title text not null,
  description text,
  position integer not null check (position >= 0),
  rich_text text,
  video_path text,
  video_duration_seconds integer check (video_duration_seconds is null or video_duration_seconds >= 0),
  assessment jsonb,
  is_required boolean not null default true,
  unique (module_id, position)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  status public.enrollment_status not null default 'pending_payment',
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

create table public.lesson_completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  score numeric(5,2) not null check (score between 0 and 100),
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  verification_code text not null unique,
  final_score numeric(5,2) not null check (final_score between 0 and 100),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  certificate_path text,
  unique (user_id, course_id)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index courses_status_idx on public.courses(status);
create index enrollments_user_id_idx on public.enrollments(user_id);
create index enrollments_course_id_idx on public.enrollments(course_id);
create index certificates_verification_code_idx on public.certificates(verification_code);
create index audit_events_created_at_idx on public.audit_events(created_at desc);

alter table public.admin_allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_read_own_or_staff on public.profiles for select to authenticated
using (id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]));
create policy profiles_update_own on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_manage_staff on public.profiles for all to authenticated
using (public.has_role(array['administrator', 'super_admin']::public.app_role[]))
with check (public.has_role(array['administrator', 'super_admin']::public.app_role[]));
create policy allowlist_manage_super_admin on public.admin_allowlist for all to authenticated
using (public.has_role(array['super_admin']::public.app_role[]))
with check (public.has_role(array['super_admin']::public.app_role[]));

create policy courses_public_read on public.courses for select to anon, authenticated
using (status = 'published' or public.has_role(array['administrator', 'super_admin']::public.app_role[]) or author_id = auth.uid());
create policy courses_manage_staff on public.courses for all to authenticated
using (public.has_role(array['instructor', 'administrator', 'super_admin']::public.app_role[]) and (author_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[])))
with check (public.has_role(array['instructor', 'administrator', 'super_admin']::public.app_role[]) and (author_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[])));

create policy modules_read_allowed on public.course_modules for select to anon, authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.status = 'published' or c.author_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]))));
create policy modules_manage_staff on public.course_modules for all to authenticated
using (exists (select 1 from public.courses c where c.id = course_id and (c.author_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]))))
with check (exists (select 1 from public.courses c where c.id = course_id and (c.author_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]))));

create policy lessons_read_enrolled_or_staff on public.lessons for select to authenticated
using (exists (select 1 from public.course_modules m join public.courses c on c.id = m.course_id left join public.enrollments e on e.course_id = c.id and e.user_id = auth.uid() where m.id = module_id and (c.author_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]) or e.status in ('active', 'completed'))));
create policy lessons_manage_staff on public.lessons for all to authenticated
using (exists (select 1 from public.course_modules m join public.courses c on c.id = m.course_id where m.id = module_id and (c.author_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]))))
with check (exists (select 1 from public.course_modules m join public.courses c on c.id = m.course_id where m.id = module_id and (c.author_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]))));

create policy enrollment_read_own_or_staff on public.enrollments for select to authenticated
using (user_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]));
create policy enrollment_manage_staff on public.enrollments for all to authenticated
using (public.has_role(array['administrator', 'super_admin']::public.app_role[]))
with check (public.has_role(array['administrator', 'super_admin']::public.app_role[]));
create policy completion_read_own_or_staff on public.lesson_completions for select to authenticated
using (user_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]));
create policy completion_write_own on public.lesson_completions for insert to authenticated
with check (user_id = auth.uid());
create policy attempts_read_own_or_staff on public.assessment_attempts for select to authenticated
using (user_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]));
create policy attempts_write_own on public.assessment_attempts for insert to authenticated
with check (user_id = auth.uid());
create policy certificates_read_own_or_staff on public.certificates for select to authenticated
using (user_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]));
create policy certificates_manage_staff on public.certificates for all to authenticated
using (public.has_role(array['administrator', 'super_admin']::public.app_role[]))
with check (public.has_role(array['administrator', 'super_admin']::public.app_role[]));
create policy audit_read_super_admin on public.audit_events for select to authenticated
using (public.has_role(array['super_admin']::public.app_role[]));
create policy audit_insert_authenticated on public.audit_events for insert to authenticated
with check (actor_id = auth.uid() or public.has_role(array['administrator', 'super_admin']::public.app_role[]));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-media', 'course-media', false, 524288000, array['video/mp4', 'video/webm', 'application/pdf', 'image/jpeg', 'image/png']),
  ('credential-documents', 'credential-documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy course_media_read_allowed on storage.objects for select to authenticated
using (bucket_id = 'course-media' and (public.has_role(array['instructor', 'administrator', 'super_admin']::public.app_role[]) or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.status in ('active', 'completed') and e.course_id::text = split_part(name, '/', 1))));
create policy course_media_upload_staff on storage.objects for insert to authenticated
with check (bucket_id = 'course-media' and public.has_role(array['instructor', 'administrator', 'super_admin']::public.app_role[]));
create policy course_media_update_staff on storage.objects for update to authenticated
using (bucket_id = 'course-media' and public.has_role(array['instructor', 'administrator', 'super_admin']::public.app_role[]));
create policy course_media_delete_staff on storage.objects for delete to authenticated
using (bucket_id = 'course-media' and public.has_role(array['administrator', 'super_admin']::public.app_role[]));
create policy credential_download_own_or_staff on storage.objects for select to authenticated
using (bucket_id = 'credential-documents' and (name like auth.uid()::text || '/%' or public.has_role(array['administrator', 'super_admin']::public.app_role[])));

create or replace function public.verify_certificate(code text)
returns table (valid boolean, verification_code text, learner_name text, course_title text, issued_at timestamptz, final_score numeric)
language sql stable security definer set search_path = public as $$
  select
    c.revoked_at is null as valid,
    c.verification_code,
    coalesce(p.legal_name, p.display_name) as learner_name,
    co.title as course_title,
    c.issued_at,
    c.final_score
  from public.certificates c
  join public.profiles p on p.id = c.user_id
  join public.courses co on co.id = c.course_id
  where c.verification_code = code;
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;

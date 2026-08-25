create index if not exists assessment_attempts_user_lesson_time_idx on public.assessment_attempts(user_id, lesson_id, submitted_at desc);

alter table public.assessment_attempts
  add column if not exists integrity_metadata jsonb not null default '{}'::jsonb;

alter table public.lessons
  add column if not exists media_path text,
  add column if not exists content_json jsonb not null default '{}'::jsonb;

create index if not exists lessons_module_position_idx on public.lessons(module_id, position);

insert into public.audit_events (actor_id, action, subject_type, subject_id, metadata)
select null, 'schema.rich_content_enabled', 'system', null, jsonb_build_object('migration', '0007_rich_course_content')
where not exists (
  select 1 from public.audit_events where action = 'schema.rich_content_enabled' and subject_type = 'system' limit 1
);

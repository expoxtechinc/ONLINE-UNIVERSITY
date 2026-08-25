create or replace function public.audit_course_content_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_events(actor_id, action, subject_type, subject_id, metadata)
  values (auth.uid(), 'content.deleted', TG_TABLE_NAME, OLD.id::text, jsonb_build_object('course_id', coalesce(OLD.course_id::text, OLD.id::text)));
  return OLD;
end;
$$;

drop trigger if exists audit_course_delete on public.courses;
create trigger audit_course_delete after delete on public.courses for each row execute function public.audit_course_content_delete();

drop trigger if exists audit_module_delete on public.course_modules;
create trigger audit_module_delete after delete on public.course_modules for each row execute function public.audit_course_content_delete();

drop trigger if exists audit_lesson_delete on public.lessons;
create trigger audit_lesson_delete after delete on public.lessons for each row execute function public.audit_course_content_delete();

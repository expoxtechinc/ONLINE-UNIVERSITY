create schema if not exists private;
revoke all on schema private from public;

alter function public.handle_auth_user_created() set schema private;
alter function public.has_role(public.app_role[]) set schema private;

grant usage on schema private to authenticated;
grant execute on function private.has_role(public.app_role[]) to authenticated;
revoke all on function private.handle_auth_user_created() from public, anon, authenticated;

drop function public.verify_certificate(text);

create view public.certificate_verifications as
select
  c.revoked_at is null as valid,
  c.verification_code,
  coalesce(p.legal_name, p.display_name) as learner_name,
  co.title as course_title,
  c.issued_at,
  c.final_score
from public.certificates c
join public.profiles p on p.id = c.user_id
join public.courses co on co.id = c.course_id;

grant select on public.certificate_verifications to anon, authenticated;

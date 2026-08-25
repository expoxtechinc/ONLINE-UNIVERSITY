drop policy if exists profiles_manage_staff on public.profiles;

create policy profiles_manage_super_admin on public.profiles for all to authenticated
using (private.has_role(array['super_admin']::public.app_role[]))
with check (private.has_role(array['super_admin']::public.app_role[]));

revoke update on public.profiles from authenticated;
grant update (display_name, legal_name, country_code, updated_at) on public.profiles to authenticated;

insert into public.admin_allowlist (email, role)
values ('nassboss231@gmail.com', 'super_admin')
on conflict (email) do update set role = excluded.role;

update public.profiles
set role = 'super_admin'
where lower(email) = 'nassboss231@gmail.com';

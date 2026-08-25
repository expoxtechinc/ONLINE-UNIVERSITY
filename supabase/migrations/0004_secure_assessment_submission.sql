drop policy if exists attempts_write_own on public.assessment_attempts;

create policy lesson_completion_update_own on public.lesson_completions for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

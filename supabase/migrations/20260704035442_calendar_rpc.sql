-- CAL-1 RPC tasks_in_range
create or replace function public.tasks_in_range(p_start date, p_end date, p_project uuid default null)
returns setof public.tasks_view
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.tasks_view t
  where t.user_id = auth.uid()
    and t.due_at is not null
    and jakarta_date(t.due_at) between p_start and p_end
    and (p_project is null or t.project_id = p_project)
  order by t.due_at;
$$;

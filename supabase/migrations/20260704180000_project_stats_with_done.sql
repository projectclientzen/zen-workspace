-- Update get_project_stats() to include done + total counts for completion %
create or replace function public.get_project_stats()
returns table (
  project_id uuid,
  project_name text,
  open bigint,
  due_today bigint,
  overdue bigint,
  done bigint,
  total bigint
)
language sql
security invoker
stable
as $$
  select
    p.id as project_id,
    p.name as project_name,
    count(*) filter (where t.status in ('todo','doing'))                                                          as open,
    count(*) filter (where t.status in ('todo','doing') and t.due_at >= (now() at time zone 'Asia/Jakarta')::date
                       and t.due_at < (now() at time zone 'Asia/Jakarta')::date + 1)                              as due_today,
    count(*) filter (where t.status in ('todo','doing') and t.due_at < (now() at time zone 'Asia/Jakarta')::date) as overdue,
    count(*) filter (where t.status = 'done')                                                                     as done,
    count(*) filter (where t.status != 'dropped')                                                                 as total
  from public.projects p
  left join public.tasks t on t.project_id = p.id and t.user_id = auth.uid()
  where p.user_id = auth.uid() and p.is_active = true
  group by p.id, p.name, p.sort_order
  order by p.sort_order, p.name;
$$;

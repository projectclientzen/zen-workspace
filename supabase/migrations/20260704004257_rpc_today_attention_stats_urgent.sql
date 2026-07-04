-- RPC-1 get_today
create or replace function public.get_today(p_project uuid default null)
returns setof public.tasks_view
language sql
stable
security invoker
as $$
  select *
  from public.tasks_view t
  where t.user_id = auth.uid()
    and t.status in ('todo','doing')
    and (p_project is null or t.project_id = p_project)
    and (
      t.is_overdue
      or t.is_focus_today
      or (t.due_at is not null and public.jakarta_date(t.due_at) = public.jakarta_date(now()))
    )
  order by case t.priority when 'high' then 0 when 'medium' then 1 else 2 end, t.due_at nulls last;
$$;

-- RPC-2 get_attention
create or replace function public.get_attention()
returns table (overdue integer, due_today integer, recurring_today integer, checkins_due integer)
language sql
stable
security invoker
as $$
  select
    (select count(*) from public.tasks_view where user_id = auth.uid() and is_overdue)::int as overdue,
    (select count(*) from public.tasks_view where user_id = auth.uid() and status in ('todo','doing')
       and due_at is not null and public.jakarta_date(due_at) = public.jakarta_date(now()))::int as due_today,
    (select count(*) from public.tasks_view where user_id = auth.uid() and source = 'recurring'
       and due_at is not null and public.jakarta_date(due_at) = public.jakarta_date(now()))::int as recurring_today,
    (select count(*) from public.metrics m
       where m.user_id = auth.uid() and m.is_active
         and not exists (
           select 1 from public.metric_checkins c
           where c.metric_id = m.id and c.checkin_date = public.jakarta_date(now())
         )
         and (
           m.schedule_type = 'daily'
           or extract(dow from (now() at time zone 'Asia/Jakarta'))::int = any(coalesce(m.weekdays, '{}'))
         )
    )::int as checkins_due;
$$;

-- RPC-3 get_project_stats
create or replace function public.get_project_stats()
returns table (project_id uuid, project_name text, open integer, due_today integer, overdue integer)
language sql
stable
security invoker
as $$
  select
    p.id as project_id,
    p.name as project_name,
    count(*) filter (where t.status in ('todo','doing'))::int as open,
    count(*) filter (where t.status in ('todo','doing') and t.due_at is not null
      and public.jakarta_date(t.due_at) = public.jakarta_date(now()))::int as due_today,
    count(*) filter (where t.is_overdue)::int as overdue
  from public.projects p
  left join public.tasks_view t on t.project_id = p.id and t.user_id = auth.uid()
  where p.user_id = auth.uid()
  group by p.id, p.name
  order by p.sort_order;
$$;

-- RPC-4 get_urgent (panel Urgent baru — overdue + high-priority-hari-ini, sebagai daftar)
create or replace function public.get_urgent()
returns table (kind text, task public.tasks_view)
language sql
stable
security invoker
as $$
  select 'overdue' as kind, t
  from public.tasks_view t
  where t.user_id = auth.uid() and t.is_overdue
  union all
  select 'high_today' as kind, t
  from public.tasks_view t
  where t.user_id = auth.uid()
    and not t.is_overdue
    and t.status in ('todo','doing')
    and t.priority = 'high'
    and t.due_at is not null
    and public.jakarta_date(t.due_at) = public.jakarta_date(now());
$$;

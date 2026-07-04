-- WR-1 Tabel weekly_reviews
create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  period_start date not null,
  period_end date not null,
  done_summary text,
  missed_summary text,
  carry_over text,
  next_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id, period_start, period_end)
);

create trigger set_updated_at before update on public.weekly_reviews
  for each row execute function public.set_updated_at();

-- WR-3 RLS weekly_reviews
alter table public.weekly_reviews enable row level security;
create policy "weekly_reviews_owner" on public.weekly_reviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- WR-2 RPC weekly_counts
create or replace function public.weekly_counts(p_start date, p_end date, p_project uuid default null)
returns table (done integer, missed integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.tasks_view
       where user_id = auth.uid()
         and status = 'done'
         and completed_at is not null
         and jakarta_date(completed_at) between p_start and p_end
         and (p_project is null or project_id = p_project))::int as done,
    (select count(*) from public.tasks_view
       where user_id = auth.uid()
         and is_overdue
         and due_at is not null
         and jakarta_date(due_at) between p_start and p_end
         and (p_project is null or project_id = p_project))::int as missed;
$$;

-- RPC upsert_weekly_review — helper simpan/replace review (dipakai FE PAGE-H2)
create or replace function public.upsert_weekly_review(
  p_project_id uuid,
  p_period_start date,
  p_period_end date,
  p_done_summary text,
  p_missed_summary text,
  p_carry_over text,
  p_next_focus text
)
returns public.weekly_reviews
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.weekly_reviews;
begin
  insert into public.weekly_reviews (
    user_id, project_id, period_start, period_end,
    done_summary, missed_summary, carry_over, next_focus
  )
  values (
    auth.uid(), p_project_id, p_period_start, p_period_end,
    p_done_summary, p_missed_summary, p_carry_over, p_next_focus
  )
  on conflict (user_id, project_id, period_start, period_end)
  do update set
    done_summary = excluded.done_summary,
    missed_summary = excluded.missed_summary,
    carry_over = excluded.carry_over,
    next_focus = excluded.next_focus
  returning * into v_row;

  return v_row;
end;
$$;

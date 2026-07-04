-- Time blocking: jadwalkan slot waktu kerja untuk sebuah task, terpisah dari due_at
-- (due_at = deadline, time_block = kapan sungguhan dikerjakan).
create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  task_id uuid not null references public.tasks(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_block_valid_range check (end_at > start_at)
);
create index idx_time_blocks_user on public.time_blocks(user_id);
create index idx_time_blocks_task on public.time_blocks(task_id);
create index idx_time_blocks_range on public.time_blocks(start_at, end_at);

create trigger set_updated_at before update on public.time_blocks
  for each row execute function public.set_updated_at();

alter table public.time_blocks enable row level security;
create policy "time_blocks_owner" on public.time_blocks
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Pomodoro: sesi fokus/istirahat yang dijalankan sambil mengerjakan sebuah task.
create table public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  task_id uuid references public.tasks(id) on delete set null,
  kind text not null default 'focus' check (kind in ('focus','break')),
  planned_minutes integer not null default 25,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_pomodoro_sessions_user on public.pomodoro_sessions(user_id);
create index idx_pomodoro_sessions_task on public.pomodoro_sessions(task_id);

alter table public.pomodoro_sessions enable row level security;
create policy "pomodoro_sessions_owner" on public.pomodoro_sessions
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- RPC: hitung total menit fokus per task (buat badge kecil di task list/drawer)
create or replace function public.task_focus_minutes(p_task_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(planned_minutes), 0)::int
  from public.pomodoro_sessions
  where task_id = p_task_id and kind = 'focus' and completed and user_id = auth.uid();
$$;

-- RPC: blok waktu dalam rentang tanggal (dipakai Calendar, mirip tasks_in_range)
create or replace function public.time_blocks_in_range(p_start date, p_end date)
returns table (
  id uuid, task_id uuid, task_title text, project_id uuid,
  start_at timestamptz, end_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select tb.id, tb.task_id, t.title, t.project_id, tb.start_at, tb.end_at
  from public.time_blocks tb
  join public.tasks t on t.id = tb.task_id
  where tb.user_id = auth.uid()
    and jakarta_date(tb.start_at) between p_start and p_end
  order by tb.start_at;
$$;

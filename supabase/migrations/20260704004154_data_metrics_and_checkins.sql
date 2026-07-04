-- MET-1 Tabel metrics
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  name text not null,
  unit text,
  type text not null default 'boolean' check (type in ('number','boolean')),
  schedule_type text not null default 'daily' check (schedule_type in ('daily','specific_days')),
  weekdays smallint[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.metrics
  for each row execute function public.set_updated_at();
alter table public.metrics enable row level security;
create policy "metrics_owner" on public.metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- MET-2 Tabel metric_checkins
create table public.metric_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  metric_id uuid not null references public.metrics(id) on delete cascade,
  checkin_date date not null,
  value_number numeric,
  value_bool boolean,
  note text,
  created_at timestamptz not null default now(),
  unique (metric_id, checkin_date)
);
alter table public.metric_checkins enable row level security;
create policy "metric_checkins_owner" on public.metric_checkins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- MET-5 RPC metric_streak
create or replace function public.metric_streak(p_metric_id uuid)
returns integer
language plpgsql
stable
security invoker
as $$
declare
  d date := public.jakarta_date(now());
  streak integer := 0;
  has_checkin boolean;
begin
  loop
    select exists(
      select 1 from public.metric_checkins
      where metric_id = p_metric_id and checkin_date = d
        and (value_bool is true or value_number is not null)
    ) into has_checkin;
    exit when not has_checkin;
    streak := streak + 1;
    d := d - 1;
  end loop;
  return streak;
end;
$$;

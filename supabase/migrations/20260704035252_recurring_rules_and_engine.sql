-- JOB-1 Tabel recurring_rules
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  title_template text not null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  weekdays smallint[],
  day_of_month smallint,
  time_of_day time,
  is_active boolean not null default true,
  last_generated_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_recurring_rules_user on public.recurring_rules(user_id);

create trigger set_updated_at before update on public.recurring_rules
  for each row execute function public.set_updated_at();

alter table public.recurring_rules enable row level security;
create policy "recurring_rules_owner" on public.recurring_rules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- JOB-2 FK recurring di tasks
alter table public.tasks
  add constraint fk_recurring foreign key (recurring_rule_id) references public.recurring_rules(id);

-- JOB-5 Unique guard instance: satu instance per rule per hari (WIB)
create unique index uq_recurring_instance_per_day
  on public.tasks (recurring_rule_id, (public.jakarta_date(due_at)))
  where recurring_rule_id is not null;

-- JOB-3 Fungsi generate_recurring_instances()
create or replace function public.generate_recurring_instances()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_today date := public.jakarta_date(now());
  v_weekday int := extract(dow from (now() at time zone 'Asia/Jakarta'))::int;
  v_dom int := extract(day from (now() at time zone 'Asia/Jakarta'))::int;
  v_due_at timestamptz;
  v_count int := 0;
begin
  for r in
    select * from public.recurring_rules
    where is_active
      and (last_generated_date is distinct from v_today)
      and (
        frequency = 'daily'
        or (frequency = 'weekly' and v_weekday = any(coalesce(weekdays, '{}')))
        or (frequency = 'monthly' and day_of_month = v_dom)
      )
  loop
    v_due_at := (v_today::timestamp + coalesce(r.time_of_day, '09:00'::time))
                  at time zone 'Asia/Jakarta';

    insert into public.tasks (user_id, project_id, title, priority, due_at, source, recurring_rule_id)
    values (r.user_id, r.project_id, r.title_template, r.priority, v_due_at, 'recurring', r.id)
    on conflict (recurring_rule_id, (public.jakarta_date(due_at))) where recurring_rule_id is not null
    do nothing;

    update public.recurring_rules set last_generated_date = v_today where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.generate_recurring_instances() from public, anon, authenticated;

-- JOB-4 Jadwalkan via pg_cron, tiap hari 00:05 WIB (17:05 UTC)
select cron.schedule(
  'generate_recurring_instances_daily',
  '5 17 * * *',
  $$select public.generate_recurring_instances();$$
);

-- REM-1 Tabel reminders
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('task','metric','digest')),
  target_id uuid,
  remind_at timestamptz not null,
  channel text not null default 'inapp' check (channel in ('inapp')),
  status text not null default 'pending' check (status in ('pending','sent','done','dismissed')),
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_reminders_due on public.reminders(remind_at, status);

create trigger set_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

-- REM-2 RLS reminders
alter table public.reminders enable row level security;
create policy "reminders_owner" on public.reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- REM-3 RPC get_pending_reminders — title/sub dirender server-side sesuai revisi FE
create or replace function public.get_pending_reminders()
returns table (
  id uuid, target_type text, target_id uuid, remind_at timestamptz,
  status text, payload jsonb, title text, sub text
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  return query
  select
    r.id, r.target_type, r.target_id, r.remind_at, r.status, r.payload,
    case
      when r.target_type = 'task' then coalesce('Ingat: ' || t.title, 'Ingat: task')
      when r.target_type = 'metric' then coalesce('Check-in ' || m.name, 'Check-in metrik')
      when r.target_type = 'digest' then 'Digest pagi'
    end as title,
    case
      when r.target_type = 'task' then
        case when t.is_overdue then 'lewat due' else 'jatuh tempo hari ini' end
      when r.target_type = 'metric' then 'jangan putus rutinitas'
      when r.target_type = 'digest' then 'klik untuk buka ringkasan'
    end as sub
  from public.reminders r
  left join public.tasks_view t on r.target_type = 'task' and t.id = r.target_id
  left join public.metrics m on r.target_type = 'metric' and m.id = r.target_id
  where r.user_id = auth.uid()
    and r.status = 'pending'
    and r.remind_at <= now()
  order by r.remind_at desc;
end;
$$;

-- REM-4 Dismiss reminder
create or replace function public.dismiss_reminder(p_reminder_id uuid, p_status text default 'dismissed')
returns public.reminders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.reminders;
begin
  if p_status not in ('dismissed', 'done') then
    raise exception 'status harus dismissed atau done';
  end if;
  update public.reminders
    set status = p_status
    where id = p_reminder_id and user_id = auth.uid()
    returning * into v_row;
  if not found then
    raise exception 'Reminder tidak ditemukan atau bukan milik Anda';
  end if;
  return v_row;
end;
$$;

-- REM-5 Fungsi generate_morning_digest()
create or replace function public.generate_morning_digest()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  v_attention record;
  v_count int := 0;
begin
  for u in select id as user_id from public.profiles loop
    if exists (
      select 1 from public.reminders
      where user_id = u.user_id and target_type = 'digest'
        and jakarta_date(remind_at) = jakarta_date(now())
    ) then
      continue;
    end if;

    select
      (select count(*) from public.tasks_view where user_id = u.user_id and is_overdue) as overdue,
      (select count(*) from public.tasks_view where user_id = u.user_id and status in ('todo','doing')
         and due_at is not null and jakarta_date(due_at) = jakarta_date(now())) as due_today,
      (select count(*) from public.tasks_view where user_id = u.user_id and source = 'recurring'
         and due_at is not null and jakarta_date(due_at) = jakarta_date(now())) as recurring_today,
      (select count(*) from public.metrics m where m.user_id = u.user_id and m.is_active
         and not exists (select 1 from public.metric_checkins c where c.metric_id = m.id and c.checkin_date = jakarta_date(now())))
        as checkins_due
    into v_attention;

    insert into public.reminders (user_id, target_type, remind_at, payload)
    values (
      u.user_id, 'digest', (jakarta_date(now())::timestamp + time '07:00') at time zone 'Asia/Jakarta',
      jsonb_build_object(
        'overdue', v_attention.overdue,
        'due_today', v_attention.due_today,
        'recurring_today', v_attention.recurring_today,
        'checkins_due', v_attention.checkins_due
      )
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.generate_morning_digest() from public, anon, authenticated;

-- REM-6 Jadwalkan digest, tiap hari jam 07:00 WIB (00:00 UTC)
select cron.schedule(
  'generate_morning_digest_daily',
  '0 0 * * *',
  $$select public.generate_morning_digest();$$
);

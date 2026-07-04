-- MET-4 Reminder metrik: generate reminder harian untuk metrik yang jatuh jadwal hari ini
create or replace function public.generate_metric_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_weekday int := extract(dow from (now() at time zone 'Asia/Jakarta'))::int;
  v_count int := 0;
begin
  for m in
    select * from public.metrics
    where is_active
      and (
        schedule_type = 'daily'
        or (schedule_type = 'specific_days' and v_weekday = any(coalesce(weekdays, '{}')))
      )
  loop
    if exists (
      select 1 from public.metric_checkins
      where metric_id = m.id and checkin_date = jakarta_date(now())
    ) then
      continue;
    end if;
    if exists (
      select 1 from public.reminders
      where target_type = 'metric' and target_id = m.id
        and jakarta_date(remind_at) = jakarta_date(now())
    ) then
      continue;
    end if;

    insert into public.reminders (user_id, target_type, target_id, remind_at, payload)
    values (m.user_id, 'metric', m.id, now(), jsonb_build_object('metric_name', m.name));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.generate_metric_reminders() from public, anon, authenticated;

-- Jadwalkan tiap hari jam 08:00 WIB (01:00 UTC)
select cron.schedule(
  'generate_metric_reminders_daily',
  '0 1 * * *',
  $$select public.generate_metric_reminders();$$
);

-- Bug: reminder pending tidak pernah kedaluwarsa, digest menumpuk berhari-hari
-- lalu FE menampilkan belasan toast sekaligus saat login.
-- Fix: get_pending_reminders hanya mengembalikan reminder hari ini (WIB) dan
-- sekalian menandai reminder pending yang lebih tua sebagai 'sent' (expired).

-- Bersihkan tumpukan lama sekali jalan
update public.reminders
set status = 'sent'
where status = 'pending'
  and public.jakarta_date(remind_at) < public.jakarta_date(now());

create or replace function public.get_pending_reminders()
returns table (
  id uuid, target_type text, target_id uuid, remind_at timestamptz,
  status text, payload jsonb, title text, sub text
)
language plpgsql
volatile
security invoker
set search_path = public
as $$
begin
  -- Auto-expire reminder milik user ini yang sudah lewat harinya (WIB):
  -- digest kemarin tidak ada gunanya lagi, task/metric reminder basi
  -- tetap terwakili oleh badge overdue di Overview.
  update public.reminders r
  set status = 'sent'
  where r.user_id = auth.uid()
    and r.status = 'pending'
    and jakarta_date(r.remind_at) < jakarta_date(now());

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

-- Web Push: simpan subscription browser/HP per user (bisa lebih dari satu device).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_owner" on public.push_subscriptions
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Tandai reminder yang sudah dikirim sebagai push (beda dari status pending/dismissed
-- yang mengatur tampilan in-app) supaya job pengirim tidak mengirim dobel.
alter table public.reminders add column pushed_at timestamptz;

-- RPC dipakai edge function (service role) untuk ambil reminder yang perlu di-push.
create or replace function public.get_reminders_to_push()
returns table (
  reminder_id uuid, user_id uuid, title text, sub text, remind_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.user_id,
    case
      when r.target_type = 'task' then coalesce('Ingat: ' || t.title, 'Ingat: task')
      when r.target_type = 'metric' then coalesce('Check-in ' || m.name, 'Check-in metrik')
      when r.target_type = 'digest' then 'Digest pagi'
    end as title,
    case
      when r.target_type = 'task' then case when t.is_overdue then 'lewat due' else 'jatuh tempo hari ini' end
      when r.target_type = 'metric' then 'jangan putus rutinitas'
      when r.target_type = 'digest' then 'klik untuk buka ringkasan'
    end as sub,
    r.remind_at
  from public.reminders r
  left join public.tasks_view t on r.target_type = 'task' and t.id = r.target_id
  left join public.metrics m on r.target_type = 'metric' and m.id = r.target_id
  where r.status = 'pending' and r.remind_at <= now() and r.pushed_at is null;
$$;

revoke execute on function public.get_reminders_to_push() from public, anon, authenticated;

create or replace function public.mark_reminder_pushed(p_reminder_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reminders set pushed_at = now() where id = p_reminder_id;
$$;

revoke execute on function public.mark_reminder_pushed(uuid) from public, anon, authenticated;

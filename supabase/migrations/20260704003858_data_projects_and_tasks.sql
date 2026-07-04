-- DATA-1 Tabel projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  name text not null,
  type text not null default 'brand' check (type in ('brand','content','learning','personal')),
  color text,
  sort_order integer default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_projects_user on public.projects(user_id);

create trigger set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
create policy "projects_owner" on public.projects
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DATA-3 Tabel tasks (+ kolom link/image_path baru sesuai revisi FE)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  title text not null,
  notes text,
  link text,
  image_path text,
  status text not null default 'todo' check (status in ('todo','doing','done','dropped')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_at timestamptz,
  is_focus_today boolean not null default false,
  source text not null default 'manual' check (source in ('manual','inbox','recurring')),
  recurring_rule_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_user on public.tasks(user_id);
create index idx_tasks_project on public.tasks(project_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_due on public.tasks(due_at);
create index idx_tasks_focus on public.tasks(is_focus_today) where is_focus_today;
create index idx_tasks_inbox on public.tasks(user_id) where project_id is null;

create trigger set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
create policy "tasks_owner" on public.tasks
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DATA-4 View tasks_view
create view public.tasks_view with (security_invoker = true) as
select t.*, (t.due_at < now() and t.status not in ('done','dropped')) as is_overdue
from public.tasks t;

-- DATA-6 Guard Top 3 fokus: maksimal 3 is_focus_today=true per user
create or replace function public.guard_focus_today()
returns trigger
language plpgsql
as $$
declare
  focus_count integer;
begin
  if new.is_focus_today then
    select count(*) into focus_count
    from public.tasks
    where user_id = new.user_id
      and is_focus_today = true
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
    if focus_count >= 3 then
      raise exception 'Top 3 fokus sudah penuh — lepas salah satu dulu';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_focus_today
  before insert or update of is_focus_today on public.tasks
  for each row execute function public.guard_focus_today();

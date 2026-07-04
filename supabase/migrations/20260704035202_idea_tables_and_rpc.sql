-- IDEA-1 Tabel ideas
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id),
  title text not null,
  body text,
  link text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ideas_user on public.ideas(user_id);
create index idx_ideas_project on public.ideas(project_id);

create trigger set_updated_at before update on public.ideas
  for each row execute function public.set_updated_at();

alter table public.ideas enable row level security;
create policy "ideas_owner" on public.ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- IDEA-2 Tabel idea_history (snapshot manual)
create table public.idea_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);
create index idx_idea_history_idea on public.idea_history(idea_id, created_at desc);

alter table public.idea_history enable row level security;
create policy "idea_history_owner" on public.idea_history
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- IDEA-4 RPC save_idea_version
create or replace function public.save_idea_version(p_idea_id uuid)
returns public.idea_history
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_idea public.ideas;
  v_row public.idea_history;
begin
  select * into v_idea from public.ideas where id = p_idea_id and user_id = auth.uid();
  if not found then
    raise exception 'Idea tidak ditemukan atau bukan milik Anda';
  end if;

  insert into public.idea_history (user_id, idea_id, title, body)
  values (auth.uid(), v_idea.id, v_idea.title, v_idea.body)
  returning * into v_row;

  return v_row;
end;
$$;

-- IDEA-5 RPC convert_idea_to_task (transaksional: buat task, hapus idea)
create or replace function public.convert_idea_to_task(p_idea_id uuid, p_status_default text default 'todo')
returns public.tasks
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_idea public.ideas;
  v_notes text;
  v_task public.tasks;
begin
  select * into v_idea from public.ideas where id = p_idea_id and user_id = auth.uid();
  if not found then
    raise exception 'Idea tidak ditemukan atau bukan milik Anda';
  end if;

  v_notes := nullif(trim(both E'\n' from concat_ws(E'\n', v_idea.body, v_idea.link)), '');

  insert into public.tasks (user_id, project_id, title, notes, image_path, status, source)
  values (
    auth.uid(),
    v_idea.project_id,
    v_idea.title,
    v_notes,
    v_idea.image_path,
    p_status_default,
    case when v_idea.project_id is null then 'inbox' else 'manual' end
  )
  returning * into v_task;

  delete from public.ideas where id = p_idea_id and user_id = auth.uid();

  return v_task;
end;
$$;

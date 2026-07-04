-- FND-4 Auth + profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles_self" on public.profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Buat profil otomatis saat user auth baru dibuat
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- FND-5 Trigger updated_at generik
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- FND-6 Util timezone
create or replace function public.jakarta_date(ts timestamptz)
returns date
language sql
immutable
as $$
  select (ts at time zone 'Asia/Jakarta')::date;
$$;

-- GCAL-2: simpan token Google per user + mapping event per task.
-- Token hanya diakses route handler server (Next.js API) — kode browser
-- tidak pernah menyentuh tabel ini; RLS owner-only melindungi antar user.
create table public.google_calendar_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expiry timestamptz not null,
  google_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_tokens enable row level security;
create policy "gcal_tokens_owner" on public.google_calendar_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_gcal_tokens_updated_at
  before update on public.google_calendar_tokens
  for each row execute function public.set_updated_at();

-- GCAL-4: mapping event Google per task (satu arah task -> event)
alter table public.tasks add column google_event_id text;

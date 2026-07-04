-- DATA-2 Seed 8 project — dibungkus RPC (bukan hardcode migration) karena
-- butuh auth.uid() milik user yang baru signup. Panggil sekali setelah login pertama.
create or replace function public.seed_default_projects()
returns setof public.projects
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.projects where user_id = auth.uid()) then
    return query select * from public.projects where user_id = auth.uid();
    return;
  end if;

  return query
  insert into public.projects (user_id, name, type, color, sort_order) values
    (auth.uid(), 'ngajigaes.id', 'brand', '#2F4A3E', 0),
    (auth.uid(), 'Labbaika', 'brand', '#44518A', 1),
    (auth.uid(), 'Alaikahabibi', 'brand', '#7A4634', 2),
    (auth.uid(), 'Shaleeha Journey', 'personal', '#B08948', 3),
    (auth.uid(), 'MediaPondok Jatim', 'brand', '#3E5C73', 4),
    (auth.uid(), 'PauseProject.id', 'personal', '#8B8578', 5),
    (auth.uid(), 'Ngonten Kopi', 'content', '#B4552D', 6),
    (auth.uid(), 'Belajar AI', 'learning', '#5C7A6E', 7)
  returning *;
end;
$$;

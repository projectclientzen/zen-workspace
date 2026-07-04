-- Pin search_path di semua fungsi (fix lint function_search_path_mutable)
alter function public.set_updated_at() set search_path = public;
alter function public.jakarta_date(timestamptz) set search_path = public;
alter function public.guard_focus_today() set search_path = public;
alter function public.get_today(uuid) set search_path = public;
alter function public.get_attention() set search_path = public;
alter function public.get_project_stats() set search_path = public;
alter function public.get_urgent() set search_path = public;
alter function public.metric_streak(uuid) set search_path = public;

-- handle_new_user hanya boleh jalan lewat trigger auth.users, bukan dipanggil langsung
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- seed_default_projects hanya untuk user yang sudah login, bukan anon
revoke execute on function public.seed_default_projects() from anon;

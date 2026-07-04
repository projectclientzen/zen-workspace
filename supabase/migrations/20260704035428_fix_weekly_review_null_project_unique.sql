-- Ganti unique constraint biasa (gagal saat project_id NULL, karena NULL <> NULL di Postgres)
-- dengan unique index berbasis ekspresi coalesce ke sentinel UUID.
alter table public.weekly_reviews drop constraint weekly_reviews_user_id_project_id_period_start_period_end_key;

create unique index uq_weekly_reviews_scope on public.weekly_reviews (
  user_id,
  coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
  period_start,
  period_end
);

create or replace function public.upsert_weekly_review(
  p_project_id uuid,
  p_period_start date,
  p_period_end date,
  p_done_summary text,
  p_missed_summary text,
  p_carry_over text,
  p_next_focus text
)
returns public.weekly_reviews
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row public.weekly_reviews;
begin
  insert into public.weekly_reviews (
    user_id, project_id, period_start, period_end,
    done_summary, missed_summary, carry_over, next_focus
  )
  values (
    auth.uid(), p_project_id, p_period_start, p_period_end,
    p_done_summary, p_missed_summary, p_carry_over, p_next_focus
  )
  on conflict (user_id, (coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid)), period_start, period_end)
  do update set
    done_summary = excluded.done_summary,
    missed_summary = excluded.missed_summary,
    carry_over = excluded.carry_over,
    next_focus = excluded.next_focus
  returning * into v_row;

  return v_row;
end;
$$;

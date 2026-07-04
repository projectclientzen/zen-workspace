-- Perf: bungkus auth.uid() dengan (select ...) supaya planner tidak re-evaluate per baris
drop policy "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy "projects_owner" on public.projects;
create policy "projects_owner" on public.projects
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "tasks_owner" on public.tasks;
create policy "tasks_owner" on public.tasks
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "metrics_owner" on public.metrics;
create policy "metrics_owner" on public.metrics
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "metric_checkins_owner" on public.metric_checkins;
create policy "metric_checkins_owner" on public.metric_checkins
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "ideas_owner" on public.ideas;
create policy "ideas_owner" on public.ideas
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "idea_history_owner" on public.idea_history;
create policy "idea_history_owner" on public.idea_history
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "recurring_rules_owner" on public.recurring_rules;
create policy "recurring_rules_owner" on public.recurring_rules
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "reminders_owner" on public.reminders;
create policy "reminders_owner" on public.reminders
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy "weekly_reviews_owner" on public.weekly_reviews;
create policy "weekly_reviews_owner" on public.weekly_reviews
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Index FK yang belum ter-cover (INFO lint unindexed_foreign_keys)
create index idx_idea_history_user on public.idea_history(user_id);
create index idx_metric_checkins_user on public.metric_checkins(user_id);
create index idx_metrics_user on public.metrics(user_id);
create index idx_metrics_project on public.metrics(project_id);
create index idx_recurring_rules_project on public.recurring_rules(project_id);
create index idx_reminders_user on public.reminders(user_id);
create index idx_weekly_reviews_project on public.weekly_reviews(project_id);

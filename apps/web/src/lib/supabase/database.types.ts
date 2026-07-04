// Tipe kolom mentah dari Postgres (snake_case, sesuai skema di supabase/migrations).
// Terpisah dari lib/types.ts (Data Contract camel-ish FE) supaya query layer
// (lib/supabase/queries.ts) yang menjembatani keduanya.

export interface DbProject {
  id: string;
  user_id: string;
  name: string;
  type: "brand" | "content" | "learning" | "personal";
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTaskView {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  notes: string | null;
  link: string | null;
  image_path: string | null;
  status: "todo" | "doing" | "done" | "dropped";
  priority: "low" | "medium" | "high";
  due_at: string | null;
  is_focus_today: boolean;
  source: "manual" | "inbox" | "recurring";
  recurring_rule_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
}

export interface DbIdea {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbIdeaHistory {
  id: string;
  user_id: string;
  idea_id: string;
  title: string;
  body: string | null;
  created_at: string;
}

export interface DbRecurringRule {
  id: string;
  user_id: string;
  project_id: string | null;
  title_template: string;
  priority: "low" | "medium" | "high";
  frequency: "daily" | "weekly" | "monthly";
  weekdays: number[] | null;
  day_of_month: number | null;
  time_of_day: string | null;
  is_active: boolean;
  last_generated_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMetric {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  unit: string | null;
  type: "number" | "boolean";
  schedule_type: "daily" | "specific_days";
  weekdays: number[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbMetricCheckin {
  id: string;
  user_id: string;
  metric_id: string;
  checkin_date: string;
  value_number: number | null;
  value_bool: boolean | null;
  note: string | null;
  created_at: string;
}

export interface DbWeeklyReview {
  id: string;
  user_id: string;
  project_id: string | null;
  period_start: string;
  period_end: string;
  done_summary: string | null;
  missed_summary: string | null;
  carry_over: string | null;
  next_focus: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPendingReminder {
  id: string;
  target_type: "task" | "metric" | "digest";
  target_id: string | null;
  remind_at: string;
  status: "pending" | "sent" | "done" | "dismissed";
  payload: Record<string, unknown> | null;
  title: string;
  sub: string;
}

export interface DbTimeBlock {
  id: string;
  user_id: string;
  task_id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbPomodoroSession {
  id: string;
  user_id: string;
  task_id: string | null;
  kind: "focus" | "break";
  planned_minutes: number;
  started_at: string;
  ended_at: string | null;
  completed: boolean;
  created_at: string;
}

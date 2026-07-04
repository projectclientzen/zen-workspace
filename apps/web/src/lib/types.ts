// Data Contract — harus tetap sinkron dengan FE_Tasks_Personal_Dashboard.md
// dan skema BE (BE_Tasks_Personal_Dashboard.md). Semua tanggal string ISO UTC,
// FE bertanggung jawab menampilkan dalam WIB (Asia/Jakarta).

export type ProjectType = "brand" | "content" | "learning" | "personal";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  color: string | null;
  is_active: boolean;
  sort_order: number;
}

export type TaskStatus = "todo" | "doing" | "done" | "dropped";
export type Priority = "low" | "medium" | "high";
export type TaskSource = "manual" | "inbox" | "recurring";

export interface Task {
  id: string;
  project_id: string | null; // null = Inbox
  project_name: string | null;
  title: string;
  notes: string | null;
  link: string | null;
  image_path: string | null;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  is_focus_today: boolean;
  is_overdue: boolean; // dihitung backend, WIB
  source: TaskSource;
  recurring_rule_id: string | null;
  completed_at: string | null;
  created_at: string;
}

export type RecurringFrequency = "daily" | "weekly" | "monthly";

export interface RecurringRule {
  id: string;
  project_id: string | null;
  title_template: string;
  priority: Priority;
  frequency: RecurringFrequency;
  weekdays: number[] | null; // 0=Minggu..6=Sabtu
  day_of_month: number | null;
  time_of_day: string | null; // "HH:mm"
  is_active: boolean;
}

export type ReminderTargetType = "task" | "metric" | "digest";
export type ReminderStatus = "pending" | "sent" | "done" | "dismissed";

export interface Reminder {
  id: string;
  target_type: ReminderTargetType;
  target_id: string | null;
  remind_at: string;
  status: ReminderStatus;
  payload: Record<string, unknown> | null;
  title: string; // dirender backend
  sub: string; // dirender backend
}

export type MetricType = "number" | "boolean";
export type MetricScheduleType = "daily" | "specific_days";

export interface Metric {
  id: string;
  project_id: string | null;
  name: string;
  unit: string | null;
  type: MetricType;
  schedule_type: MetricScheduleType;
  weekdays: number[] | null;
  is_active: boolean;
}

export interface MetricCheckin {
  id: string;
  metric_id: string;
  checkin_date: string;
  value_number: number | null;
  value_bool: boolean | null;
  note: string | null;
}

export interface AttentionSummary {
  overdue: number;
  due_today: number;
  recurring_today: number;
  checkins_due: number;
}

export interface ProjectStat {
  project_id: string;
  project_name: string;
  open: number;
  due_today: number;
  overdue: number;
}

export interface WeeklyReview {
  id: string;
  project_id: string | null; // null = gabungan
  period_start: string;
  period_end: string;
  done_summary: string | null;
  missed_summary: string | null;
  carry_over: string | null;
  next_focus: string | null;
}

export interface Idea {
  id: string;
  project_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  image_path: string | null;
  created_at: string;
}

export interface IdeaHistoryEntry {
  id: string;
  idea_id: string;
  title: string;
  body: string | null;
  created_at: string;
}

export type UrgentKind = "overdue" | "high_today";

export interface UrgentGroup {
  kind: UrgentKind;
  tasks: Task[];
}

export type MockScenario = "normal" | "overdue" | "empty";

export interface MockDataset {
  projects: Project[];
  tasks: Task[];
  recurringRules: RecurringRule[];
  reminders: Reminder[];
  metrics: Metric[];
  metricCheckins: MetricCheckin[];
  weeklyReviews: WeeklyReview[];
  ideas: Idea[];
  ideaHistory: IdeaHistoryEntry[];
}

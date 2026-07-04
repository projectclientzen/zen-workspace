import { createClient } from "@/lib/supabase/client";
import type {
  DbIdea,
  DbIdeaHistory,
  DbMetric,
  DbMetricCheckin,
  DbPendingReminder,
  DbPomodoroSession,
  DbProject,
  DbRecurringRule,
  DbTaskView,
  DbTimeBlock,
  DbWeeklyReview,
} from "@/lib/supabase/database.types";
import type {
  Idea,
  IdeaHistoryEntry,
  Metric,
  MetricCheckin,
  MockDataset,
  PomodoroKind,
  PomodoroSession,
  Project,
  RecurringRule,
  Reminder,
  Task,
  TimeBlock,
  WeeklyReview,
} from "@/lib/types";

function mapProject(p: DbProject): Project {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    color: p.color,
    is_active: p.is_active,
    sort_order: p.sort_order,
  };
}

function mapTask(t: DbTaskView, projectName: string | null): Task {
  return {
    id: t.id,
    project_id: t.project_id,
    project_name: projectName,
    title: t.title,
    notes: t.notes,
    link: t.link,
    image_path: t.image_path,
    status: t.status,
    priority: t.priority,
    due_at: t.due_at,
    is_focus_today: t.is_focus_today,
    is_overdue: t.is_overdue,
    source: t.source,
    recurring_rule_id: t.recurring_rule_id,
    completed_at: t.completed_at,
    created_at: t.created_at,
  };
}

function mapIdea(i: DbIdea): Idea {
  return {
    id: i.id,
    project_id: i.project_id,
    title: i.title,
    body: i.body,
    link: i.link,
    image_path: i.image_path,
    created_at: i.created_at,
  };
}

function mapIdeaHistory(h: DbIdeaHistory): IdeaHistoryEntry {
  return { id: h.id, idea_id: h.idea_id, title: h.title, body: h.body, created_at: h.created_at };
}

function mapRule(r: DbRecurringRule): RecurringRule {
  return {
    id: r.id,
    project_id: r.project_id,
    title_template: r.title_template,
    priority: r.priority,
    frequency: r.frequency,
    weekdays: r.weekdays,
    day_of_month: r.day_of_month,
    time_of_day: r.time_of_day,
    is_active: r.is_active,
  };
}

function mapMetric(m: DbMetric): Metric {
  return {
    id: m.id,
    project_id: m.project_id,
    name: m.name,
    unit: m.unit,
    type: m.type,
    schedule_type: m.schedule_type,
    weekdays: m.weekdays,
    is_active: m.is_active,
  };
}

function mapCheckin(c: DbMetricCheckin): MetricCheckin {
  return {
    id: c.id,
    metric_id: c.metric_id,
    checkin_date: c.checkin_date,
    value_number: c.value_number,
    value_bool: c.value_bool,
    note: c.note,
  };
}

function mapReview(w: DbWeeklyReview): WeeklyReview {
  return {
    id: w.id,
    project_id: w.project_id,
    period_start: w.period_start,
    period_end: w.period_end,
    done_summary: w.done_summary,
    missed_summary: w.missed_summary,
    carry_over: w.carry_over,
    next_focus: w.next_focus,
  };
}

function mapReminder(r: DbPendingReminder): Reminder {
  return {
    id: r.id,
    target_type: r.target_type,
    target_id: r.target_id,
    remind_at: r.remind_at,
    status: r.status,
    payload: r.payload,
    title: r.title,
    sub: r.sub,
  };
}

function mapPomodoroSession(p: DbPomodoroSession): PomodoroSession {
  return {
    id: p.id,
    task_id: p.task_id,
    kind: p.kind,
    planned_minutes: p.planned_minutes,
    started_at: p.started_at,
    ended_at: p.ended_at,
    completed: p.completed,
  };
}

export async function fetchDataset(): Promise<MockDataset> {
  const supabase = createClient();

  const [
    { data: projects, error: eProjects },
    { data: tasks, error: eTasks },
    { data: metrics, error: eMetrics },
    { data: checkins, error: eCheckins },
    { data: rules, error: eRules },
    { data: ideas, error: eIdeas },
    { data: ideaHistory, error: eIdeaHistory },
    { data: reviews, error: eReviews },
    { data: pendingReminders, error: eReminders },
    { data: timeBlocks, error: eTimeBlocks },
    { data: pomodoroSessions, error: ePomodoro },
  ] = await Promise.all([
    supabase.from("projects").select("*").order("sort_order"),
    supabase.from("tasks_view").select("*").order("created_at", { ascending: false }),
    supabase.from("metrics").select("*"),
    supabase.from("metric_checkins").select("*"),
    supabase.from("recurring_rules").select("*"),
    supabase.from("ideas").select("*").order("created_at", { ascending: false }),
    supabase.from("idea_history").select("*").order("created_at", { ascending: false }),
    supabase.from("weekly_reviews").select("*"),
    supabase.rpc("get_pending_reminders"),
    supabase.from("time_blocks").select("*").order("start_at"),
    supabase.from("pomodoro_sessions").select("*").order("started_at", { ascending: false }),
  ]);

  const firstError =
    eProjects || eTasks || eMetrics || eCheckins || eRules || eIdeas || eIdeaHistory || eReviews ||
    eReminders || eTimeBlocks || ePomodoro;
  if (firstError) throw firstError;

  const projectList = (projects ?? []).map(mapProject);
  const projectNameById = new Map(projectList.map((p) => [p.id, p.name]));
  const taskList = (tasks ?? []).map((t) =>
    mapTask(t as DbTaskView, projectNameById.get((t as DbTaskView).project_id ?? "") ?? null),
  );
  const taskById = new Map(taskList.map((t) => [t.id, t]));

  return {
    projects: projectList,
    tasks: taskList,
    metrics: (metrics ?? []).map(mapMetric),
    metricCheckins: (checkins ?? []).map(mapCheckin),
    recurringRules: (rules ?? []).map(mapRule),
    ideas: (ideas ?? []).map(mapIdea),
    ideaHistory: (ideaHistory ?? []).map(mapIdeaHistory),
    weeklyReviews: (reviews ?? []).map(mapReview),
    reminders: (pendingReminders ?? []).map((r: DbPendingReminder) => mapReminder(r)),
    timeBlocks: (timeBlocks ?? []).map((tb: DbTimeBlock): TimeBlock => {
      const task = taskById.get(tb.task_id);
      return {
        id: tb.id,
        task_id: tb.task_id,
        task_title: task?.title ?? null,
        project_id: task?.project_id ?? null,
        start_at: tb.start_at,
        end_at: tb.end_at,
      };
    }),
    pomodoroSessions: (pomodoroSessions ?? []).map((p: DbPomodoroSession) => mapPomodoroSession(p)),
  };
}

// ---------- Mutations ----------

export async function dbAddTask(input: Partial<Task> & { title: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login");

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      project_id: input.project_id ?? null,
      title: input.title,
      notes: input.notes ?? null,
      link: input.link ?? null,
      image_path: input.image_path ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      due_at: input.due_at ?? null,
      is_focus_today: input.is_focus_today ?? false,
      source: input.source ?? (input.project_id ? "manual" : "inbox"),
      recurring_rule_id: input.recurring_rule_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbUpdateTask(id: string, patch: Partial<Task>) {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === "project_name") continue; // kolom turunan, bukan kolom asli
    if (key === "is_overdue") continue; // dihitung backend via view
    dbPatch[key] = value;
  }
  const { error } = await supabase.from("tasks").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function dbAddIdea(input: Partial<Idea> & { title: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login");

  const { data, error } = await supabase
    .from("ideas")
    .insert({
      user_id: user.id,
      project_id: input.project_id ?? null,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      image_path: input.image_path ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbUpdateIdea(id: string, patch: Partial<Idea>) {
  const supabase = createClient();
  const { error } = await supabase.from("ideas").update(patch).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteIdea(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("ideas").delete().eq("id", id);
  if (error) throw error;
}

export async function dbSaveIdeaVersion(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("save_idea_version", { p_idea_id: id });
  if (error) throw error;
}

export async function dbConvertIdeaToTask(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("convert_idea_to_task", { p_idea_id: id });
  if (error) throw error;
  return data;
}

export async function dbAddMetric(input: Partial<Metric> & { name: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login");

  const { data, error } = await supabase
    .from("metrics")
    .insert({
      user_id: user.id,
      project_id: input.project_id ?? null,
      name: input.name,
      unit: input.unit ?? null,
      type: input.type ?? "boolean",
      schedule_type: input.schedule_type ?? "daily",
      weekdays: input.weekdays ?? null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbUpsertCheckin(
  metricId: string,
  date: string,
  value: number | boolean,
  note: string | null,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login");

  const isBool = typeof value === "boolean";
  const { error } = await supabase.from("metric_checkins").upsert(
    {
      user_id: user.id,
      metric_id: metricId,
      checkin_date: date,
      value_bool: isBool ? (value as boolean) : null,
      value_number: isBool ? null : (value as number),
      note,
    },
    { onConflict: "metric_id,checkin_date" },
  );
  if (error) throw error;
}

export async function dbAddRule(
  input: Partial<RecurringRule> & { title_template: string; frequency: RecurringRule["frequency"] },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login");

  const { data, error } = await supabase
    .from("recurring_rules")
    .insert({
      user_id: user.id,
      project_id: input.project_id ?? null,
      title_template: input.title_template,
      priority: input.priority ?? "medium",
      frequency: input.frequency,
      weekdays: input.weekdays ?? null,
      day_of_month: input.day_of_month ?? null,
      time_of_day: input.time_of_day ?? null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbToggleRule(id: string, isActive: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("recurring_rules").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function dbDismissReminder(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("dismiss_reminder", { p_reminder_id: id, p_status: "dismissed" });
  if (error) throw error;
}

export async function dbSaveWeeklyReview(
  projectId: string | null,
  periodStart: string,
  periodEnd: string,
  patch: Partial<Pick<WeeklyReview, "done_summary" | "missed_summary" | "carry_over" | "next_focus">>,
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("upsert_weekly_review", {
    p_project_id: projectId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_done_summary: patch.done_summary ?? null,
    p_missed_summary: patch.missed_summary ?? null,
    p_carry_over: patch.carry_over ?? null,
    p_next_focus: patch.next_focus ?? null,
  });
  if (error) throw error;
}

export async function dbSeedDefaultProjects() {
  const supabase = createClient();
  const { error } = await supabase.rpc("seed_default_projects");
  if (error) throw error;
}

// ---------- Projects ----------

export async function dbAddProject(input: {
  name: string;
  type: Project["type"];
  color: string | null;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login");

  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: input.name,
      type: input.type,
      color: input.color,
      sort_order: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function dbUpdateProject(id: string, patch: Partial<Pick<Project, "name" | "type" | "color" | "is_active">>) {
  const supabase = createClient();
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) throw error;
}

// ---------- Time blocking ----------

export async function dbAddTimeBlock(taskId: string, startAt: string, endAt: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login");

  const { error } = await supabase
    .from("time_blocks")
    .insert({ user_id: user.id, task_id: taskId, start_at: startAt, end_at: endAt });
  if (error) throw error;
}

export async function dbDeleteTimeBlock(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("time_blocks").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Pomodoro ----------

export async function dbLogPomodoroSession(input: {
  taskId: string | null;
  kind: PomodoroKind;
  plannedMinutes: number;
  startedAt: string;
  endedAt: string;
  completed: boolean;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Belum login");

  const { error } = await supabase.from("pomodoro_sessions").insert({
    user_id: user.id,
    task_id: input.taskId,
    kind: input.kind,
    planned_minutes: input.plannedMinutes,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    completed: input.completed,
  });
  if (error) throw error;
}

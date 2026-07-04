import type { AttentionSummary, Metric, MockDataset, ProjectStat, Task, UrgentGroup } from "@/lib/types";

function jakartaDayStart(offset = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

export function scopeTasks(tasks: Task[], projectId: string | "all"): Task[] {
  if (projectId === "all") return tasks;
  return tasks.filter((t) => t.project_id === projectId);
}

export function isDueToday(task: Task): boolean {
  if (!task.due_at) return false;
  const start = jakartaDayStart(0).getTime();
  const end = jakartaDayStart(1).getTime();
  const due = new Date(task.due_at).getTime();
  return due >= start && due < end;
}

export function isOpenTask(task: Task): boolean {
  return task.status === "todo" || task.status === "doing";
}

export function getAttentionSummary(dataset: MockDataset, projectId: string | "all"): AttentionSummary {
  const tasks = scopeTasks(dataset.tasks, projectId);
  const overdue = tasks.filter((t) => t.is_overdue).length;
  const due_today = tasks.filter((t) => isDueToday(t) && isOpenTask(t)).length;
  const recurring_today = tasks.filter((t) => t.source === "recurring" && isDueToday(t)).length;
  const today = jakartaDayStart(0).toISOString().slice(0, 10);
  const checkins_due = dataset.metrics.filter((m) => {
    if (!m.is_active) return false;
    const already = dataset.metricCheckins.some((c) => c.metric_id === m.id && c.checkin_date === today);
    if (already) return false;
    if (m.schedule_type === "daily") return true;
    const weekday = jakartaDayStart(0).getDay();
    return (m.weekdays ?? []).includes(weekday);
  }).length;
  return { overdue, due_today, recurring_today, checkins_due };
}

export function getProjectStats(dataset: MockDataset): ProjectStat[] {
  return dataset.projects.map((p) => {
    const tasks = dataset.tasks.filter((t) => t.project_id === p.id && t.status !== "dropped");
    return {
      project_id: p.id,
      project_name: p.name,
      open: tasks.filter(isOpenTask).length,
      due_today: tasks.filter((t) => isDueToday(t) && isOpenTask(t)).length,
      overdue: tasks.filter((t) => t.is_overdue).length,
      done: tasks.filter((t) => t.status === "done").length,
      total: tasks.length,
    };
  });
}

export function getUrgentGroups(dataset: MockDataset, projectId: string | "all"): UrgentGroup[] {
  const tasks = scopeTasks(dataset.tasks, projectId);
  const overdue = tasks.filter((t) => t.is_overdue);
  const highToday = tasks.filter((t) => isDueToday(t) && t.priority === "high" && !t.is_overdue && isOpenTask(t));
  return [
    { kind: "overdue", tasks: overdue },
    { kind: "high_today", tasks: highToday },
  ];
}

export function getTodayTasks(dataset: MockDataset, projectId: string | "all"): Task[] {
  const tasks = scopeTasks(dataset.tasks, projectId);
  return tasks
    .filter((t) => isOpenTask(t) && (t.is_overdue || isDueToday(t) || t.is_focus_today))
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as const;
      return order[a.priority] - order[b.priority];
    });
}

export function getTop3(dataset: MockDataset, projectId: string | "all"): Task[] {
  return scopeTasks(dataset.tasks, projectId).filter((t) => t.is_focus_today);
}

export function getInboxTasks(dataset: MockDataset): Task[] {
  return dataset.tasks.filter((t) => t.project_id === null && t.status !== "dropped" && t.status !== "done");
}

export function isMetricDueToday(metric: Metric): boolean {
  if (!metric.is_active) return false;
  if (metric.schedule_type === "daily") return true;
  const weekday = jakartaDayStart(0).getDay();
  return (metric.weekdays ?? []).includes(weekday);
}

export function computeStreak(dataset: MockDataset, metricId: string): number {
  let d = jakartaDayStart(0);
  let streak = 0;
  const metric = dataset.metrics.find((m) => m.id === metricId);
  if (!metric) return 0;
  while (true) {
    const dateStr = d.toISOString().slice(0, 10);
    const checkin = dataset.metricCheckins.find(
      (c) => c.metric_id === metricId && c.checkin_date === dateStr,
    );
    const dow = d.getDay();
    const scheduled = metric.schedule_type === "daily" || (metric.weekdays ?? []).includes(dow);
    const done = !!checkin && (checkin.value_bool === true || checkin.value_number != null);
    if (scheduled && !done) break;
    if (scheduled && done) streak += 1;
    d = new Date(d);
    d.setDate(d.getDate() - 1);
    if (streak > 365) break; // safety guard
  }
  return streak;
}

export interface CheckinRow {
  metric: Metric;
  due: boolean;
  doneToday: boolean;
  streak: number;
}

export function getCheckinRows(dataset: MockDataset, projectId: string | "all"): CheckinRow[] {
  const today = jakartaDayStart(0).toISOString().slice(0, 10);
  return dataset.metrics
    .filter((m) => m.is_active && (projectId === "all" || m.project_id === projectId))
    .map((m) => {
      const checkin = dataset.metricCheckins.find((c) => c.metric_id === m.id && c.checkin_date === today);
      return {
        metric: m,
        due: isMetricDueToday(m),
        doneToday: !!checkin && (checkin.value_bool === true || checkin.value_number != null),
        streak: computeStreak(dataset, m.id),
      };
    });
}

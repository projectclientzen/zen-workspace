import type { AttentionSummary, MockDataset, ProjectStat, Task, UrgentGroup } from "@/lib/types";

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
    const tasks = dataset.tasks.filter((t) => t.project_id === p.id);
    return {
      project_id: p.id,
      project_name: p.name,
      open: tasks.filter(isOpenTask).length,
      due_today: tasks.filter((t) => isDueToday(t) && isOpenTask(t)).length,
      overdue: tasks.filter((t) => t.is_overdue).length,
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

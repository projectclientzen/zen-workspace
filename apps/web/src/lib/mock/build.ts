import type {
  Idea,
  IdeaHistoryEntry,
  Metric,
  MetricCheckin,
  MockDataset,
  MockScenario,
  Priority,
  Reminder,
  RecurringRule,
  Task,
  WeeklyReview,
} from "@/lib/types";
import { MOCK_PROJECTS } from "./projects";

// Catatan: generator ini sengaja deterministik (bukan Math.random murni) supaya
// hasil sama tiap render server/klien dan lintas reload — mirip pola di mockup
// desain (Zen Dashboard.dc.html / Zen Mobile.dc.html), sebelum backend nyata
// menggantikan seluruh lib/mock ini (lihat FND-5).

function dayStart(offsetDays: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

function at(offsetDays: number, hour = 9, minute = 0): string {
  const d = dayStart(offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const projectName = (id: string | null) =>
  MOCK_PROJECTS.find((p) => p.id === id)?.name ?? null;

let taskSeq = 0;
function makeTask(partial: {
  project_id: string | null;
  title: string;
  status?: Task["status"];
  priority?: Priority;
  dueOffsetDays?: number | null;
  dueHour?: number;
  is_focus_today?: boolean;
  source?: Task["source"];
  recurring_rule_id?: string | null;
  notes?: string | null;
  link?: string | null;
  createdOffsetDays?: number;
}): Task {
  taskSeq += 1;
  const status = partial.status ?? "todo";
  const due_at =
    partial.dueOffsetDays == null ? null : at(partial.dueOffsetDays, partial.dueHour ?? 17);
  const isOverdue =
    due_at != null && status !== "done" && status !== "dropped" && new Date(due_at) < new Date();
  return {
    id: `t${taskSeq}`,
    project_id: partial.project_id,
    project_name: projectName(partial.project_id),
    title: partial.title,
    notes: partial.notes ?? null,
    link: partial.link ?? null,
    image_path: null,
    status,
    priority: partial.priority ?? "medium",
    due_at,
    is_focus_today: partial.is_focus_today ?? false,
    is_overdue: isOverdue,
    source: partial.source ?? "manual",
    recurring_rule_id: partial.recurring_rule_id ?? null,
    completed_at: status === "done" ? at(partial.dueOffsetDays ?? -1, 10) : null,
    created_at: at(partial.createdOffsetDays ?? -5, 8),
  };
}

function buildNormalTasks(): Task[] {
  const [p1, p2, p3, p4, p5, p6, p7, p8] = MOCK_PROJECTS.map((p) => p.id);
  return [
    makeTask({ project_id: p1, title: "Susun kalender konten Ramadhan", priority: "high", dueOffsetDays: 0, is_focus_today: true }),
    makeTask({ project_id: p2, title: "Review naskah video edukasi", priority: "high", dueOffsetDays: 0, is_focus_today: true }),
    makeTask({ project_id: null, title: "Follow up invoice sponsor Q3", priority: "medium", dueOffsetDays: 0, is_focus_today: true, source: "inbox" }),
    makeTask({ project_id: p3, title: "Balas DM kolaborasi", priority: "medium", dueOffsetDays: 0 }),
    makeTask({ project_id: p4, title: "Tulis jurnal mingguan", priority: "low", dueOffsetDays: 0, source: "recurring", recurring_rule_id: "r1" }),
    makeTask({ project_id: p1, title: "Approve desain thumbnail", priority: "medium", dueOffsetDays: -2 }),
    makeTask({ project_id: p5, title: "Kirim laporan media partner", priority: "high", dueOffsetDays: -1 }),
    makeTask({ project_id: p6, title: "Riset kompetitor pause app", priority: "low", dueOffsetDays: 3 }),
    makeTask({ project_id: p7, title: "Draft caption promo kopi susu", priority: "medium", dueOffsetDays: 1 }),
    makeTask({ project_id: p8, title: "Selesaikan modul RAG", priority: "medium", dueOffsetDays: 2 }),
    makeTask({ project_id: p2, title: "Rekam voice over", priority: "medium", status: "doing", dueOffsetDays: 4 }),
    makeTask({ project_id: p1, title: "Setup automasi posting IG", priority: "low", status: "done", dueOffsetDays: -3 }),
    makeTask({ project_id: p3, title: "Bikin moodboard brand refresh", priority: "low", status: "done", dueOffsetDays: -4 }),
    makeTask({ project_id: null, title: "Catat ide giveaway", priority: "low", source: "inbox" }),
    makeTask({ project_id: null, title: "Cek domain expiry", priority: "medium", source: "inbox" }),
  ];
}

function buildOverdueTasks(): Task[] {
  const [p1, p2, p3, p4, p5, p6, p7, p8] = MOCK_PROJECTS.map((p) => p.id);
  const overdueTitles = [
    "Kirim revisi kontrak",
    "Follow up pembayaran vendor",
    "Upload video minggu lalu",
    "Balas email partnership",
    "Approve budget campaign",
    "Submit laporan pajak",
    "Update dokumen SOP",
    "Selesaikan editing podcast",
  ];
  const projectIds = [p1, p2, p3, p4, p5, p6, p7, p8];
  const overdue = overdueTitles.map((title, i) =>
    makeTask({
      project_id: projectIds[i % projectIds.length],
      title,
      priority: i % 3 === 0 ? "high" : "medium",
      dueOffsetDays: -(i + 1),
    }),
  );
  const highToday = [
    makeTask({ project_id: p1, title: "Rapat evaluasi mingguan", priority: "high", dueOffsetDays: 0, is_focus_today: true }),
    makeTask({ project_id: p7, title: "Kirim proposal sponsor", priority: "high", dueOffsetDays: 0 }),
  ];
  return [...overdue, ...highToday];
}

function buildRecurringRules(): RecurringRule[] {
  const [p1, , , p4] = MOCK_PROJECTS.map((p) => p.id);
  return [
    { id: "r1", project_id: p4, title_template: "Tulis jurnal mingguan", priority: "low", frequency: "weekly", weekdays: [0], day_of_month: null, time_of_day: "20:00", is_active: true },
    { id: "r2", project_id: p1, title_template: "Posting konten harian", priority: "medium", frequency: "daily", weekdays: null, day_of_month: null, time_of_day: "09:00", is_active: true },
    { id: "r3", project_id: null, title_template: "Review keuangan bulanan", priority: "medium", frequency: "monthly", weekdays: null, day_of_month: 1, time_of_day: "08:00", is_active: false },
  ];
}

function buildMetrics(): { metrics: Metric[]; checkins: MetricCheckin[] } {
  const [p1, , , p4] = MOCK_PROJECTS.map((p) => p.id);
  const metrics: Metric[] = [
    { id: "m1", project_id: null, name: "Tidur cukup", unit: null, type: "boolean", schedule_type: "daily", weekdays: null, is_active: true },
    { id: "m2", project_id: p4, name: "Olahraga", unit: null, type: "boolean", schedule_type: "specific_days", weekdays: [1, 3, 5], is_active: true },
    { id: "m3", project_id: p1, name: "Waktu fokus", unit: "menit", type: "number", schedule_type: "daily", weekdays: null, is_active: true },
  ];
  const checkins: MetricCheckin[] = [];
  let seq = 0;
  for (let i = 6; i >= 0; i -= 1) {
    const date = dayStart(-i).toISOString().slice(0, 10);
    seq += 1;
    checkins.push({ id: `c${seq}`, metric_id: "m1", checkin_date: date, value_number: null, value_bool: i !== 2, note: null });
    if (i % 2 === 0) {
      seq += 1;
      checkins.push({ id: `c${seq}`, metric_id: "m2", checkin_date: date, value_number: null, value_bool: i !== 4, note: null });
    }
    seq += 1;
    checkins.push({ id: `c${seq}`, metric_id: "m3", checkin_date: date, value_number: 45 + i * 5, value_bool: null, note: null });
  }
  return { metrics, checkins };
}

function buildReminders(): Reminder[] {
  return [
    { id: "n1", target_type: "task", target_id: "t1", remind_at: at(0, 8), status: "pending", payload: null, title: "Ingat: Susun kalender konten Ramadhan", sub: "jatuh tempo hari ini" },
    { id: "n2", target_type: "metric", target_id: "m2", remind_at: at(0, 19), status: "pending", payload: null, title: "Check-in Olahraga", sub: "jangan putus rutinitas" },
    { id: "n3", target_type: "digest", target_id: null, remind_at: at(0, 7), status: "pending", payload: null, title: "Digest pagi", sub: "klik untuk buka ringkasan" },
  ];
}

function buildWeeklyReviews(): WeeklyReview[] {
  return [
    {
      id: "w1",
      project_id: null,
      period_start: dayStart(-7).toISOString().slice(0, 10),
      period_end: dayStart(-1).toISOString().slice(0, 10),
      done_summary: "Konten Ramadhan rilis tepat waktu, invoice sponsor beres.",
      missed_summary: "Editing podcast Ngonten Kopi masih tertunda.",
      carry_over: "Editing podcast, revisi kontrak vendor.",
      next_focus: "Fokus beresin backlog overdue dulu sebelum ambil task baru.",
    },
  ];
}

function buildIdeas(): { ideas: Idea[]; history: IdeaHistoryEntry[] } {
  const [p1, , , , , , p7] = MOCK_PROJECTS.map((p) => p.id);
  const ideas: Idea[] = [
    { id: "i1", project_id: p1, title: "Series 'Ngaji 5 menit'", body: "Format pendek, satu ayat satu insight, cocok buat Reels.", link: null, image_path: null, created_at: at(-6, 10) },
    { id: "i2", project_id: null, title: "Kolaborasi lintas brand", body: "Ngonten Kopi x ngajigaes.id, konten ngobrol santai.", link: null, image_path: null, created_at: at(-3, 14) },
    { id: "i3", project_id: p7, title: "Menu musiman kopi rempah", body: null, link: "https://example.com/inspirasi-menu", image_path: null, created_at: at(-1, 9) },
  ];
  const history: IdeaHistoryEntry[] = [
    { id: "h1", idea_id: "i1", title: "Series ayat harian", body: "Draft awal sebelum diganti nama.", created_at: at(-6, 10, 30) },
  ];
  return { ideas, history };
}

export function buildMockDataset(scenario: MockScenario): MockDataset {
  if (scenario === "empty") {
    return {
      projects: MOCK_PROJECTS,
      tasks: [],
      recurringRules: [],
      reminders: [],
      metrics: [],
      metricCheckins: [],
      weeklyReviews: [],
      ideas: [],
      ideaHistory: [],
    };
  }

  const { metrics, checkins } = buildMetrics();
  const { ideas, history } = buildIdeas();

  return {
    projects: MOCK_PROJECTS,
    tasks: scenario === "overdue" ? buildOverdueTasks() : buildNormalTasks(),
    recurringRules: buildRecurringRules(),
    reminders: buildReminders(),
    metrics,
    metricCheckins: checkins,
    weeklyReviews: buildWeeklyReviews(),
    ideas,
    ideaHistory: history,
  };
}

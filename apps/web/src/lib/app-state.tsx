"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { buildMockDataset } from "@/lib/mock/build";
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

const SCENARIO_KEY = "zen-scenario";
const SCOPE_KEY = "zen-scope";
const FOCUS_KEY = "zen-focus";

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function recomputeOverdue(task: Task): Task {
  const isOverdue =
    task.due_at != null &&
    task.status !== "done" &&
    task.status !== "dropped" &&
    new Date(task.due_at) < new Date();
  return { ...task, is_overdue: isOverdue };
}

interface ToastItem {
  id: string;
  msg: string;
}

interface AppState {
  scenario: MockScenario;
  setScenario: (s: MockScenario) => void;
  dataset: MockDataset;
  /** "all" = Overview (semua project tercampur), selain itu id project aktif. */
  activeProjectId: string | "all";
  setActiveProjectId: (id: string | "all") => void;
  /** Focus Mode mengunci ke satu project, menyembunyikan Overview + project lain dari nav. */
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleFocusMode: () => void;

  toasts: ToastItem[];
  pushToast: (msg: string) => void;

  // UI: drawer detail task & form buat/edit task, dipanggil dari halaman mana pun
  openTaskId: string | null;
  openTaskDetail: (id: string) => void;
  closeTaskDetail: () => void;
  taskForm: { open: boolean; taskId: string | null; defaultProjectId: string | null };
  openTaskForm: (opts?: { taskId?: string; defaultProjectId?: string | null }) => void;
  closeTaskForm: () => void;

  // Tasks
  addTask: (input: Partial<Task> & { title: string }) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleFocusToday: (id: string) => void;
  setTaskStatus: (id: string, status: Task["status"]) => void;
  setTaskPriority: (id: string, priority: Priority) => void;
  softDeleteTask: (id: string) => void;
  postponeToTomorrow: (id: string) => void;

  // Ideas
  addIdea: (input: Partial<Idea> & { title: string }) => Idea;
  updateIdea: (id: string, patch: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;
  saveIdeaVersion: (id: string) => void;
  convertIdeaToTask: (id: string) => Task | null;

  // Metrics
  addMetric: (input: Partial<Metric> & { name: string }) => Metric;
  upsertCheckin: (metricId: string, date: string, value: number | boolean, note?: string | null) => void;

  // Recurring rules
  addRule: (input: Partial<RecurringRule> & { title_template: string; frequency: RecurringRule["frequency"] }) => RecurringRule;
  toggleRule: (id: string) => void;

  // Reminders
  dismissReminder: (id: string) => void;

  // Weekly review
  saveWeeklyReview: (
    projectId: string | null,
    periodStart: string,
    periodEnd: string,
    patch: Partial<Pick<WeeklyReview, "done_summary" | "missed_summary" | "carry_over" | "next_focus">>,
  ) => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenarioState] = useState<MockScenario>("normal");
  const [activeProjectId, setActiveProjectIdState] = useState<string | "all">("all");
  const [focusMode, setFocusModeState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [dataset, setDataset] = useState<MockDataset>(() => buildMockDataset("normal"));
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<{ open: boolean; taskId: string | null; defaultProjectId: string | null }>({
    open: false,
    taskId: null,
    defaultProjectId: null,
  });

  useEffect(() => {
    const s = localStorage.getItem(SCENARIO_KEY) as MockScenario | null;
    const scope = localStorage.getItem(SCOPE_KEY);
    const focus = localStorage.getItem(FOCUS_KEY);
    if (s === "normal" || s === "overdue" || s === "empty") {
      setScenarioState(s);
      setDataset(buildMockDataset(s));
    }
    if (scope) setActiveProjectIdState(scope);
    if (focus) setFocusModeState(focus === "1");
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushToast = useCallback((msg: string) => {
    const id = nextId("toast");
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const setScenario = (s: MockScenario) => {
    setScenarioState(s);
    setDataset(buildMockDataset(s));
    localStorage.setItem(SCENARIO_KEY, s);
  };
  const setActiveProjectId = (id: string | "all") => {
    setActiveProjectIdState(id);
    localStorage.setItem(SCOPE_KEY, id);
  };
  const setFocusMode = (v: boolean) => {
    setFocusModeState(v);
    localStorage.setItem(FOCUS_KEY, v ? "1" : "0");
  };
  const toggleFocusMode = () => setFocusMode(!focusMode);

  useEffect(() => {
    if (!hydrated) return;
    if (focusMode && activeProjectId === "all" && dataset.projects[0]) {
      setActiveProjectId(dataset.projects[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMode, hydrated]);

  // ---------- Tasks ----------
  const addTask = useCallback(
    (input: Partial<Task> & { title: string }): Task => {
      const projectName =
        input.project_id != null
          ? dataset.projects.find((p) => p.id === input.project_id)?.name ?? null
          : null;
      const task = recomputeOverdue({
        id: nextId("t"),
        project_id: input.project_id ?? null,
        project_name: projectName,
        title: input.title,
        notes: input.notes ?? null,
        link: input.link ?? null,
        image_path: input.image_path ?? null,
        status: input.status ?? "todo",
        priority: input.priority ?? "medium",
        due_at: input.due_at ?? null,
        is_focus_today: input.is_focus_today ?? false,
        is_overdue: false,
        source: input.source ?? (input.project_id ? "manual" : "inbox"),
        recurring_rule_id: input.recurring_rule_id ?? null,
        completed_at: null,
        created_at: new Date().toISOString(),
      });
      setDataset((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }));
      return task;
    },
    [dataset.projects],
  );

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setDataset((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? recomputeOverdue({ ...t, ...patch }) : t)),
    }));
  }, []);

  const toggleFocusToday = useCallback(
    (id: string) => {
      const task = dataset.tasks.find((t) => t.id === id);
      if (!task) return;
      if (!task.is_focus_today) {
        const focusedCount = dataset.tasks.filter((t) => t.is_focus_today).length;
        if (focusedCount >= 3) {
          pushToast("Top 3 penuh — selesaikan atau lepas satu dulu.");
          return;
        }
      }
      updateTask(id, { is_focus_today: !task.is_focus_today });
    },
    [dataset.tasks, updateTask, pushToast],
  );

  const setTaskStatus = useCallback(
    (id: string, status: Task["status"]) => {
      updateTask(id, {
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      });
    },
    [updateTask],
  );

  const setTaskPriority = useCallback(
    (id: string, priority: Priority) => updateTask(id, { priority }),
    [updateTask],
  );

  const softDeleteTask = useCallback((id: string) => updateTask(id, { status: "dropped" }), [updateTask]);

  const postponeToTomorrow = useCallback(
    (id: string) => {
      const task = dataset.tasks.find((t) => t.id === id);
      const base = task?.due_at ? new Date(task.due_at) : new Date();
      const tomorrow = new Date(base);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      updateTask(id, { due_at: tomorrow.toISOString() });
      pushToast("Dipindah ke besok.");
    },
    [dataset.tasks, updateTask, pushToast],
  );

  // ---------- Ideas ----------
  const addIdea = useCallback((input: Partial<Idea> & { title: string }): Idea => {
    const idea: Idea = {
      id: nextId("i"),
      project_id: input.project_id ?? null,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      image_path: input.image_path ?? null,
      created_at: new Date().toISOString(),
    };
    setDataset((prev) => ({ ...prev, ideas: [idea, ...prev.ideas] }));
    return idea;
  }, []);

  const updateIdea = useCallback((id: string, patch: Partial<Idea>) => {
    setDataset((prev) => ({
      ...prev,
      ideas: prev.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, []);

  const deleteIdea = useCallback((id: string) => {
    setDataset((prev) => ({
      ...prev,
      ideas: prev.ideas.filter((i) => i.id !== id),
      ideaHistory: prev.ideaHistory.filter((h) => h.idea_id !== id),
    }));
  }, []);

  const saveIdeaVersion = useCallback(
    (id: string) => {
      const idea = dataset.ideas.find((i) => i.id === id);
      if (!idea) return;
      const entry: IdeaHistoryEntry = {
        id: nextId("h"),
        idea_id: id,
        title: idea.title,
        body: idea.body,
        created_at: new Date().toISOString(),
      };
      setDataset((prev) => ({ ...prev, ideaHistory: [entry, ...prev.ideaHistory] }));
      pushToast("Versi ide tersimpan.");
    },
    [dataset.ideas, pushToast],
  );

  const convertIdeaToTask = useCallback(
    (id: string): Task | null => {
      const idea = dataset.ideas.find((i) => i.id === id);
      if (!idea) return null;
      const notes = [idea.body, idea.link].filter(Boolean).join("\n") || null;
      const task = addTask({
        title: idea.title,
        notes,
        image_path: idea.image_path,
        project_id: idea.project_id,
        source: idea.project_id ? "manual" : "inbox",
      });
      deleteIdea(id);
      pushToast("Ide dijadikan task.");
      return task;
    },
    [dataset.ideas, addTask, deleteIdea, pushToast],
  );

  // ---------- Metrics ----------
  const addMetric = useCallback((input: Partial<Metric> & { name: string }): Metric => {
    const metric: Metric = {
      id: nextId("m"),
      project_id: input.project_id ?? null,
      name: input.name,
      unit: input.unit ?? null,
      type: input.type ?? "boolean",
      schedule_type: input.schedule_type ?? "daily",
      weekdays: input.weekdays ?? null,
      is_active: input.is_active ?? true,
    };
    setDataset((prev) => ({ ...prev, metrics: [metric, ...prev.metrics] }));
    return metric;
  }, []);

  const upsertCheckin = useCallback(
    (metricId: string, date: string, value: number | boolean, note: string | null = null) => {
      setDataset((prev) => {
        const existing = prev.metricCheckins.find(
          (c) => c.metric_id === metricId && c.checkin_date === date,
        );
        const isBool = typeof value === "boolean";
        if (existing) {
          return {
            ...prev,
            metricCheckins: prev.metricCheckins.map((c) =>
              c.id === existing.id
                ? {
                    ...c,
                    value_bool: isBool ? (value as boolean) : null,
                    value_number: isBool ? null : (value as number),
                    note,
                  }
                : c,
            ),
          };
        }
        const entry: MetricCheckin = {
          id: nextId("c"),
          metric_id: metricId,
          checkin_date: date,
          value_bool: isBool ? (value as boolean) : null,
          value_number: isBool ? null : (value as number),
          note,
        };
        return { ...prev, metricCheckins: [entry, ...prev.metricCheckins] };
      });
    },
    [],
  );

  // ---------- Recurring rules ----------
  const addRule = useCallback(
    (input: Partial<RecurringRule> & { title_template: string; frequency: RecurringRule["frequency"] }): RecurringRule => {
      const rule: RecurringRule = {
        id: nextId("r"),
        project_id: input.project_id ?? null,
        title_template: input.title_template,
        priority: input.priority ?? "medium",
        frequency: input.frequency,
        weekdays: input.weekdays ?? null,
        day_of_month: input.day_of_month ?? null,
        time_of_day: input.time_of_day ?? null,
        is_active: input.is_active ?? true,
      };
      setDataset((prev) => ({ ...prev, recurringRules: [rule, ...prev.recurringRules] }));
      return rule;
    },
    [],
  );

  const toggleRule = useCallback((id: string) => {
    setDataset((prev) => ({
      ...prev,
      recurringRules: prev.recurringRules.map((r) =>
        r.id === id ? { ...r, is_active: !r.is_active } : r,
      ),
    }));
  }, []);

  // ---------- Reminders ----------
  const dismissReminder = useCallback((id: string) => {
    setDataset((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r): Reminder => (r.id === id ? { ...r, status: "dismissed" } : r)),
    }));
  }, []);

  // ---------- Weekly review ----------
  const saveWeeklyReview = useCallback(
    (
      projectId: string | null,
      periodStart: string,
      periodEnd: string,
      patch: Partial<Pick<WeeklyReview, "done_summary" | "missed_summary" | "carry_over" | "next_focus">>,
    ) => {
      setDataset((prev) => {
        const existing = prev.weeklyReviews.find(
          (w) => w.project_id === projectId && w.period_start === periodStart && w.period_end === periodEnd,
        );
        if (existing) {
          return {
            ...prev,
            weeklyReviews: prev.weeklyReviews.map((w) => (w.id === existing.id ? { ...w, ...patch } : w)),
          };
        }
        const review: WeeklyReview = {
          id: nextId("w"),
          project_id: projectId,
          period_start: periodStart,
          period_end: periodEnd,
          done_summary: null,
          missed_summary: null,
          carry_over: null,
          next_focus: null,
          ...patch,
        };
        return { ...prev, weeklyReviews: [review, ...prev.weeklyReviews] };
      });
      pushToast("Review tersimpan.");
    },
    [pushToast],
  );

  const openTaskDetail = useCallback((id: string) => setOpenTaskId(id), []);
  const closeTaskDetail = useCallback(() => setOpenTaskId(null), []);
  const openTaskForm = useCallback(
    (opts?: { taskId?: string; defaultProjectId?: string | null }) =>
      setTaskForm({ open: true, taskId: opts?.taskId ?? null, defaultProjectId: opts?.defaultProjectId ?? null }),
    [],
  );
  const closeTaskForm = useCallback(() => setTaskForm({ open: false, taskId: null, defaultProjectId: null }), []);

  const value: AppState = {
    scenario,
    setScenario,
    dataset,
    activeProjectId,
    setActiveProjectId,
    focusMode,
    setFocusMode,
    toggleFocusMode,
    toasts,
    pushToast,
    openTaskId,
    openTaskDetail,
    closeTaskDetail,
    taskForm,
    openTaskForm,
    closeTaskForm,
    addTask,
    updateTask,
    toggleFocusToday,
    setTaskStatus,
    setTaskPriority,
    softDeleteTask,
    postponeToTomorrow,
    addIdea,
    updateIdea,
    deleteIdea,
    saveIdeaVersion,
    convertIdeaToTask,
    addMetric,
    upsertCheckin,
    addRule,
    toggleRule,
    dismissReminder,
    saveWeeklyReview,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState harus dipakai di dalam AppStateProvider");
  return ctx;
}

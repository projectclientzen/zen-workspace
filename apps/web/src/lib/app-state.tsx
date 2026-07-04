"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  dbAddIdea,
  dbAddMetric,
  dbAddRule,
  dbAddTask,
  dbConvertIdeaToTask,
  dbDeleteIdea,
  dbDismissReminder,
  dbSaveIdeaVersion,
  dbSaveWeeklyReview,
  dbSeedDefaultProjects,
  dbToggleRule,
  dbUpdateIdea,
  dbUpdateTask,
  dbUpsertCheckin,
  fetchDataset,
} from "@/lib/supabase/queries";
import type {
  Idea,
  Metric,
  MockDataset,
  Priority,
  RecurringRule,
  Task,
  WeeklyReview,
} from "@/lib/types";

const SCOPE_KEY = "zen-scope";
const FOCUS_KEY = "zen-focus";

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

const EMPTY_DATASET: MockDataset = {
  projects: [],
  tasks: [],
  recurringRules: [],
  reminders: [],
  metrics: [],
  metricCheckins: [],
  weeklyReviews: [],
  ideas: [],
  ideaHistory: [],
};

interface ToastItem {
  id: string;
  msg: string;
}

interface AppState {
  dataset: MockDataset;
  loading: boolean;
  signOut: () => Promise<void>;

  /** "all" = Overview (semua project tercampur), selain itu id project aktif. */
  activeProjectId: string | "all";
  setActiveProjectId: (id: string | "all") => void;
  /** Focus Mode mengunci ke satu project, menyembunyikan Overview + project lain dari nav. */
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleFocusMode: () => void;

  toasts: ToastItem[];
  pushToast: (msg: string) => void;

  // Tasks
  addTask: (input: Partial<Task> & { title: string }) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  toggleFocusToday: (id: string) => void;
  setTaskStatus: (id: string, status: Task["status"]) => void;
  setTaskPriority: (id: string, priority: Priority) => void;
  softDeleteTask: (id: string) => void;
  postponeToTomorrow: (id: string) => void;

  // Ideas
  addIdea: (input: Partial<Idea> & { title: string }) => void;
  updateIdea: (id: string, patch: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;
  saveIdeaVersion: (id: string) => void;
  convertIdeaToTask: (id: string) => void;

  // Metrics
  addMetric: (input: Partial<Metric> & { name: string }) => void;
  upsertCheckin: (metricId: string, date: string, value: number | boolean, note?: string | null) => void;

  // Recurring rules
  addRule: (input: Partial<RecurringRule> & { title_template: string; frequency: RecurringRule["frequency"] }) => void;
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

  // UI: drawer detail task & form buat/edit task, dipanggil dari halaman mana pun
  openTaskId: string | null;
  openTaskDetail: (id: string) => void;
  closeTaskDetail: () => void;
  taskForm: { open: boolean; taskId: string | null; defaultProjectId: string | null };
  openTaskForm: (opts?: { taskId?: string; defaultProjectId?: string | null }) => void;
  closeTaskForm: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [activeProjectId, setActiveProjectIdState] = useState<string | "all">("all");
  const [focusMode, setFocusModeState] = useState(false);
  const [dataset, setDataset] = useState<MockDataset>(EMPTY_DATASET);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<{ open: boolean; taskId: string | null; defaultProjectId: string | null }>({
    open: false,
    taskId: null,
    defaultProjectId: null,
  });

  const pushToast = useCallback((msg: string) => {
    const id = nextId("toast");
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchDataset();
      setDataset(data);
      return data;
    } catch (err) {
      console.error(err);
      pushToast("Gagal memuat data dari server.");
      return null;
    }
  }, [pushToast]);

  // Load awal + hidrasi preferensi lokal (scope/focus mode) + auto-seed 8 project default.
  /* eslint-disable react-hooks/set-state-in-effect -- hidrasi sekali dari localStorage
     setelah mount, bukan sinkronisasi berulang. Sengaja tidak dipindah ke lazy
     initializer supaya SSR/first paint konsisten (localStorage tidak tersedia
     di server) dan tidak memicu hydration mismatch. */
  useEffect(() => {
    let cancelled = false;

    const scope = localStorage.getItem(SCOPE_KEY);
    const focus = localStorage.getItem(FOCUS_KEY);
    if (scope) setActiveProjectIdState(scope);
    if (focus) setFocusModeState(focus === "1");

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      let data = await fetchDataset();
      if (data.projects.length === 0) {
        try {
          await dbSeedDefaultProjects();
          data = await fetchDataset();
        } catch (err) {
          console.error("Gagal seed default projects", err);
        }
      }
      if (!cancelled) {
        setDataset(data);
        setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setDataset(EMPTY_DATASET);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // PAGE-F2: poll reminder pending tiap 60 detik, toast sekali untuk tiap id baru
  // (get_pending_reminders() sudah memfilter remind_at <= now, jadi "baru muncul di daftar" = "baru jatuh tempo").
  const toastedReminderIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const r of dataset.reminders) {
      if (toastedReminderIds.current.has(r.id)) continue;
      toastedReminderIds.current.add(r.id);
      pushToast(r.title);
    }
  }, [dataset.reminders, pushToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const setActiveProjectId = (id: string | "all") => {
    setActiveProjectIdState(id);
    localStorage.setItem(SCOPE_KEY, id);
  };
  const setFocusMode = (v: boolean) => {
    setFocusModeState(v);
    localStorage.setItem(FOCUS_KEY, v ? "1" : "0");
    if (v && activeProjectId === "all" && dataset.projects[0]) {
      setActiveProjectId(dataset.projects[0].id);
    }
  };
  const toggleFocusMode = () => setFocusMode(!focusMode);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Bungkus mutasi Supabase: jalankan, lalu refresh dataset; kalau gagal, kasih toast + tetap refresh (resync). */
  const runMutation = useCallback(
    (job: Promise<unknown>, failMsg: string) => {
      job
        .then(() => refresh())
        .catch((err) => {
          console.error(err);
          pushToast(failMsg);
          refresh();
        });
    },
    [refresh, pushToast],
  );

  // ---------- Tasks ----------
  const addTask = useCallback(
    (input: Partial<Task> & { title: string }) => {
      runMutation(dbAddTask(input), "Gagal membuat task.");
    },
    [runMutation],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      runMutation(dbUpdateTask(id, patch), "Gagal menyimpan perubahan task.");
    },
    [runMutation],
  );

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
  const addIdea = useCallback(
    (input: Partial<Idea> & { title: string }) => {
      runMutation(dbAddIdea(input), "Gagal menyimpan ide.");
    },
    [runMutation],
  );

  const updateIdea = useCallback(
    (id: string, patch: Partial<Idea>) => {
      runMutation(dbUpdateIdea(id, patch), "Gagal menyimpan ide.");
    },
    [runMutation],
  );

  const deleteIdea = useCallback(
    (id: string) => {
      runMutation(dbDeleteIdea(id), "Gagal menghapus ide.");
    },
    [runMutation],
  );

  const saveIdeaVersion = useCallback(
    (id: string) => {
      dbSaveIdeaVersion(id)
        .then(() => {
          pushToast("Versi ide tersimpan.");
          refresh();
        })
        .catch((err) => {
          console.error(err);
          pushToast("Gagal menyimpan versi ide.");
        });
    },
    [refresh, pushToast],
  );

  const convertIdeaToTask = useCallback(
    (id: string) => {
      dbConvertIdeaToTask(id)
        .then(() => {
          pushToast("Ide dijadikan task.");
          refresh();
        })
        .catch((err) => {
          console.error(err);
          pushToast("Gagal mengonversi ide ke task.");
        });
    },
    [refresh, pushToast],
  );

  // ---------- Metrics ----------
  const addMetric = useCallback(
    (input: Partial<Metric> & { name: string }) => {
      runMutation(dbAddMetric(input), "Gagal menyimpan metrik.");
    },
    [runMutation],
  );

  const upsertCheckin = useCallback(
    (metricId: string, date: string, value: number | boolean, note: string | null = null) => {
      runMutation(dbUpsertCheckin(metricId, date, value, note), "Gagal menyimpan check-in.");
    },
    [runMutation],
  );

  // ---------- Recurring rules ----------
  const addRule = useCallback(
    (input: Partial<RecurringRule> & { title_template: string; frequency: RecurringRule["frequency"] }) => {
      runMutation(dbAddRule(input), "Gagal menyimpan aturan recurring.");
    },
    [runMutation],
  );

  const toggleRule = useCallback(
    (id: string) => {
      const rule = dataset.recurringRules.find((r) => r.id === id);
      if (!rule) return;
      runMutation(dbToggleRule(id, !rule.is_active), "Gagal mengubah status aturan.");
    },
    [dataset.recurringRules, runMutation],
  );

  // ---------- Reminders ----------
  const dismissReminder = useCallback(
    (id: string) => {
      runMutation(dbDismissReminder(id), "Gagal menutup reminder.");
    },
    [runMutation],
  );

  // ---------- Weekly review ----------
  const saveWeeklyReview = useCallback(
    (
      projectId: string | null,
      periodStart: string,
      periodEnd: string,
      patch: Partial<Pick<WeeklyReview, "done_summary" | "missed_summary" | "carry_over" | "next_focus">>,
    ) => {
      dbSaveWeeklyReview(projectId, periodStart, periodEnd, patch)
        .then(() => {
          pushToast("Review tersimpan.");
          refresh();
        })
        .catch((err) => {
          console.error(err);
          pushToast("Gagal menyimpan review.");
        });
    },
    [refresh, pushToast],
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
    dataset,
    loading,
    signOut,
    activeProjectId,
    setActiveProjectId,
    focusMode,
    setFocusMode,
    toggleFocusMode,
    toasts,
    pushToast,
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
    openTaskId,
    openTaskDetail,
    closeTaskDetail,
    taskForm,
    openTaskForm,
    closeTaskForm,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState harus dipakai di dalam AppStateProvider");
  return ctx;
}

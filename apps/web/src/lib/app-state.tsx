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
  dbAddProject,
  dbAddRule,
  dbAddTask,
  dbAddTimeBlock,
  dbConvertIdeaToTask,
  dbDeleteIdea,
  dbDeleteTimeBlock,
  dbDismissReminder,
  dbLogPomodoroSession,
  dbSaveIdeaVersion,
  dbSaveWeeklyReview,
  dbSeedDefaultProjects,
  dbToggleRule,
  dbDeleteRule,
  dbUpdateIdea,
  dbUpdateProject,
  dbUpdateTask,
  dbUpsertCheckin,
  fetchDataset,
} from "@/lib/supabase/queries";
import type {
  Idea,
  Metric,
  MockDataset,
  PomodoroKind,
  Priority,
  Project,
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
  timeBlocks: [],
  pomodoroSessions: [],
};

interface ToastItem {
  id: string;
  msg: string;
}

interface AppState {
  dataset: MockDataset;
  loading: boolean;
  loadError: string | null;
  retryLoad: () => void;
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

  // Projects
  addProject: (input: { name: string; type: Project["type"]; color: string | null }) => void;
  updateProject: (id: string, patch: Partial<Pick<Project, "name" | "type" | "color" | "is_active">>) => void;

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
  deleteRule: (id: string) => void;

  // Reminders
  dismissReminder: (id: string) => void;

  // Weekly review
  saveWeeklyReview: (
    projectId: string | null,
    periodStart: string,
    periodEnd: string,
    patch: Partial<Pick<WeeklyReview, "done_summary" | "missed_summary" | "carry_over" | "next_focus">>,
  ) => void;

  // Time blocking
  addTimeBlock: (taskId: string, startAt: string, endAt: string) => void;
  deleteTimeBlock: (id: string) => void;

  // Pomodoro
  logPomodoroSession: (input: {
    taskId: string | null;
    kind: PomodoroKind;
    plannedMinutes: number;
    startedAt: string;
    endedAt: string;
    completed: boolean;
  }) => void;

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
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
  // Catatan: middleware sudah menjamin ada sesi valid untuk semua rute selain /login,
  // jadi di sini kita TIDAK menggerbangi lewat supabase.auth.getUser() lagi (itu sempat
  // jadi sumber bug: kalau getUser() balik null karena race/timing, load diam-diam
  // berhenti tanpa error apa pun — dataset kelihatan "kosong" padahal sebenarnya gagal
  // dimuat). Sekarang fetchDataset() langsung dicoba, dan SETIAP kegagalan (termasuk
  // dari RPC seed) ditangkap dan ditampilkan lewat loadError, bukan didiamkan.
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

    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        let data = await fetchDataset();
        if (data.projects.length === 0) {
          await dbSeedDefaultProjects();
          data = await fetchDataset();
        }
        if (!cancelled) {
          setDataset(data);
        }
      } catch (err) {
        console.error("Gagal memuat data awal", err);
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Gagal memuat data dari server.");
        }
      } finally {
        if (!cancelled) setLoading(false);
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
  }, [retryTick]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const retryLoad = useCallback(() => setRetryTick((t) => t + 1), []);

  // PAGE-F2: poll reminder pending tiap 60 detik, toast sekali untuk tiap id baru
  // (get_pending_reminders() sudah memfilter remind_at <= now, jadi "baru muncul di daftar" = "baru jatuh tempo").
  const toastedReminderIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const fresh = dataset.reminders.filter((r) => !toastedReminderIds.current.has(r.id));
    for (const r of fresh) toastedReminderIds.current.add(r.id);
    if (fresh.length === 0) return;
    // Lebih dari 2 reminder sekaligus (mis. saat baru login) → satu toast ringkasan,
    // detailnya tetap lengkap di notification center (ikon lonceng).
    if (fresh.length > 2) {
      pushToast(`${fresh.length} reminder menunggu — cek ikon lonceng.`);
    } else {
      for (const r of fresh) pushToast(r.title);
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

  // ---------- Projects ----------
  const addProject = useCallback(
    (input: { name: string; type: Project["type"]; color: string | null }) => {
      runMutation(dbAddProject(input), "Gagal membuat project.");
    },
    [runMutation],
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Pick<Project, "name" | "type" | "color" | "is_active">>) => {
      runMutation(dbUpdateProject(id, patch), "Gagal menyimpan project.");
    },
    [runMutation],
  );

  // ---------- Tasks ----------
  // GCAL-4: fire-and-forget sinkronisasi task -> Google Calendar.
  // Server no-op kalau user belum menghubungkan Google Calendar.
  const syncTaskToGcal = useCallback((taskId: string) => {
    fetch("/api/gcal/sync-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    }).catch(() => {});
  }, []);

  const addTask = useCallback(
    (input: Partial<Task> & { title: string }) => {
      runMutation(
        dbAddTask(input).then((row) => {
          if (row?.id && input.due_at) syncTaskToGcal(row.id);
          return row;
        }),
        "Gagal membuat task.",
      );
    },
    [runMutation, syncTaskToGcal],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      runMutation(
        dbUpdateTask(id, patch).then((r) => {
          // due/judul/status berubah bisa berarti event perlu dibuat/diubah/dihapus
          if ("due_at" in patch || "title" in patch || "status" in patch || "notes" in patch) {
            syncTaskToGcal(id);
          }
          return r;
        }),
        "Gagal menyimpan perubahan task.",
      );
    },
    [runMutation, syncTaskToGcal],
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

  const deleteRule = useCallback(
    (id: string) => {
      runMutation(dbDeleteRule(id), "Gagal menghapus rutinitas.");
    },
    [runMutation],
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

  // ---------- Time blocking ----------
  const addTimeBlock = useCallback(
    (taskId: string, startAt: string, endAt: string) => {
      runMutation(dbAddTimeBlock(taskId, startAt, endAt), "Gagal menjadwalkan blok waktu.");
    },
    [runMutation],
  );

  const deleteTimeBlock = useCallback(
    (id: string) => {
      runMutation(dbDeleteTimeBlock(id), "Gagal menghapus blok waktu.");
    },
    [runMutation],
  );

  // ---------- Pomodoro ----------
  const logPomodoroSession = useCallback(
    (input: {
      taskId: string | null;
      kind: PomodoroKind;
      plannedMinutes: number;
      startedAt: string;
      endedAt: string;
      completed: boolean;
    }) => {
      runMutation(dbLogPomodoroSession(input), "Gagal mencatat sesi pomodoro.");
    },
    [runMutation],
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
    loadError,
    retryLoad,
    signOut,
    activeProjectId,
    setActiveProjectId,
    focusMode,
    setFocusMode,
    toggleFocusMode,
    toasts,
    pushToast,
    addProject,
    updateProject,
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
    deleteRule,
    dismissReminder,
    saveWeeklyReview,
    addTimeBlock,
    deleteTimeBlock,
    logPomodoroSession,
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

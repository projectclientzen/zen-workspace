"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { buildMockDataset } from "@/lib/mock/build";
import type { MockDataset, MockScenario, Task } from "@/lib/types";

const SCENARIO_KEY = "zen-scenario";
const SCOPE_KEY = "zen-scope";
const FOCUS_KEY = "zen-focus";

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
  /** Capture cepat: langsung dorong task baru ke Inbox (source: "inbox"), tanpa form penuh. */
  addInboxTask: (title: string) => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenarioState] = useState<MockScenario>("normal");
  const [activeProjectId, setActiveProjectIdState] = useState<string | "all">("all");
  const [focusMode, setFocusModeState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [extraTasks, setExtraTasks] = useState<Task[]>([]);

  useEffect(() => {
    const s = localStorage.getItem(SCENARIO_KEY) as MockScenario | null;
    const scope = localStorage.getItem(SCOPE_KEY);
    const focus = localStorage.getItem(FOCUS_KEY);
    if (s === "normal" || s === "overdue" || s === "empty") setScenarioState(s);
    if (scope) setActiveProjectIdState(scope);
    if (focus) setFocusModeState(focus === "1");
    setHydrated(true);
  }, []);

  const setScenario = (s: MockScenario) => {
    setScenarioState(s);
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

  const baseDataset = useMemo(() => buildMockDataset(scenario), [scenario]);
  const dataset = useMemo<MockDataset>(
    () => ({ ...baseDataset, tasks: [...extraTasks, ...baseDataset.tasks] }),
    [baseDataset, extraTasks],
  );

  useEffect(() => {
    // reset capture lokal saat ganti skenario, biar tidak nyampur data lama
    setExtraTasks([]);
  }, [scenario]);

  const addInboxTask = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newTask: Task = {
      id: `inbox-${Date.now()}`,
      project_id: null,
      project_name: null,
      title: trimmed,
      notes: null,
      link: null,
      image_path: null,
      status: "todo",
      priority: "medium",
      due_at: null,
      is_focus_today: false,
      is_overdue: false,
      source: "inbox",
      recurring_rule_id: null,
      completed_at: null,
      created_at: new Date().toISOString(),
    };
    setExtraTasks((prev) => [newTask, ...prev]);
  };

  // Kalau Focus Mode aktif tapi scope masih "all", kunci ke project pertama.
  useEffect(() => {
    if (!hydrated) return;
    if (focusMode && activeProjectId === "all" && dataset.projects[0]) {
      setActiveProjectId(dataset.projects[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMode, hydrated]);

  const value: AppState = {
    scenario,
    setScenario,
    dataset,
    activeProjectId,
    setActiveProjectId,
    focusMode,
    setFocusMode,
    toggleFocusMode,
    addInboxTask,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState harus dipakai di dalam AppStateProvider");
  return ctx;
}

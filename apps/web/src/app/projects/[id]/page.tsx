"use client";

import { use, useState } from "react";
import { Check, Star } from "lucide-react";
import { RecurringGlyph } from "@/components/common/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppState } from "@/lib/app-state";
import { getTodayTasks } from "@/lib/selectors";
import type { Priority, Task, TaskStatus } from "@/lib/types";

const STATUS_COLS: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
];

function fmtDue(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { dataset, updateTask, openTaskDetail, openTaskForm } = useAppState();
  const [tab, setTab] = useState<"list" | "board" | "today">("list");
  const [fStatus, setFStatus] = useState<"all" | TaskStatus>("all");
  const [fPrio, setFPrio] = useState<"all" | Priority>("all");
  const [dragId, setDragId] = useState<string | null>(null);

  const project = dataset.projects.find((p) => p.id === id);
  const allTasks = dataset.tasks.filter((t) => t.project_id === id && t.status !== "dropped");

  if (!project) {
    return <div className="px-7 py-6 text-muted-foreground">Project tidak ditemukan.</div>;
  }

  const listTasks = allTasks
    .filter((t) => fStatus === "all" || t.status === fStatus)
    .filter((t) => fPrio === "all" || t.priority === fPrio)
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));

  const todayTasks = getTodayTasks(dataset, id);

  const renderRow = (t: Task) => (
    <div
      key={t.id}
      className="flex cursor-pointer items-center gap-2.5 border-b border-border px-4 py-3 last:border-b-0 hover:bg-muted/30"
      onClick={() => openTaskDetail(t.id)}
    >
      <button
        className="flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-[1.5px] border-faint text-[11px] text-transparent hover:border-primary hover:text-primary"
        onClick={(e) => {
          e.stopPropagation();
          updateTask(t.id, {
            status: t.status === "done" ? "todo" : "done",
            completed_at: t.status === "done" ? null : new Date().toISOString(),
          });
        }}
      >
        <Check className="size-3" />
      </button>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
        {t.source === "recurring" && <RecurringGlyph className="mr-1" />}
        {t.title}
      </span>
      <span className="flex-none rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
        {t.priority}
      </span>
      <span className="w-[52px] flex-none text-right text-[10.5px] text-muted-foreground">{t.status}</span>
      <span
        className={`w-[70px] flex-none text-right text-[10.5px] font-semibold ${
          t.is_overdue ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {fmtDue(t.due_at)}
      </span>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-7">
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-3 w-3 rounded-md" style={{ background: project.color ?? "#8A857A" }} />
        <span className="font-serif text-2xl font-medium">{project.name}</span>
        <span className="text-xs text-muted-foreground">{allTasks.length} task</span>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => openTaskForm({ defaultProjectId: id })}>
            + Task Baru
          </Button>
        </div>
      </div>

      {tab === "list" && (
        <>
          <div className="mt-4.5 flex gap-2">
            <Select
              value={fStatus}
              onValueChange={(v) => setFStatus((v ?? "all") as typeof fStatus)}
              items={[
                { value: "all", label: "Status: Semua" },
                { value: "todo", label: "Todo" },
                { value: "doing", label: "Doing" },
                { value: "done", label: "Done" },
              ]}
            >
              <SelectTrigger className="h-8 w-[140px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status: Semua</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="doing">Doing</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={fPrio}
              onValueChange={(v) => setFPrio((v ?? "all") as typeof fPrio)}
              items={[
                { value: "all", label: "Prioritas: Semua" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            >
              <SelectTrigger className="h-8 w-[140px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Prioritas: Semua</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="mt-3 gap-0 overflow-hidden p-0">
            {listTasks.length === 0 && (
              <div className="p-9 text-center font-serif text-[15px] italic text-muted-foreground">
                belum ada task di sini
              </div>
            )}
            {listTasks.map(renderRow)}
          </Card>
        </>
      )}

      {tab === "board" && (
        <div className="mt-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3 sm:overflow-visible">
          {STATUS_COLS.map((col) => {
            const cards = allTasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="flex min-h-[360px] flex-col gap-2 rounded-2xl bg-foreground/[0.04] p-2.5"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) updateTask(dragId, { status: col.key, completed_at: col.key === "done" ? new Date().toISOString() : null });
                  setDragId(null);
                }}
              >
                <div className="flex items-center gap-1.5 px-1 py-0.5">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wide">{col.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{cards.length}</span>
                </div>
                {cards.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onClick={() => openTaskDetail(t.id)}
                    className="cursor-grab rounded-lg border border-border bg-card p-2.5 shadow-sm"
                  >
                    <div className="text-[12.5px] font-semibold leading-snug">
                      {t.source === "recurring" && <RecurringGlyph className="mr-1" />}
                      {t.title}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        {t.priority}
                      </span>
                      <span
                        className={`ml-auto text-[10px] font-semibold ${
                          t.is_overdue ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {fmtDue(t.due_at)}
                      </span>
                      {t.is_focus_today && <Star className="size-3 text-amber" fill="currentColor" />}
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border-[1.5px] border-dashed border-border p-2 text-center text-[10.5px] text-faint">
                  drop di sini
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "today" && (
        <Card className="mt-4.5 max-w-[760px] gap-0 overflow-hidden p-0">
          {todayTasks.length === 0 && (
            <div className="p-9 text-center font-serif text-[15px] italic text-muted-foreground">
              Hari ini lapang.
            </div>
          )}
          {todayTasks.map(renderRow)}
        </Card>
      )}
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppState } from "@/lib/app-state";
import type { Priority, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
];
const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function fmtDueFull(iso: string | null) {
  if (!iso) return "Tanpa due";
  return new Date(iso).toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskDetailDrawer() {
  const {
    dataset,
    openTaskId,
    closeTaskDetail,
    setTaskStatus,
    setTaskPriority,
    toggleFocusToday,
    softDeleteTask,
    postponeToTomorrow,
    openTaskForm,
  } = useAppState();

  const task = dataset.tasks.find((t) => t.id === openTaskId) ?? null;

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && closeTaskDetail()}>
      <SheetContent className="w-[420px] gap-5 sm:max-w-[420px]">
        {task && (
          <>
            <SheetHeader className="gap-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: dataset.projects.find((p) => p.id === task.project_id)?.color ?? "#8A857A",
                  }}
                />
                <span className="text-muted-foreground">{task.project_name ?? "Inbox"}</span>
                <span
                  className={cn(
                    "ml-auto font-semibold",
                    task.is_overdue ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {fmtDueFull(task.due_at)}
                </span>
              </div>
              <SheetTitle className="font-serif text-xl leading-snug font-medium">
                {task.source === "recurring" ? "↻ " : ""}
                {task.title}
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4">
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={task.status === s.value ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setTaskStatus(task.id, s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant={task.status === "dropped" ? "destructive" : "outline"}
                  onClick={() => softDeleteTask(task.id)}
                >
                  Drop
                </Button>
              </div>

              <div className="flex gap-1.5">
                {PRIORITY_OPTIONS.map((p) => (
                  <Button
                    key={p.value}
                    size="sm"
                    variant={task.priority === p.value ? "default" : "outline"}
                    className="flex-1 text-[10.5px] font-bold uppercase tracking-wide"
                    onClick={() => setTaskPriority(task.id, p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              {task.notes && (
                <div className="rounded-lg bg-muted/60 p-3 text-[12.5px] leading-relaxed whitespace-pre-line">
                  {task.notes}
                </div>
              )}

              {task.link && (
                <a
                  href={task.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] font-semibold text-primary underline"
                >
                  ↗ {task.link}
                </a>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 border-amber text-amber hover:text-amber"
                  onClick={() => toggleFocusToday(task.id)}
                >
                  ★ {task.is_focus_today ? "Lepas Top 3" : "Tandai Top 3"}
                </Button>
                {task.due_at && (
                  <Button variant="outline" className="flex-1" onClick={() => postponeToTomorrow(task.id)}>
                    → Besok
                  </Button>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={() => {
                  closeTaskDetail();
                  openTaskForm({ taskId: task.id });
                }}
              >
                Edit detail lengkap
              </Button>

              {task.source === "recurring" && (
                <Badge variant="secondary" className="w-fit">
                  Instance recurring
                </Badge>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

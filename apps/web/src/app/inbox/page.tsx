"use client";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/lib/app-state";
import { getInboxTasks } from "@/lib/selectors";
import type { Priority } from "@/lib/types";

export default function InboxPage() {
  const { dataset, updateTask, softDeleteTask, pushToast, openTaskDetail } = useAppState();
  const items = getInboxTasks(dataset);

  return (
    <div className="mx-auto max-w-[840px] px-7 py-6">
      <div className="font-serif text-2xl font-medium">Inbox</div>
      <div className="mb-4.5 mt-1 text-[12.5px] text-muted-foreground">
        {items.length} item belum ditriase
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        {items.length === 0 && (
          <div className="p-9 text-center text-muted-foreground">
            <div className="font-serif text-[17px] italic">Inbox kosong.</div>
            <div className="mt-1 text-[12.5px]">Tangkap sesuatu lewat capture cepat di top bar.</div>
          </div>
        )}
        {items.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 last:border-b-0"
          >
            <button
              className="flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-[1.5px] border-faint text-[11px] text-transparent hover:border-primary hover:text-primary"
              onClick={() => {
                updateTask(t.id, { status: "done", completed_at: new Date().toISOString() });
                pushToast("Selesai ✓");
              }}
            >
              ✓
            </button>
            <button
              className="min-w-0 flex-1 truncate text-left text-[13.5px] font-medium"
              onClick={() => openTaskDetail(t.id)}
            >
              {t.title}
            </button>

            <Select
              value={t.project_id ?? "__none__"}
              onValueChange={(v) => {
                const project_id = v === "__none__" ? null : v;
                const project = dataset.projects.find((p) => p.id === project_id);
                updateTask(t.id, {
                  project_id,
                  project_name: project?.name ?? null,
                  source: project_id ? "manual" : "inbox",
                });
              }}
            >
              <SelectTrigger className="h-8 w-[150px] text-[11.5px]">
                <SelectValue placeholder="Assign project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Assign project</SelectItem>
                {dataset.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={t.priority}
              onValueChange={(v) => updateTask(t.id, { priority: (v ?? "medium") as Priority })}
            >
              <SelectTrigger className="h-8 w-[90px] text-[11.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="medium">med</SelectItem>
                <SelectItem value="high">high</SelectItem>
              </SelectContent>
            </Select>

            <button
              className="flex-none rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:border-primary"
              onClick={() => {
                const today = new Date();
                today.setHours(17, 0, 0, 0);
                updateTask(t.id, { due_at: today.toISOString() });
                pushToast("Due hari ini diset.");
              }}
            >
              Hari ini
            </button>

            <button
              className="flex-none text-[12px] text-faint hover:text-destructive"
              onClick={() => softDeleteTask(t.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

"use client";

import { use } from "react";
import { Card } from "@/components/ui/card";
import { useAppState } from "@/lib/app-state";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { dataset } = useAppState();
  const project = dataset.projects.find((p) => p.id === id);
  const tasks = dataset.tasks.filter((t) => t.project_id === id);

  if (!project) {
    return <div className="px-7 py-6 text-muted-foreground">Project tidak ditemukan.</div>;
  }

  return (
    <div className="mx-auto max-w-[1160px] px-7 py-6">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-md" style={{ background: project.color ?? "#8A857A" }} />
        <span className="font-serif text-2xl font-medium">{project.name}</span>
        <span className="text-xs text-muted-foreground">{tasks.length} task</span>
      </div>
      <Card className="mt-5 gap-0 overflow-hidden p-0">
        {tasks.length === 0 && (
          <div className="p-9 text-center font-serif text-[15px] italic text-muted-foreground">
            belum ada task di project ini
          </div>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 border-b border-border px-4 py-3 last:border-b-0">
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
              {t.source === "recurring" ? "↻ " : ""}
              {t.title}
            </span>
            <span className="flex-none text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {t.status}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

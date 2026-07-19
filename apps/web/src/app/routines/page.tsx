"use client";

import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RecurringGlyph } from "@/components/common/icons";
import { useAppState } from "@/lib/app-state";
import { isDueToday } from "@/lib/selectors";
import type { Task } from "@/lib/types";

const WEEKDAY_LABEL = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function scheduleText(r: {
  frequency: string;
  weekdays: number[] | null;
  day_of_month: number | null;
  time_of_day: string | null;
}) {
  const parts: string[] = [];
  if (r.frequency === "daily") parts.push("Harian");
  else if (r.frequency === "weekly")
    parts.push(`Mingguan · ${(r.weekdays ?? []).map((d) => WEEKDAY_LABEL[d]).join(", ")}`);
  else if (r.frequency === "monthly") parts.push(`Bulanan · tanggal ${r.day_of_month ?? "-"}`);
  if (r.time_of_day) parts.push(r.time_of_day);
  return parts.join(" · ");
}

export default function RoutinesPage() {
  const { dataset, toggleRule, setTaskStatus, openTaskDetail, pushToast } = useAppState();

  // Instance rutinitas hari ini (task source=recurring, due hari ini WIB)
  const todayInstances = dataset.tasks
    .filter((t) => t.source === "recurring" && t.status !== "dropped" && isDueToday(t))
    .sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));

  const doneCount = todayInstances.filter((t) => t.status === "done").length;
  const rules = dataset.recurringRules;
  const activeRules = rules.filter((r) => r.is_active).length;

  const projectName = (id: string | null) =>
    id ? (dataset.projects.find((p) => p.id === id)?.name ?? "—") : "Umum";

  const renderInstance = (t: Task) => {
    const isDone = t.status === "done";
    return (
      <div
        key={t.id}
        className={`flex cursor-pointer items-center gap-2.5 border-b border-border px-4 py-3 last:border-b-0 hover:bg-muted/30 ${
          isDone ? "bg-primary/[0.06]" : ""
        }`}
        onClick={() => openTaskDetail(t.id)}
      >
        <button
          className={`flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-[1.5px] text-[11px] ${
            isDone
              ? "border-primary bg-primary text-primary-foreground"
              : "border-faint text-transparent hover:border-primary hover:text-primary"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setTaskStatus(t.id, isDone ? "todo" : "done");
          }}
        >
          <Check className="size-3" />
        </button>
        <span
          className={`min-w-0 flex-1 truncate text-[13.5px] font-medium ${
            isDone ? "text-muted-foreground line-through decoration-primary/60" : ""
          }`}
        >
          <RecurringGlyph className="mr-1" />
          {t.title}
        </span>
        <span className="flex-none text-[10.5px] font-semibold text-muted-foreground">
          {t.project_name ?? projectName(t.project_id)}
        </span>
        {isDone ? (
          <span className="flex w-[52px] flex-none items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Check className="size-3" /> Done
          </span>
        ) : (
          <span className="w-[52px] flex-none text-right text-[10.5px] text-muted-foreground">{t.status}</span>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[860px] px-4 py-6 sm:px-7">
      <div className="font-serif text-2xl font-medium">Rutinitas</div>
      <p className="mb-5 mt-1 max-w-[560px] text-[12.5px] text-muted-foreground">
        Pekerjaan rutin yang berjalan otomatis tiap hari/minggu/bulan. Dipantau juga oleh agen (Hermes)
        lewat API.
      </p>

      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[13px] font-bold">Rutinitas hari ini</span>
          <span className="text-[11.5px] font-semibold text-muted-foreground">
            {doneCount}/{todayInstances.length} selesai
          </span>
        </div>
        {todayInstances.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">
            Tidak ada rutinitas yang jatuh hari ini.
          </div>
        ) : (
          todayInstances.map(renderInstance)
        )}
      </Card>

      <Card className="mt-4 gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[13px] font-bold">Semua rutinitas</span>
          <span className="text-[11.5px] font-semibold text-muted-foreground">
            {activeRules} aktif dari {rules.length}
          </span>
        </div>
        {rules.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">
            Belum ada rutinitas. Tambah lewat Settings → Rutinitas.
          </div>
        ) : (
          rules.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <RecurringGlyph className="size-3.5" />
              <div className="min-w-0 flex-1">
                <div className={`truncate text-[13px] font-semibold ${r.is_active ? "" : "text-muted-foreground"}`}>
                  {r.title_template}
                </div>
                <div className="text-[10.5px] text-muted-foreground">
                  {scheduleText(r)} · {projectName(r.project_id)}
                </div>
              </div>
              <Switch checked={r.is_active} onCheckedChange={() => toggleRule(r.id)} title="Aktif" />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

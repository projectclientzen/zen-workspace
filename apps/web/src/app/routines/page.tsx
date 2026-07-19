"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecurringGlyph } from "@/components/common/icons";
import { useAppState } from "@/lib/app-state";
import { isDueToday } from "@/lib/selectors";
import type { RecurringFrequency, Task } from "@/lib/types";

const NONE = "__none__";
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
  const { dataset, addRule, toggleRule, deleteRule, setTaskStatus, openTaskDetail, pushToast } =
    useAppState();

  // Form tambah rutinitas
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(NONE);
  const [frequency, setFrequency] = useState<RecurringFrequency>("daily");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [time, setTime] = useState("09:00");

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addRule({
      title_template: trimmed,
      project_id: projectId === NONE ? null : projectId,
      frequency,
      weekdays: frequency === "weekly" ? weekdays : null,
      day_of_month: frequency === "monthly" ? Number(dayOfMonth) : null,
      time_of_day: time,
    });
    pushToast("Rutinitas tersimpan ✓");
    setTitle("");
    setWeekdays([]);
  };

  // Instance rutinitas hari ini
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

      {/* Tambah rutinitas */}
      <Card className="gap-3 p-4">
        <div className="text-[13px] font-bold">Tambah rutinitas</div>
        <div className="flex flex-col gap-2.5">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul rutinitas (mis. cek performa kempen)"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select
              value={projectId}
              onValueChange={(v) => setProjectId(v ?? NONE)}
              items={[
                { value: NONE, label: "Tanpa project" },
                ...dataset.projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Tanpa project</SelectItem>
                {dataset.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency((v ?? "daily") as RecurringFrequency)}
              items={[
                { value: "daily", label: "Harian" },
                { value: "weekly", label: "Mingguan" },
                { value: "monthly", label: "Bulanan" },
              ]}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
              </SelectContent>
            </Select>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          {frequency === "weekly" && (
            <div className="flex gap-1.5">
              {WEEKDAY_LABEL.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setWeekdays((prev) =>
                      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx],
                    )
                  }
                  className={`flex-1 rounded-md border py-1.5 text-[11px] font-semibold ${
                    weekdays.includes(idx)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {frequency === "monthly" && (
            <Input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              placeholder="Tanggal (1-31)"
            />
          )}

          <Button onClick={submit}>+ Tambah rutinitas</Button>
        </div>
      </Card>

      {/* Rutinitas hari ini */}
      <Card className="mt-4 gap-0 overflow-hidden p-0">
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

      {/* Semua rutinitas */}
      <Card className="mt-4 gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[13px] font-bold">Semua rutinitas</span>
          <span className="text-[11.5px] font-semibold text-muted-foreground">
            {activeRules} aktif dari {rules.length}
          </span>
        </div>
        {rules.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">
            Belum ada rutinitas. Tambah lewat form di atas.
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
              <button
                onClick={() => toggleRule(r.id)}
                className={`flex-none rounded-md border px-2 py-1 text-[10.5px] font-semibold ${
                  r.is_active
                    ? "border-primary/40 text-primary"
                    : "border-border text-muted-foreground"
                }`}
                title={r.is_active ? "Nonaktifkan" : "Aktifkan"}
              >
                {r.is_active ? "Aktif" : "Nonaktif"}
              </button>
              <button
                className="flex h-8 w-8 flex-none items-center justify-center rounded-md text-faint hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Hapus rutinitas ${r.title_template}`}
                title="Hapus rutinitas"
                onClick={() => {
                  deleteRule(r.id);
                  pushToast("Rutinitas dihapus.");
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

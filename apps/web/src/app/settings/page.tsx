"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/lib/app-state";
import type { RecurringFrequency } from "@/lib/types";

const NONE = "__none__";
const WEEKDAY_LABEL = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function SettingsPage() {
  const { dataset, addRule, toggleRule, pushToast } = useAppState();

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
    pushToast("Aturan recurring tersimpan.");
    setTitle("");
    setWeekdays([]);
  };

  return (
    <div className="mx-auto max-w-[720px] px-7 py-6">
      <div className="font-serif text-2xl font-medium">Settings</div>

      <Card className="mt-5 gap-3 p-4">
        <div className="text-[13px] font-bold">Recurring rules</div>
        <div className="flex flex-col gap-2.5">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title template" />
          <div className="grid grid-cols-3 gap-2">
            <Select value={projectId} onValueChange={(v) => setProjectId(v ?? NONE)}>
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
            <Select value={frequency} onValueChange={(v) => setFrequency((v ?? "daily") as RecurringFrequency)}>
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
                    setWeekdays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]))
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

          <Button onClick={submit}>+ Tambah aturan</Button>
        </div>

        <div className="mt-1 flex flex-col gap-1">
          {dataset.recurringRules.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 border-t border-border py-2.5 first:border-t-0">
              <span className="text-[13px] text-primary">↻</span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold">{r.title_template}</div>
                <div className="text-[10.5px] text-muted-foreground">
                  {r.frequency}
                  {r.frequency === "weekly" && r.weekdays && ` · ${r.weekdays.map((d) => WEEKDAY_LABEL[d]).join(", ")}`}
                  {r.frequency === "monthly" && r.day_of_month && ` · tanggal ${r.day_of_month}`}
                  {r.time_of_day && ` · ${r.time_of_day}`}
                </div>
              </div>
              <Switch checked={r.is_active} onCheckedChange={() => toggleRule(r.id)} />
            </div>
          ))}
          {dataset.recurringRules.length === 0 && (
            <div className="py-4 text-center text-[12px] text-muted-foreground">Belum ada aturan recurring.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

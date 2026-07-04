"use client";

import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
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
import { useAppState } from "@/lib/app-state";
import { computeStreak, getCheckinRows } from "@/lib/selectors";
import type { MetricScheduleType, MetricType } from "@/lib/types";

const NONE = "__none__";

function last14History(dataset: ReturnType<typeof useAppState>["dataset"], metricId: string) {
  const days: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const checkin = dataset.metricCheckins.find((c) => c.metric_id === metricId && c.checkin_date === dateStr);
    const done = !!checkin && (checkin.value_bool === true || checkin.value_number != null);
    days.push({ label: d.toLocaleDateString("id-ID", { day: "numeric" }), value: done ? checkin!.value_number ?? 1 : 0 });
  }
  return days;
}

export default function MetricsPage() {
  const { dataset, addMetric, upsertCheckin, pushToast } = useAppState();
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState(NONE);
  const [type, setType] = useState<MetricType>("boolean");
  const [unit, setUnit] = useState("");
  const [scheduleType, setScheduleType] = useState<MetricScheduleType>("daily");

  const checkinRows = getCheckinRows(dataset, "all");
  const today = new Date().toISOString().slice(0, 10);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addMetric({
      name: trimmed,
      project_id: projectId === NONE ? null : projectId,
      type,
      unit: unit.trim() || null,
      schedule_type: scheduleType,
    });
    pushToast("Metrik tersimpan.");
    setName("");
    setUnit("");
  };

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-6 sm:px-7">
      <div className="font-serif text-2xl font-medium">Metrics</div>
      <p className="mb-4.5 mt-1 text-[12.5px] text-muted-foreground">
        Ukuran ringan: completion percent + streak, tanpa skor menghakimi.
      </p>

      <Card className="mb-5 flex-row flex-wrap items-end gap-2.5 p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama metrik" className="w-[180px]" />
        <Select value={projectId} onValueChange={(v) => setProjectId(v ?? NONE)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Umum (tanpa project)</SelectItem>
            {dataset.projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => setType((v ?? "boolean") as MetricType)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="boolean">Ya/Tidak</SelectItem>
            <SelectItem value="number">Angka</SelectItem>
          </SelectContent>
        </Select>
        {type === "number" && (
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unit (menit, kg…)" className="w-[120px]" />
        )}
        <Select value={scheduleType} onValueChange={(v) => setScheduleType((v ?? "daily") as MetricScheduleType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Harian</SelectItem>
            <SelectItem value="specific_days">Hari tertentu</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={submit}>+ Tambah metrik</Button>
      </Card>

      <div className="flex flex-col gap-3">
        {checkinRows.map(({ metric, due, doneToday }) => {
          const history = last14History(dataset, metric.id);
          const project = dataset.projects.find((p) => p.id === metric.project_id);
          return (
            <Card key={metric.id} className="gap-3 p-4">
              <div className="flex items-center gap-2.5">
                <div>
                  <div className="text-[13.5px] font-bold">{metric.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {project?.name ?? "Umum"} · {computeStreak(dataset, metric.id)} hari beruntun
                  </div>
                </div>
                <div className="ml-auto">
                  {doneToday ? (
                    <span className="text-[13px] font-bold text-primary">✓ Sudah check-in</span>
                  ) : due ? (
                    metric.type === "boolean" ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          upsertCheckin(metric.id, today, true);
                          pushToast("Tersimpan ✓");
                        }}
                      >
                        Ya ✓
                      </Button>
                    ) : (
                      <form
                        className="flex gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = Number((e.currentTarget.elements.namedItem("v") as HTMLInputElement).value);
                          if (!Number.isNaN(val)) {
                            upsertCheckin(metric.id, today, val);
                            pushToast("Tersimpan ✓");
                          }
                        }}
                      >
                        <Input name="v" type="number" className="w-[90px]" placeholder={metric.unit ?? "nilai"} />
                        <Button size="sm" type="submit">
                          Simpan
                        </Button>
                      </form>
                    )
                  ) : (
                    <span className="text-[11px] text-muted-foreground">tidak dijadwalkan hari ini</span>
                  )}
                </div>
              </div>
              <div className="h-[54px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history}>
                    <XAxis dataKey="label" hide />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    />
                    <Bar dataKey="value" radius={[2, 2, 1, 1]} fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })}
        {checkinRows.length === 0 && (
          <div className="p-9 text-center font-serif text-[15px] italic text-muted-foreground">
            belum ada metrik — tambahkan di atas
          </div>
        )}
      </div>
    </div>
  );
}

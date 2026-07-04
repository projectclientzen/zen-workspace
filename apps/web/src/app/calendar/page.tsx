"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useAppState } from "@/lib/app-state";

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function CalendarPage() {
  const { dataset, openTaskDetail, openTaskForm } = useAppState();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0=Min
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startOffset; i += 1) {
      const d = new Date(year, month, 1 - (startOffset - i));
      list.push({ date: d, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      list.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (list.length % 7 !== 0 || list.length < 35) {
      const last = list[list.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      list.push({ date: next, inMonth: next.getMonth() === month });
    }
    return list;
  }, [cursor]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof dataset.tasks>();
    for (const t of dataset.tasks) {
      if (!t.due_at || t.status === "dropped") continue;
      const key = new Date(t.due_at).toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return map;
  }, [dataset]);

  const today = new Date().toISOString().slice(0, 10);
  const selectedTasks = selectedDay ? tasksByDate.get(selectedDay) ?? [] : [];

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-7">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-2xl font-medium capitalize">
          {cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
        </span>
        <div className="ml-auto flex gap-1.5">
          <button
            className="rounded-md border border-border bg-card px-3 py-1.5 text-[13px]"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            ‹
          </button>
          <button
            className="rounded-md border border-border bg-card px-3 py-1.5 text-[13px]"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-4.5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-1.5 grid grid-cols-7 gap-1.5">
            {DAY_NAMES.map((d) => (
              <div key={d} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map(({ date, inMonth }) => {
              const key = date.toISOString().slice(0, 10);
              const dayTasks = tasksByDate.get(key) ?? [];
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={`min-h-[76px] rounded-lg border p-1.5 text-left ${
                    selectedDay === key ? "border-primary" : "border-border"
                  } ${inMonth ? "opacity-100" : "opacity-40"}`}
                >
                  <div className={`font-mono text-[12px] ${key === today ? "font-bold text-primary" : ""}`}>
                    {date.getDate()}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {dayTasks.slice(0, 4).map((t) => (
                      <span
                        key={t.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: dataset.projects.find((p) => p.id === t.project_id)?.color ?? "#8A857A",
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Card className="gap-2 p-4">
          <div className="flex items-center">
            <span className="text-[12.5px] font-bold">
              {selectedDay
                ? new Date(selectedDay).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" })
                : "Pilih tanggal"}
            </span>
            {selectedDay && (
              <button className="ml-auto text-[11px] font-semibold text-primary" onClick={() => openTaskForm()}>
                + Task
              </button>
            )}
          </div>
          {selectedDay && selectedTasks.length === 0 && (
            <div className="py-4 text-center text-[12px] text-muted-foreground">Tidak ada task di tanggal ini.</div>
          )}
          {selectedTasks.map((t) => (
            <div
              key={t.id}
              className="cursor-pointer rounded-md border border-border px-2.5 py-2 hover:border-faint"
              onClick={() => openTaskDetail(t.id)}
            >
              <div className="text-[12.5px] font-medium">
                {t.source === "recurring" ? "↻ " : ""}
                {t.title}
              </div>
              <div className="text-[10.5px] text-muted-foreground">{t.project_name ?? "Inbox"}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

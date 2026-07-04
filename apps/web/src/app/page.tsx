"use client";

import Link from "next/link";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppState } from "@/lib/app-state";
import type { Task } from "@/lib/types";
import {
  getAttentionSummary,
  getCheckinRows,
  getProjectStats,
  getTodayTasks,
  getTop3,
  scopeTasks,
} from "@/lib/selectors";

function rhythm14(tasks: Task[]) {
  const days: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = tasks.filter((t) => t.completed_at && t.completed_at.slice(0, 10) === key).length;
    days.push({ label: d.toLocaleDateString("id-ID", { day: "numeric" }), value: count });
  }
  return days;
}

function fmtDue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(d);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Hari ini · ${time}`;
  if (diffDays === -1) return `Kemarin · ${time}`;
  if (diffDays < -1) return `${Math.abs(diffDays)} hari lalu`;
  if (diffDays === 1) return `Besok · ${time}`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function scopeLabel(scope: string, projects: { id: string; name: string }[]) {
  if (scope === "all") return "Semua project";
  return projects.find((p) => p.id === scope)?.name ?? scope;
}

export default function OverviewPage() {
  const {
    dataset,
    activeProjectId,
    focusMode,
    openTaskDetail,
    openTaskForm,
    toggleFocusToday,
    setTaskStatus,
    upsertCheckin,
    pushToast,
  } = useAppState();

  const scope = focusMode ? activeProjectId : "all";
  const attention = getAttentionSummary(dataset, scope);
  const today = getTodayTasks(dataset, scope);
  const top3 = getTop3(dataset, scope);
  const stats = getProjectStats(dataset).filter(
    (s) => scope === "all" || s.project_id === scope,
  );
  const checkinRows = getCheckinRows(dataset, scope);
  const rhythm = rhythm14(scopeTasks(dataset.tasks, scope));
  const rhythmTotal = rhythm.reduce((sum, d) => sum + d.value, 0);

  const attentionCards = [
    { label: "Overdue", n: attention.overdue, href: "/urgent" },
    { label: "Due hari ini", n: attention.due_today, href: "/urgent" },
    { label: "Recurring hari ini", n: attention.recurring_today, href: "/" },
    { label: "Check-in jatuh tempo", n: attention.checkins_due, href: "/metrics" },
  ];

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-11 pt-0 sm:px-7">
      <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
        {attentionCards.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-3 border-r border-b border-border px-3 py-3 last:border-r-0 sm:border-b-0 sm:px-5 sm:py-3.5"
          >
            <span
              className={`font-serif text-3xl ${
                a.n > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {a.n}
            </span>
            <div className="text-xs font-semibold">{a.label}</div>
          </Link>
        ))}
      </div>

      <div className="pt-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <div className="font-serif text-2xl font-medium sm:text-[27px]">
            {focusMode ? "Fokus satu project." : "Tiga hal hari ini."}
          </div>
          <Button size="sm" className="ml-auto" onClick={() => openTaskForm({ defaultProjectId: focusMode ? activeProjectId : undefined })}>
            + Task Baru
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {top3.map((t) => (
            <Card
              key={t.id}
              className="min-h-[130px] cursor-pointer justify-between gap-3 p-4"
              onClick={() => openTaskDetail(t.id)}
            >
              <span className="text-[11px] font-semibold text-muted-foreground">
                {t.project_name ?? "Inbox"}
              </span>
              <div className="text-[15px] font-semibold leading-snug">{t.title}</div>
              <div className="flex items-center gap-2">
                <span className="text-[11.5px] font-semibold text-destructive">{fmtDue(t.due_at)}</span>
                <button
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-faint text-xs text-transparent hover:border-primary hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTaskStatus(t.id, "done");
                    pushToast("Selesai ✓");
                  }}
                >
                  ✓
                </button>
              </div>
            </Card>
          ))}
          {Array.from({ length: Math.max(0, 3 - top3.length) }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-[130px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-faint p-4 text-center text-[11.5px] text-faint"
            >
              Slot kosong — bintangi task dari daftar
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_314px]">
          <div>
            <div className="mb-2.5 flex items-baseline gap-2.5">
              <div className="text-sm font-bold">Hari Ini</div>
              <div className="text-[11.5px] text-muted-foreground">{today.length} task</div>
            </div>
            <Card className="gap-0 overflow-hidden p-0">
              {today.length === 0 && (
                <div className="p-9 text-center text-muted-foreground">
                  <div className="font-serif text-[17px] italic">Hari ini lapang.</div>
                  <div className="mt-1 text-[12.5px]">Tangkap sesuatu lewat capture cepat.</div>
                </div>
              )}
              {today.map((t) => (
                <div
                  key={t.id}
                  className="flex cursor-pointer items-center gap-2.5 border-b border-border px-4 py-3 last:border-b-0 hover:bg-muted/30"
                  onClick={() => openTaskDetail(t.id)}
                >
                  <span
                    className="h-6 w-[3px] flex-none rounded"
                    style={{
                      background:
                        t.priority === "high"
                          ? "var(--destructive)"
                          : t.priority === "medium"
                            ? "var(--amber)"
                            : "var(--faint)",
                    }}
                  />
                  <button
                    className="flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-[1.5px] border-faint text-[11px] text-transparent hover:border-primary hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTaskStatus(t.id, "done");
                      pushToast("Selesai ✓");
                    }}
                  >
                    ✓
                  </button>
                  <span className="text-[13.5px] font-medium">
                    {t.source === "recurring" ? "↻ " : ""}
                    {t.title}
                  </span>
                  <span className="ml-auto flex-none text-[10.5px] font-semibold text-muted-foreground">
                    {t.project_name ?? "Inbox"}
                  </span>
                  <span
                    className={`w-[76px] flex-none text-right text-[10.5px] font-semibold ${
                      t.is_overdue ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {fmtDue(t.due_at)}
                  </span>
                  <button
                    className={`flex-none text-[14px] ${t.is_focus_today ? "text-amber" : "text-faint"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFocusToday(t.id);
                    }}
                  >
                    ★
                  </button>
                </div>
              ))}
            </Card>

            <div className="mb-2.5 mt-6 text-sm font-bold">Project</div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {stats.map((s) => (
                <Link key={s.project_id} href={`/projects/${s.project_id}`}>
                  <Card className="gap-2 p-3.5 hover:border-faint">
                    <span className="truncate text-[12.5px] font-bold">{s.project_name}</span>
                    <div className="text-[10.5px] text-muted-foreground">
                      {s.open} open
                      {s.overdue > 0 && (
                        <span className="font-bold text-destructive"> · {s.overdue} overdue</span>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <Card className="gap-2 p-4">
              <div className="text-[12.5px] font-bold">Ringkasan</div>
              <div className="text-[11.5px] text-muted-foreground">
                Scope aktif: <Badge variant="secondary">{scopeLabel(scope, dataset.projects)}</Badge>
              </div>
            </Card>

            <Card className="gap-1.5 p-4">
              <div className="flex items-baseline">
                <span className="text-[12.5px] font-bold">Rhythm</span>
                <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">
                  {rhythmTotal} selesai / 14h
                </span>
              </div>
              <div className="h-[56px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rhythm}>
                    <XAxis dataKey="label" hide />
                    <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[2, 2, 1, 1]} fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="gap-1 p-4">
              <div className="mb-1 flex items-baseline">
                <span className="text-[12.5px] font-bold">Check-in hari ini</span>
                <Link href="/metrics" className="ml-auto text-[10.5px] text-muted-foreground underline">
                  lihat semua
                </Link>
              </div>
              {checkinRows.length === 0 && (
                <div className="py-2 text-[11.5px] text-muted-foreground">Belum ada metrik.</div>
              )}
              {checkinRows.map(({ metric, due, doneToday, streak }) => (
                <div
                  key={metric.id}
                  className="flex items-center gap-2 border-b border-border py-2 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">{metric.name}</div>
                    <div className="font-serif text-[11px] italic text-muted-foreground">
                      {streak > 0 ? `${streak} hari beruntun` : "belum mulai"}
                    </div>
                  </div>
                  {doneToday ? (
                    <span className="text-[13px] font-bold text-primary">✓</span>
                  ) : due ? (
                    <button
                      className="rounded-md border border-primary px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10"
                      onClick={() => {
                        upsertCheckin(metric.id, new Date().toISOString().slice(0, 10), true);
                        pushToast("Tersimpan ✓");
                      }}
                    >
                      Ya ✓
                    </button>
                  ) : null}
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

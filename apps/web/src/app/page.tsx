"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Check, Star } from "lucide-react";
import { RecurringGlyph } from "@/components/common/icons";
import { Bar, BarChart, ResponsiveContainer, Tooltip } from "recharts";
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

type Range = "today" | "7" | "30" | "90" | "custom";

function jakartaDayStart(offset = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function fmtDue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = jakartaDayStart(0);
  const dueDay = new Date(d);
  dueDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Hari ini · ${time}`;
  if (diffDays === -1) return `Kemarin · ${time}`;
  if (diffDays < -1) return `${Math.abs(diffDays)}h lalu`;
  if (diffDays === 1) return `Besok · ${time}`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function getRangeDates(range: Range, c1: string, c2: string): { start: Date; end: Date } {
  const today = jakartaDayStart(0);
  if (range === "today") return { start: today, end: jakartaDayStart(1) };
  if (range === "7") return { start: jakartaDayStart(-6), end: jakartaDayStart(1) };
  if (range === "30") return { start: jakartaDayStart(-29), end: jakartaDayStart(1) };
  if (range === "90") return { start: jakartaDayStart(-89), end: jakartaDayStart(1) };
  // custom
  const start = c1 ? new Date(c1) : jakartaDayStart(-29);
  const end = c2 ? new Date(new Date(c2).setDate(new Date(c2).getDate() + 1)) : jakartaDayStart(1);
  return { start, end };
}

function filterByRange(tasks: Task[], start: Date, end: Date): Task[] {
  return tasks.filter((t) => {
    if (!t.completed_at) return false;
    const d = new Date(t.completed_at).getTime();
    return d >= start.getTime() && d < end.getTime();
  });
}

function buildBars(tasks: Task[], start: Date, end: Date, maxBars = 7) {
  const days = Math.min(Math.round((end.getTime() - start.getTime()) / 86400000), maxBars);
  const result: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - (i + 1) * 86400000);
    const key = d.toISOString().slice(0, 10);
    const count = tasks.filter((t) => t.completed_at?.slice(0, 10) === key).length;
    result.push({ label: d.toLocaleDateString("id-ID", { day: "numeric" }), value: count });
  }
  return result;
}

function build14DayBars(tasks: Task[]) {
  const bars: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = jakartaDayStart(-i);
    const key = d.toISOString().slice(0, 10);
    const count = tasks.filter((t) => t.completed_at?.slice(0, 10) === key).length;
    bars.push({ label: d.toLocaleDateString("id-ID", { day: "numeric" }), value: count });
  }
  return bars;
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

  const [scopeVal, setScopeVal] = useState<string>("all");
  const [range, setRange] = useState<Range>("7");
  const [c1, setC1] = useState("");
  const [c2, setC2] = useState("");

  const scope = focusMode ? activeProjectId : scopeVal;
  const { start, end } = getRangeDates(range, c1, c2);

  const attention = getAttentionSummary(dataset, scope);
  const today = getTodayTasks(dataset, scope);
  const top3 = getTop3(dataset, scope);
  const allStats = getProjectStats(dataset);
  const stats = allStats.filter((s) => scope === "all" || s.project_id === scope);
  const checkinRows = getCheckinRows(dataset, scope);

  const scopedTasks = useMemo(() => scopeTasks(dataset.tasks, scope), [dataset.tasks, scope]);
  const rangedDone = useMemo(() => filterByRange(scopedTasks, start, end), [scopedTasks, start, end]);
  const allDoneInRange = rangedDone.length;
  const allInRange = scopedTasks.filter((t) => {
    if (t.status === "dropped") return false;
    if (t.completed_at && new Date(t.completed_at).getTime() < start.getTime()) return false;
    return true;
  }).length;
  const donutPct = allInRange > 0 ? Math.round((allDoneInRange / allInRange) * 100) : 0;

  const prodBars = useMemo(() => buildBars(rangedDone, start, end, 7), [rangedDone, start, end]);
  const chart14 = useMemo(() => build14DayBars(scopedTasks), [scopedTasks]);
  const rhythmTotal = chart14.reduce((s, d) => s + d.value, 0);

  // Insight panel: top project by % done vs worst
  const insightStats = useMemo(() => {
    return allStats
      .map((s) => ({
        ...s,
        pct: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0,
      }))
      .filter((s) => s.total > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [allStats]);
  const strengths = insightStats.slice(0, 1);
  const weaknesses = insightStats.slice(-1).filter((s) => s.pct < 50 && insightStats.length > 1);

  const rangeButtons: { lbl: string; val: Range }[] = [
    { lbl: "Hari ini", val: "today" },
    { lbl: "7h", val: "7" },
    { lbl: "30h", val: "30" },
    { lbl: "90h", val: "90" },
    { lbl: "Custom", val: "custom" },
  ];

  const scopeOptions = [
    { id: "all", name: "Semua project" },
    ...dataset.projects.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name })),
  ];

  const attentionCards = [
    { label: "Overdue", n: attention.overdue, href: "/urgent" },
    { label: "Due hari ini", n: attention.due_today, href: "/urgent" },
    { label: "Recurring hari ini", n: attention.recurring_today, href: "/" },
    { label: "Check-in jatuh tempo", n: attention.checkins_due, href: "/metrics" },
  ];

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-11 pt-0 sm:px-7">
      {/* Attention bar */}
      <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
        {attentionCards.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-3 border-r border-b border-border px-3 py-3 last:border-r-0 sm:border-b-0 sm:px-5 sm:py-3.5"
          >
            <span className={`font-serif text-3xl ${a.n > 0 ? "text-destructive" : "text-foreground"}`}>
              {a.n}
            </span>
            <div className="text-xs font-semibold">{a.label}</div>
          </Link>
        ))}
      </div>

      <div className="pt-6">
        <div className="flex flex-wrap items-baseline gap-3 mb-4">
          <div className="font-serif text-2xl font-medium sm:text-[27px]">
            {focusMode ? "Fokus satu project." : "Tiga hal hari ini."}
          </div>
          <Button size="sm" className="ml-auto" onClick={() => openTaskForm({ defaultProjectId: focusMode ? activeProjectId : undefined })}>
            + Task Baru
          </Button>
        </div>

        {/* Scope + date range filter */}
        {!focusMode && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <select
              value={scopeVal}
              onChange={(e) => setScopeVal(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] font-semibold text-foreground outline-none min-w-[180px]"
            >
              {scopeOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <div className="flex gap-1.5">
              {rangeButtons.map((b) => (
                <button
                  key={b.val}
                  onClick={() => setRange(b.val)}
                  className={`rounded-lg border px-3 py-[7px] text-[11px] font-bold transition-colors ${
                    range === b.val
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {b.lbl}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <>
                <input type="date" value={c1} onChange={(e) => setC1(e.target.value)}
                  className="rounded-lg border border-border bg-card px-2.5 py-[7px] text-[12px] text-foreground outline-none" />
                <input type="date" value={c2} onChange={(e) => setC2(e.target.value)}
                  className="rounded-lg border border-border bg-card px-2.5 py-[7px] text-[12px] text-foreground outline-none" />
              </>
            )}
          </div>
        )}

        {/* Productivity charts row */}
        <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-[1.6fr_1fr]">
          <Card className="gap-2 p-4">
            <div className="flex items-baseline">
              <span className="text-[13px] font-bold">Produktivitas</span>
              <span className="ml-auto font-mono text-[12px] font-semibold text-primary">{allDoneInRange} selesai</span>
            </div>
            <div className="h-[58px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodBars}>
                  <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[3, 3, 1, 1]} fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 flex-none rounded-sm bg-primary" />
              <span className="text-[10.5px] text-muted-foreground">Estimasi jam fokus per hari, dihitung dari task selesai</span>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-4">
            {/* Donut */}
            <div className="relative flex-none" style={{ width: 88, height: 88 }}>
              <svg width={88} height={88} viewBox="0 0 88 88">
                <circle cx={44} cy={44} r={36} fill="none" stroke="var(--border)" strokeWidth={10} />
                <circle
                  cx={44} cy={44} r={36} fill="none"
                  stroke="var(--primary)" strokeWidth={10}
                  strokeDasharray={`${2 * Math.PI * 36 * donutPct / 100} ${2 * Math.PI * 36}`}
                  strokeLinecap="round"
                  transform="rotate(-90 44 44)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-serif text-[19px] font-semibold">
                {donutPct}%
              </div>
            </div>
            <div>
              <div className="text-[13px] font-bold">Task selesai</div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">{allDoneInRange} dari {allInRange}</div>
            </div>
          </Card>
        </div>

        {/* Top 3 */}
        <div className="mt-1 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {top3.map((t, idx) => (
            <Card
              key={t.id}
              className="min-h-[130px] cursor-pointer justify-between gap-3 p-4"
              onClick={() => openTaskDetail(t.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-[25px] text-faint">{idx + 1}</span>
                <span className="text-[11px] font-semibold" style={{ color: dataset.projects.find(p => p.id === t.project_id)?.color ?? "var(--muted-foreground)" }}>
                  {t.project_name ?? "Inbox"}
                </span>
              </div>
              <div className="text-[15px] font-semibold leading-snug">{t.title}</div>
              <div className="flex items-center gap-2">
                <span className={`text-[11.5px] font-semibold ${t.is_overdue ? "text-destructive" : "text-muted-foreground"}`}>
                  {fmtDue(t.due_at)}
                </span>
                <button
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-faint text-xs text-transparent hover:border-primary hover:text-primary"
                  onClick={(e) => { e.stopPropagation(); setTaskStatus(t.id, "done"); pushToast("Selesai ✓"); }}
                >
                  <Check className="size-3.5" />
                </button>
              </div>
            </Card>
          ))}
          {Array.from({ length: Math.max(0, 3 - top3.length) }).map((_, i) => (
            <div key={i} className="flex min-h-[130px] flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-faint p-4 text-center text-faint">
              <span className="font-serif text-[25px]">{top3.length + i + 1}</span>
              <div className="text-[11.5px]">Slot kosong — bintangi task dari daftar</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_314px]">
          <div>
            {/* Today list */}
            <div className="mb-2.5 flex items-baseline gap-2.5">
              <div className="text-sm font-bold">Hari Ini</div>
              <div className="text-[11.5px] text-muted-foreground">{today.length} task</div>
              {today.filter((t) => t.is_overdue).length > 0 && (
                <Link href="/urgent" className="ml-auto rounded-full bg-destructive/10 px-3 py-1 text-[11.5px] font-bold text-destructive">
                  {today.filter((t) => t.is_overdue).length} overdue →
                </Link>
              )}
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
                  className="flex cursor-pointer items-center gap-2.5 border-b border-border px-4 py-3 last:border-b-0 hover:brightness-[.97]"
                  style={{ background: t.is_overdue ? "var(--destructive-soft, rgba(180,85,45,.05))" : undefined }}
                  onClick={() => openTaskDetail(t.id)}
                >
                  <span className="h-6 w-[3px] flex-none rounded" style={{
                    background: t.priority === "high" ? "var(--destructive)" : t.priority === "medium" ? "var(--amber)" : "var(--faint)",
                  }} />
                  <button
                    className="flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border-[1.5px] border-faint text-[11px] text-transparent hover:border-primary hover:text-primary"
                    onClick={(e) => { e.stopPropagation(); setTaskStatus(t.id, "done"); pushToast("Selesai ✓"); }}
                  ><Check className="size-3" /></button>
                  <span className="text-[13.5px] font-medium">{t.source === "recurring" && <RecurringGlyph className="mr-1" />}{t.title}</span>
                  <span className="ml-auto flex-none text-[10.5px] font-semibold text-muted-foreground">{t.project_name ?? "Inbox"}</span>
                  <span className={`w-[76px] flex-none text-right text-[10.5px] font-semibold ${t.is_overdue ? "text-destructive" : "text-muted-foreground"}`}>
                    {fmtDue(t.due_at)}
                  </span>
                  <button
                    className={`flex-none ${t.is_focus_today ? "text-amber" : "text-faint"}`}
                    onClick={(e) => { e.stopPropagation(); toggleFocusToday(t.id); }}
                  ><Star className="size-3.5" fill={t.is_focus_today ? "currentColor" : "none"} /></button>
                </div>
              ))}
            </Card>

            {/* Project cards with % */}
            <div className="mb-2.5 mt-6 text-sm font-bold">Project</div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {stats.map((s) => {
                const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                const proj = dataset.projects.find((p) => p.id === s.project_id);
                const color = proj?.color ?? "var(--primary)";
                return (
                  <Link key={s.project_id} href={`/projects/${s.project_id}`}>
                    <Card className="gap-2 p-3.5 hover:border-faint transition-transform hover:-translate-y-px"
                      style={{ borderTop: `3px solid ${color}` }}>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[12.5px] font-bold">{s.project_name}</span>
                        <span className="ml-auto flex-none font-mono text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                      <div className="h-[3px] overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div className="text-[10.5px] text-muted-foreground">
                        {s.open} open
                        {s.overdue > 0 && <span className="font-bold text-destructive"> · {s.overdue} overdue</span>}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-3.5">
            {/* Rhythm 14d */}
            <Card className="gap-1.5 p-4">
              <div className="flex items-baseline">
                <span className="text-[12.5px] font-bold">Rhythm</span>
                <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{rhythmTotal} / 14h</span>
              </div>
              <div className="h-[56px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart14}>
                    <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[2, 2, 1, 1]} fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between font-mono text-[9.5px] text-faint">
                <span>−14</span><span>hari ini</span>
              </div>
            </Card>

            {/* Insight panel */}
            {insightStats.length > 0 && (
              <Card className="gap-2 p-4">
                <div className="mb-1 text-[12.5px] font-bold">Insight</div>
                {strengths.map((s) => (
                  <div key={s.project_id} className="flex gap-2.5 rounded-lg p-2.5" style={{ background: "var(--acc-soft, rgba(47,74,62,.08))" }}>
                    <span className="mt-0.5 flex-none text-[10px] font-black text-primary">▲</span>
                    <div>
                      <div className="text-[11.5px] font-bold text-primary">{s.project_name}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {s.pct}% task selesai · {s.done} dari {s.total}
                      </div>
                    </div>
                  </div>
                ))}
                {weaknesses.map((s) => (
                  <div key={s.project_id} className="flex gap-2.5 rounded-lg p-2.5" style={{ background: "var(--dgr-soft, rgba(180,85,45,.08))" }}>
                    <span className="mt-0.5 flex-none text-[10px] font-black text-destructive">▼</span>
                    <div>
                      <div className="text-[11.5px] font-bold text-destructive">{s.project_name}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {s.pct}% selesai — perlu perhatian
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {/* Check-in hari ini */}
            <Card className="gap-1 p-4">
              <div className="mb-1 flex items-baseline">
                <span className="text-[12.5px] font-bold">Check-in hari ini</span>
                <Link href="/metrics" className="ml-auto text-[10.5px] text-muted-foreground underline">lihat semua</Link>
              </div>
              {checkinRows.length === 0 && (
                <div className="py-2 text-[11.5px] text-muted-foreground">Belum ada metrik.</div>
              )}
              {checkinRows.map(({ metric, due, doneToday, streak }) => (
                <div key={metric.id} className="flex items-center gap-2 border-b border-border py-2 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">{metric.name}</div>
                    <div className="font-serif text-[11px] italic text-muted-foreground">
                      {streak > 0 ? `${streak} hari beruntun` : "belum mulai"}
                    </div>
                  </div>
                  {doneToday ? (
                    <span className="text-primary"><Check className="size-4" /></span>
                  ) : due ? (
                    <button
                      className="rounded-md border border-primary px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/10"
                      onClick={() => { upsertCheckin(metric.id, new Date().toISOString().slice(0, 10), true); pushToast("Tersimpan ✓"); }}
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

"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAppState } from "@/lib/app-state";
import {
  getAttentionSummary,
  getProjectStats,
  getTodayTasks,
  getTop3,
} from "@/lib/selectors";

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
  const { dataset, activeProjectId, focusMode } = useAppState();

  const scope = focusMode ? activeProjectId : "all";
  const attention = getAttentionSummary(dataset, scope);
  const today = getTodayTasks(dataset, scope);
  const top3 = getTop3(dataset, scope);
  const stats = getProjectStats(dataset).filter(
    (s) => scope === "all" || s.project_id === scope,
  );

  const attentionCards = [
    { label: "Overdue", n: attention.overdue, href: "/urgent" },
    { label: "Due hari ini", n: attention.due_today, href: "/urgent" },
    { label: "Recurring hari ini", n: attention.recurring_today, href: "/" },
    { label: "Check-in jatuh tempo", n: attention.checkins_due, href: "/metrics" },
  ];

  return (
    <div className="mx-auto max-w-[1160px] px-7 pb-11 pt-0">
      <div className="grid grid-cols-4 border-b border-border">
        {attentionCards.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-3 border-r border-border px-5 py-3.5 hover:bg-muted/40"
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
        <div className="font-serif text-[27px] font-medium">
          {focusMode ? "Fokus satu project." : "Tiga hal hari ini."}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3.5">
          {top3.map((t) => (
            <Card key={t.id} className="min-h-[130px] justify-between gap-3 p-4">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {t.project_name ?? "Inbox"}
              </span>
              <div className="text-[15px] font-semibold leading-snug">{t.title}</div>
              <div className="text-[11.5px] font-semibold text-destructive">{fmtDue(t.due_at)}</div>
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

        <div className="mt-6 grid grid-cols-[1fr_314px] gap-5">
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
                  className="flex items-center gap-2.5 border-b border-border px-4 py-3 last:border-b-0"
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
                </div>
              ))}
            </Card>

            <div className="mb-2.5 mt-6 text-sm font-bold">Project</div>
            <div className="grid grid-cols-3 gap-2.5">
              {stats.map((s) => (
                <Card key={s.project_id} className="gap-2 p-3.5">
                  <span className="truncate text-[12.5px] font-bold">{s.project_name}</span>
                  <div className="text-[10.5px] text-muted-foreground">
                    {s.open} open
                    {s.overdue > 0 && (
                      <span className="font-bold text-destructive"> · {s.overdue} overdue</span>
                    )}
                  </div>
                </Card>
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
          </div>
        </div>
      </div>
    </div>
  );
}

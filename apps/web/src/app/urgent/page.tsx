"use client";

import { Card } from "@/components/ui/card";
import { useAppState } from "@/lib/app-state";
import { getUrgentGroups } from "@/lib/selectors";

const GROUP_LABEL: Record<string, string> = {
  overdue: "Lewat due",
  high_today: "High priority hari ini",
};

export default function UrgentPage() {
  const { dataset, activeProjectId, focusMode } = useAppState();
  const scope = focusMode ? activeProjectId : "all";
  const groups = getUrgentGroups(dataset, scope);
  const total = groups.reduce((sum, g) => sum + g.tasks.length, 0);

  return (
    <div className="mx-auto max-w-[860px] px-7 py-6">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-2xl font-medium">⚠ Urgent</span>
        <span className="font-serif text-xl font-medium text-destructive">{total}</span>
      </div>
      <p className="mb-4.5 mt-1 max-w-[540px] text-[12.5px] text-muted-foreground">
        Yang benar-benar mendesak — kerjakan dari atas, satu per satu.
      </p>

      {total === 0 && (
        <Card className="items-center p-9 text-center text-muted-foreground">
          <div className="font-serif text-lg italic text-primary">Tidak ada yang mendesak.</div>
          <div className="mt-1 text-[12.5px]">Semua terkendali.</div>
        </Card>
      )}

      {groups
        .filter((g) => g.tasks.length > 0)
        .map((g) => (
          <div key={g.kind} className="mb-5.5">
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-destructive">
                {GROUP_LABEL[g.kind]}
              </span>
              <span className="font-mono text-[10.5px] text-muted-foreground">{g.tasks.length}</span>
            </div>
            <Card className="gap-0 overflow-hidden p-0">
              {g.tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">
                      {t.source === "recurring" ? "↻ " : ""}
                      {t.title}
                    </div>
                    <div className="mt-0.5 text-[10.5px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
                      {t.project_name ?? "Inbox"}
                    </div>
                  </div>
                  <span className="flex-none text-[10.5px] font-bold text-destructive">
                    {t.due_at
                      ? new Date(t.due_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                      : ""}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        ))}
    </div>
  );
}

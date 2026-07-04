"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/app-state";

const ALL = "__all__";

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // 0 = Senin
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmt(d: Date) {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function WeeklyReviewPage() {
  const { dataset, saveWeeklyReview } = useAppState();
  const [weekOffset, setWeekOffset] = useState(0);
  const [scope, setScope] = useState<typeof ALL | string>(ALL);
  const [doneSummary, setDoneSummary] = useState("");
  const [missedSummary, setMissedSummary] = useState("");
  const [carryOver, setCarryOver] = useState("");
  const [nextFocus, setNextFocus] = useState("");

  const periodStart = useMemo(() => {
    const base = mondayOf(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);
  const periodEnd = useMemo(() => {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [periodStart]);

  const projectId = scope === ALL ? null : scope;
  const tasksInScope = dataset.tasks.filter((t) => scope === ALL || t.project_id === scope);
  const doneCount = tasksInScope.filter((t) => {
    if (t.status !== "done" || !t.completed_at) return false;
    const c = new Date(t.completed_at);
    return c >= periodStart && c <= periodEnd;
  }).length;
  const missedCount = tasksInScope.filter((t) => {
    if (!t.due_at || t.status === "done" || t.status === "dropped") return false;
    const due = new Date(t.due_at);
    return due >= periodStart && due <= periodEnd && t.is_overdue;
  }).length;

  const existing = dataset.weeklyReviews.find(
    (w) =>
      w.project_id === projectId &&
      w.period_start === periodStart.toISOString().slice(0, 10) &&
      w.period_end === periodEnd.toISOString().slice(0, 10),
  );

  const load = () => {
    setDoneSummary(existing?.done_summary ?? "");
    setMissedSummary(existing?.missed_summary ?? "");
    setCarryOver(existing?.carry_over ?? "");
    setNextFocus(existing?.next_focus ?? "");
  };

  const save = () => {
    saveWeeklyReview(projectId, periodStart.toISOString().slice(0, 10), periodEnd.toISOString().slice(0, 10), {
      done_summary: doneSummary || null,
      missed_summary: missedSummary || null,
      carry_over: carryOver || null,
      next_focus: nextFocus || null,
    });
  };

  return (
    <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-7">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-2xl font-medium">Weekly Review</span>
        <span className="text-[12px] text-muted-foreground">
          {fmt(periodStart)} – {fmt(periodEnd)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
          ‹ Minggu lalu
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
          Minggu ini
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
          Minggu depan ›
        </Button>
        <Select value={scope} onValueChange={(v) => setScope(v ?? ALL)}>
          <SelectTrigger className="ml-auto w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Gabungan semua project</SelectItem>
            {dataset.projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="gap-1 p-4">
          <div className="font-serif text-2xl font-medium text-primary">{doneCount}</div>
          <div className="text-[11.5px] text-muted-foreground">task selesai</div>
        </Card>
        <Card className="gap-1 p-4">
          <div className="font-serif text-2xl font-medium text-destructive">{missedCount}</div>
          <div className="text-[11.5px] text-muted-foreground">meleset (overdue)</div>
        </Card>
      </div>

      <Card className="mt-4 gap-3 p-4">
        <Button variant="outline" size="sm" className="w-fit" onClick={load}>
          Muat catatan tersimpan
        </Button>
        <div className="flex flex-col gap-1">
          <label className="text-[11.5px] font-semibold text-muted-foreground">Apa yang selesai</label>
          <Textarea rows={3} value={doneSummary} onChange={(e) => setDoneSummary(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11.5px] font-semibold text-muted-foreground">Apa yang meleset</label>
          <Textarea rows={3} value={missedSummary} onChange={(e) => setMissedSummary(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11.5px] font-semibold text-muted-foreground">Carry over ke minggu depan</label>
          <Textarea rows={2} value={carryOver} onChange={(e) => setCarryOver(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11.5px] font-semibold text-muted-foreground">Fokus minggu depan</label>
          <Textarea rows={2} value={nextFocus} onChange={(e) => setNextFocus(e.target.value)} />
        </div>
        <Button onClick={save}>Simpan review</Button>
        {existing && (
          <div className="text-[11px] text-muted-foreground">
            Ada catatan tersimpan — klik &quot;Muat catatan tersimpan&quot; untuk buka.
          </div>
        )}
      </Card>
    </div>
  );
}

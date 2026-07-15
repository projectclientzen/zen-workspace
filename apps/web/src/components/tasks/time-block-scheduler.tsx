"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/app-state";

function fmtRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const t1 = start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const t2 = end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${t1}–${t2}`;
}

export function TimeBlockScheduler({ taskId }: { taskId: string }) {
  const { dataset, addTimeBlock, deleteTimeBlock } = useAppState();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);

  const blocks = dataset.timeBlocks.filter((b) => b.task_id === taskId);

  const submit = () => {
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + duration * 60_000);
    addTimeBlock(taskId, start.toISOString(), end.toISOString());
  };

  return (
    <div className="rounded-lg border border-border p-3.5">
      <div className="mb-2 text-[12px] font-bold">Jadwalkan blok waktu</div>
      <div className="flex flex-wrap gap-1.5">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 flex-1 text-[12px]" />
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 w-[100px] text-[12px]" />
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
        >
          <option value={25}>25 menit</option>
          <option value={30}>30 menit</option>
          <option value={60}>1 jam</option>
          <option value={90}>1.5 jam</option>
          <option value={120}>2 jam</option>
        </select>
        <Button size="sm" onClick={submit}>
          + Jadwalkan
        </Button>
      </div>

      {blocks.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
              <span className="text-[11.5px] font-medium">{fmtRange(b.start_at, b.end_at)}</span>
              <button
                className="ml-auto text-[11px] text-faint hover:text-destructive"
                onClick={() => deleteTimeBlock(b.id)}
                aria-label="Hapus blok"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

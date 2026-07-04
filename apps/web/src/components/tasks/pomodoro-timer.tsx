"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import type { PomodoroKind } from "@/lib/types";

const DURATIONS: Record<PomodoroKind, number[]> = {
  focus: [25, 50],
  break: [5, 15],
};

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function PomodoroTimer({ taskId }: { taskId: string }) {
  const { logPomodoroSession, pushToast } = useAppState();
  const [kind, setKind] = useState<PomodoroKind>("focus");
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  // Selesai natural saat hitung mundur mencapai 0 — dicatat sebagai sesi completed.
  // (setState di sini memang disengaja: ini reaksi terhadap detik mencapai nol,
  // bukan sinkronisasi state biasa — mentransisikan mode fokus<->istirahat.)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (secondsLeft !== 0 || !running) return;
    setRunning(false);
    const startedAt = startedAtRef.current ?? new Date().toISOString();
    logPomodoroSession({
      taskId,
      kind,
      plannedMinutes: minutes,
      startedAt,
      endedAt: new Date().toISOString(),
      completed: true,
    });
    pushToast(kind === "focus" ? "Sesi fokus selesai — saatnya istirahat." : "Istirahat selesai — lanjut fokus?");
    const nextKind: PomodoroKind = kind === "focus" ? "break" : "focus";
    const nextMinutes = DURATIONS[nextKind][0];
    setKind(nextKind);
    setMinutes(nextMinutes);
    setSecondsLeft(nextMinutes * 60);
    startedAtRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggle = () => {
    if (!running) {
      startedAtRef.current = startedAtRef.current ?? new Date().toISOString();
    }
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    startedAtRef.current = null;
    setSecondsLeft(minutes * 60);
  };

  const pickDuration = (m: number) => {
    setRunning(false);
    startedAtRef.current = null;
    setMinutes(m);
    setSecondsLeft(m * 60);
  };

  const switchKind = (k: PomodoroKind) => {
    setRunning(false);
    startedAtRef.current = null;
    setKind(k);
    const m = DURATIONS[k][0];
    setMinutes(m);
    setSecondsLeft(m * 60);
  };

  return (
    <div className="rounded-lg border border-border p-3.5">
      <div className="flex items-center gap-1.5">
        {(["focus", "break"] as PomodoroKind[]).map((k) => (
          <button
            key={k}
            onClick={() => switchKind(k)}
            className={`rounded-md px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${
              kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {k === "focus" ? "Fokus" : "Istirahat"}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          {DURATIONS[kind].map((m) => (
            <button
              key={m}
              onClick={() => pickDuration(m)}
              className={`rounded-md border px-2 py-0.5 text-[10.5px] font-semibold ${
                minutes === m ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className="my-3 text-center font-mono text-4xl font-semibold tabular-nums">{fmt(secondsLeft)}</div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={toggle}>
          {running ? "Jeda" : "Mulai"}
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}

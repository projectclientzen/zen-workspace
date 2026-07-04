"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/lib/app-state";

export function Topbar() {
  const {
    dataset,
    addTask,
    pushToast,
    dismissReminder,
    focusMode,
    toggleFocusMode,
    scenario,
    setScenario,
  } = useAppState();
  const [capture, setCapture] = useState("");
  const router = useRouter();

  const submitCapture = () => {
    const title = capture.trim();
    if (!title) return;
    addTask({ title, source: "inbox" });
    pushToast("Masuk Inbox ✓");
    setCapture("");
  };

  const pending = dataset.reminders.filter((r) => r.status === "pending");

  return (
    <div className="flex items-center gap-2.5 border-b border-border bg-card px-6 py-3">
      <Input
        value={capture}
        onChange={(e) => setCapture(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submitCapture();
        }}
        placeholder="Tangkap cepat → Inbox…"
        className="max-w-[420px] flex-1 bg-background"
      />
      <div className="ml-auto flex items-center gap-2">
        <Select value={scenario} onValueChange={(v) => setScenario(v as typeof scenario)}>
          <SelectTrigger className="h-8 w-[140px] text-xs" title="Skenario data (dev only)">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Skenario: Normal</SelectItem>
            <SelectItem value="overdue">Skenario: Overdue</SelectItem>
            <SelectItem value="empty">Skenario: Kosong</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-sm hover:bg-muted/40"
          >
            🔔
            {pending.length > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center rounded-full px-1 text-[9px]">
                {pending.length}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px] p-2">
            <div className="px-2 py-1 text-[12px] font-bold">Reminder</div>
            {pending.length === 0 && (
              <div className="px-2 py-3 text-[11.5px] text-muted-foreground">Tidak ada reminder pending.</div>
            )}
            {pending.map((r) => (
              <div key={r.id} className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/50">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-destructive" />
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (r.target_type === "digest") router.push("/urgent");
                  }}
                >
                  <div className="text-[12px] font-semibold leading-snug">{r.title}</div>
                  <div className="text-[10.5px] text-muted-foreground">{r.sub}</div>
                </button>
                <button
                  className="flex-none text-[10.5px] text-muted-foreground underline"
                  onClick={() => dismissReminder(r.id)}
                >
                  selesai
                </button>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={focusMode ? "default" : "outline"}
          size="sm"
          onClick={toggleFocusMode}
          className="gap-1.5"
        >
          ◎ {focusMode ? "Focus Mode: ON" : "Focus Mode"}
        </Button>
      </div>
    </div>
  );
}

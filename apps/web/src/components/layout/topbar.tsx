"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  const { addTask, pushToast, focusMode, toggleFocusMode, scenario, setScenario } = useAppState();
  const [capture, setCapture] = useState("");

  const submitCapture = () => {
    const title = capture.trim();
    if (!title) return;
    addTask({ title, source: "inbox" });
    pushToast("Masuk Inbox ✓");
    setCapture("");
  };

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

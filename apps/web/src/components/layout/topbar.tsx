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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar";
import { useAppState } from "@/lib/app-state";

export function Topbar() {
  const { dataset, addTask, pushToast, dismissReminder, focusMode, toggleFocusMode } = useAppState();
  const [capture, setCapture] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();

  const submitCapture = () => {
    const title = capture.trim();
    if (!title) return;
    addTask({ title, source: "inbox" });
    pushToast("Masuk Inbox ✓");
    setCapture("");
  };

  // get_pending_reminders() sudah memfilter status=pending & remind_at<=now di server.
  const pending = dataset.reminders;

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5 sm:gap-2.5 sm:px-6 sm:py-3">
      <button
        className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-border text-sm md:hidden"
        onClick={() => setNavOpen(true)}
        aria-label="Buka menu"
      >
        ☰
      </button>
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[240px] p-0 sm:max-w-[240px]">
          <SidebarNav onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <Input
        value={capture}
        onChange={(e) => setCapture(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submitCapture();
        }}
        placeholder="Tangkap cepat…"
        className="min-w-0 flex-1 bg-background sm:max-w-[420px]"
      />
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
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
                    if (r.target_type === "digest") router.push("/");
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
          ◎ <span className="hidden sm:inline">{focusMode ? "Focus Mode: ON" : "Focus Mode"}</span>
        </Button>
      </div>
    </div>
  );
}

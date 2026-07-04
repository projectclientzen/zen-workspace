"use client";

import { useAppState } from "@/lib/app-state";

export function ToastViewport() {
  const { toasts } = useAppState();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-xl bg-foreground px-4 py-2.5 text-[12.5px] font-semibold text-background shadow-lg"
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

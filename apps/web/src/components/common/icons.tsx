import { Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Penanda instance recurring — pengganti glyph teks "↻" agar konsisten lintas platform. */
export function RecurringGlyph({ className }: { className?: string }) {
  return (
    <Repeat2
      aria-label="Recurring"
      className={cn("inline size-3 shrink-0 align-[-1px] text-primary", className)}
    />
  );
}

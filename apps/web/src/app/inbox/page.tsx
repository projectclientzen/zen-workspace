"use client";

import { Card } from "@/components/ui/card";
import { useAppState } from "@/lib/app-state";
import { getInboxTasks } from "@/lib/selectors";

export default function InboxPage() {
  const { dataset } = useAppState();
  const items = getInboxTasks(dataset);

  return (
    <div className="mx-auto max-w-[840px] px-7 py-6">
      <div className="font-serif text-2xl font-medium">Inbox</div>
      <div className="mb-4.5 mt-1 text-[12.5px] text-muted-foreground">
        {items.length} item belum ditriase
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        {items.length === 0 && (
          <div className="p-9 text-center text-muted-foreground">
            <div className="font-serif text-[17px] italic">Inbox kosong.</div>
            <div className="mt-1 text-[12.5px]">Tangkap sesuatu lewat capture cepat di top bar.</div>
          </div>
        )}
        {items.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 border-b border-border px-4 py-3 last:border-b-0">
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{t.title}</span>
          </div>
        ))}
      </Card>
      <p className="mt-3 text-[11.5px] text-muted-foreground">
        Triase (assign project/due/priority) menyusul di Sprint D — lihat PAGE-D2.
      </p>
    </div>
  );
}
